import { useEffect, useRef, useState } from 'react';
import { useCharacterStore } from '../../../stores/characterStore';
import { useSettingsStore, type Edition } from '../../../stores/settingsStore';
import type { Character, AbilityScores } from '../../../domain/character/types';
import type { RefId } from '../../../domain/reference/types';
import { getClassData, isAsiLevel, subclassLevel, type AbilityKey } from '../../../domain/rules/classData';
import { matchesEdition } from '../../../domain/rules/edition';
import { parseFeatAbility } from '../../../domain/rules/featAbility';
import {
  parseFeatProficiencies, featProfChoicesComplete, resolveFeatProficiencies,
  EMPTY_FEAT_PROF_SELECTION, type FeatProfSelection,
} from '../../../domain/rules/featRewards';
import { FeatProficiencyPicker } from '../FeatProficiencyPicker';
import { hpBonusPerLevel } from '../../../domain/rules/hpBonus';
import { isAsiFeatEligible } from '../../../domain/rules/featCategory';
import { abilityMod, totalLevel } from '../../../domain/rules';

interface RawSubclass { name: string; source: string; reprintedAs?: unknown }

interface FeatEntry {
  name: string;
  source: string;
  prerequisite?: unknown[];
  ability?: unknown;
  skillProficiencies?: unknown;
  toolProficiencies?: unknown;
  languageProficiencies?: unknown;
  expertise?: unknown;
  skillToolLanguageProficiencies?: unknown;
  category?: string;
  reprintedAs?: unknown;
}

function featPrereqLabel(prerequisite: unknown[] | undefined): string | null {
  if (!prerequisite || prerequisite.length === 0) return null;
  const parts: string[] = [];
  for (const p of prerequisite as Record<string, unknown>[]) {
    if (p.level != null) parts.push(`Level ${(p.level as { level?: number }).level ?? p.level}`);
    if (p.ability) parts.push('Ability score requirement');
    if (p.spellcasting) parts.push('Spellcasting');
    if (p.other) parts.push(String(p.other));
  }
  return parts.length > 0 ? parts.join(', ') : null;
}

async function fetchSubclasses(className: string, edition: Edition): Promise<RefId[]> {
  const file = `${import.meta.env.BASE_URL}data/class/class-${className.toLowerCase()}.json`;
  try {
    const res = await fetch(file);
    if (!res.ok) return [];
    const json = await res.json() as { subclass?: RawSubclass[] };
    // The raw data lists every subclass more than once: a "reprintedAs" stub pointing at its
    // 2024 successor (skip), plus separate PHB and XPHB entries sharing the exact same display
    // name — filter to the active edition like Race/Background already do, then dedupe.
    const seen = new Set<string>();
    const result: RefId[] = [];
    for (const s of json.subclass ?? []) {
      if (s.reprintedAs) continue;
      if (!matchesEdition(s.source, null, edition)) continue;
      const key = `${s.name}|${s.source}`.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      result.push({ name: s.name, source: s.source });
    }
    return result;
  } catch { return []; }
}

const ABILITY_KEYS: (keyof AbilityScores)[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const ABILITY_LABEL: Record<keyof AbilityScores, string> = {
  str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA',
};

interface LevelUpSheetProps {
  character: Character;
  onClose: () => void;
}

export function LevelUpSheet({ character, onClose }: LevelUpSheetProps) {
  const { levelUp, addFeat } = useCharacterStore();
  const { edition } = useSettingsStore();
  const level = totalLevel(character.classes);

  const [classIndex, setClassIndex] = useState(0);
  const [hpChoice, setHpChoice] = useState<'average' | 'roll'>('average');
  const [rolledHp, setRolledHp] = useState('');
  const [asiMode, setAsiMode] = useState<'+2' | '+1+1' | 'feat'>('+2');
  const [boostOne, setBoostOne] = useState<keyof AbilityScores | null>(null);
  const [boostA, setBoostA] = useState<keyof AbilityScores | null>(null);
  const [boostB, setBoostB] = useState<keyof AbilityScores | null>(null);
  const [availableSubclasses, setAvailableSubclasses] = useState<RefId[]>([]);
  const [chosenSubclass, setChosenSubclass] = useState<RefId | null>(null);
  const [allFeats, setAllFeats] = useState<FeatEntry[]>([]);
  const [chosenFeat, setChosenFeat] = useState<FeatEntry | null>(null);
  const [featAbilityPick, setFeatAbilityPick] = useState<AbilityKey | null>(null);
  const [featProfSel, setFeatProfSel] = useState<FeatProfSelection>(EMPTY_FEAT_PROF_SELECTION);
  const [featQuery, setFeatQuery] = useState('');
  const [featResults, setFeatResults] = useState<FeatEntry[]>([]);
  const featTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedClass = character.classes[classIndex];
  const classData = getClassData(selectedClass.classRef.name);
  const newLevel = selectedClass.level + 1;
  const hasAsi = isAsiLevel(selectedClass.classRef.name, newLevel);
  const subclassAt = subclassLevel(selectedClass.classRef.name, character.edition);
  // >= not ===: a character created at (or leveled past) the subclass level without
  // picking one must still get the prompt on their next level-up, not be stuck forever.
  const picksSubclass = newLevel >= subclassAt && !selectedClass.subclass;

  // Fetch subclasses when the picker is needed
  useEffect(() => {
    if (!picksSubclass) return;
    setChosenSubclass(null);
    fetchSubclasses(selectedClass.classRef.name, edition).then(setAvailableSubclasses);
  }, [picksSubclass, selectedClass.classRef.name, edition]);

  // Fetch feats.json lazily — only once the player actually picks "take a feat" instead of an ASI.
  useEffect(() => {
    if (asiMode !== 'feat' || allFeats.length > 0) return;
    fetch(`${import.meta.env.BASE_URL}data/feats.json`)
      .then(r => r.json())
      .then((json: { feat: FeatEntry[] }) => setAllFeats(json.feat));
  }, [asiMode, allFeats.length]);

  // Debounced feat search — excludes feats already taken and the 2024 rules' own
  // "Ability Score Improvement" feat (redundant with the +2/+1+1 option right above it).
  useEffect(() => {
    if (featTimer.current) clearTimeout(featTimer.current);
    if (!featQuery.trim()) { setFeatResults([]); return; }
    featTimer.current = setTimeout(() => {
      const q = featQuery.toLowerCase();
      const knownKeys = new Set(character.feats.map(f => `${f.name}|${f.source}`.toLowerCase()));
      setFeatResults(
        allFeats
          .filter(f =>
            f.name.toLowerCase().includes(q) &&
            f.name.toLowerCase() !== 'ability score improvement' &&
            !knownKeys.has(`${f.name}|${f.source}`.toLowerCase()) &&
            // Show feats of the character's edition, and in 2024 only General feats (level-gated).
            matchesEdition(f.source, f.reprintedAs, character.edition) &&
            isAsiFeatEligible(f, level + 1, character.edition),
          )
          .slice(0, 10),
      );
    }, 150);
    return () => { if (featTimer.current) clearTimeout(featTimer.current); };
  }, [featQuery, allFeats, character.feats, character.edition, level]);

  if (level >= 20) {
    return (
      <>
        <div className="fixed inset-0 z-40 bg-black/60" onClick={onClose} />
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--color-card)] rounded-t-2xl p-5 space-y-4">
          <h2 className="font-semibold text-base">Level Up</h2>
          <p className="text-[var(--color-muted)] text-sm">Already at level 20 — max level reached.</p>
          <button onClick={onClose} className="w-full py-2.5 text-sm bg-[var(--color-raised)] rounded-xl">Close</button>
        </div>
      </>
    );
  }

  // Hill Dwarf / Draconic Bloodline: +1 HP max per level applies to each level gained too.
  const perLevelBonus = hpBonusPerLevel(character);
  const conMod = abilityMod(character.abilityScores.con);
  const averageHp = Math.floor((classData?.hitDie ?? 8) / 2) + 1 + conMod + perLevelBonus;
  const hpGain = hpChoice === 'average'
    ? averageHp
    : Math.max(1, (parseInt(rolledHp, 10) || 0) + conMod + perLevelBonus);

  const buildBoosts = (): Partial<AbilityScores> | undefined => {
    if (!hasAsi) return undefined;
    if (asiMode === '+2' && boostOne) return { [boostOne]: 2 };
    if (asiMode === '+1+1' && boostA && boostB && boostA !== boostB) {
      return { [boostA]: 1, [boostB]: 1 };
    }
    return undefined;
  };

  const boosts = buildBoosts();
  // A half-feat's choice part (e.g. Resilient's pick-an-ability) must be resolved
  // before confirming; fixed-only half-feats and plain feats need nothing extra.
  const chosenFeatGrant = chosenFeat ? parseFeatAbility(chosenFeat.ability) : null;
  const featProf = chosenFeat ? parseFeatProficiencies(chosenFeat) : null;
  const featProfComplete = !featProf || featProfChoicesComplete(featProf, featProfSel);
  const featComplete = chosenFeat !== null
    && (!chosenFeatGrant?.choice || featAbilityPick !== null)
    && featProfComplete;
  const asiComplete = !hasAsi || (asiMode === 'feat' ? featComplete : boosts !== undefined);
  const hpComplete = hpChoice === 'average' || (parseInt(rolledHp, 10) > 0);
  const subclassComplete = !picksSubclass || chosenSubclass !== null;
  const canConfirm = hpComplete && asiComplete && subclassComplete;

  const confirm = async () => {
    await levelUp(character.id, {
      classIndex,
      hpGain,
      abilityBoosts: asiMode === 'feat' ? undefined : boosts,
      subclass: chosenSubclass ?? undefined,
    });
    if (asiMode === 'feat' && chosenFeat) {
      const featBoosts: Partial<AbilityScores> = { ...(chosenFeatGrant?.fixed ?? {}) };
      if (chosenFeatGrant?.choice && featAbilityPick) {
        featBoosts[featAbilityPick] = (featBoosts[featAbilityPick] ?? 0) + chosenFeatGrant.choice.amount;
      }
      const profGrants = featProf ? resolveFeatProficiencies(featProf, featProfSel) : undefined;
      await addFeat(character.id, { name: chosenFeat.name, source: chosenFeat.source }, featBoosts, profGrants);
    }
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--color-card)] rounded-t-2xl p-5 space-y-5 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-base">Level Up</h2>
          <button onClick={onClose} className="text-[var(--color-muted)] hover:text-[var(--color-text)] text-sm">✕</button>
        </div>

        {/* Class selector (for multiclass) */}
        {character.classes.length > 1 && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wide">Level which class?</p>
            <div className="space-y-1">
              {character.classes.map((cl, i) => (
                <button
                  key={i}
                  onClick={() => setClassIndex(i)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-left transition-colors ${
                    classIndex === i ? 'bg-amber-500/20 border border-amber-500/40' : 'bg-[var(--color-raised)] hover:bg-[var(--color-card-inner)]'
                  }`}
                >
                  <span className="text-sm font-medium">{cl.classRef.name}</span>
                  <span className="text-xs text-[var(--color-faint)]">{cl.level} → {cl.level + 1}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Level summary */}
        <div className="bg-[var(--color-raised)]/50 rounded-xl px-4 py-3 flex items-center justify-between">
          <div>
            <p className="font-semibold">{selectedClass.classRef.name} {selectedClass.level} → {newLevel}</p>
            <p className="text-xs text-[var(--color-muted)] mt-0.5">
              d{classData?.hitDie ?? 8} hit die
              {hasAsi && ' · Ability Score Improvement'}
              {picksSubclass && ' · Subclass choice'}
            </p>
          </div>
          <span className="text-2xl font-bold text-amber-400">↑{newLevel}</span>
        </div>

        {/* HP gain */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wide">HP Gain</p>
          <div className="flex gap-2">
            <button
              onClick={() => setHpChoice('average')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                hpChoice === 'average' ? 'bg-amber-500 text-slate-900' : 'bg-[var(--color-raised)] text-[var(--color-text-2)] hover:bg-[var(--color-card-inner)]'
              }`}
            >
              Average (+{averageHp})
            </button>
            <button
              onClick={() => setHpChoice('roll')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                hpChoice === 'roll' ? 'bg-amber-500 text-slate-900' : 'bg-[var(--color-raised)] text-[var(--color-text-2)] hover:bg-[var(--color-card-inner)]'
              }`}
            >
              Roll d{classData?.hitDie ?? 8}
            </button>
          </div>
          {hpChoice === 'roll' && (
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={1}
                max={classData?.hitDie ?? 8}
                value={rolledHp}
                onChange={e => setRolledHp(e.target.value)}
                placeholder={`1–${classData?.hitDie ?? 8}`}
                className="flex-1 bg-[var(--color-raised)] rounded-xl px-4 py-2.5 text-sm outline-none outline-none focus:ring-1 focus:ring-[var(--color-gold-lt)] placeholder:text-[var(--color-faint)]"
              />
              {rolledHp && (
                <span className="text-sm text-[var(--color-muted)]">
                  = {Math.max(1, parseInt(rolledHp, 10) + abilityMod(character.abilityScores.con))} HP
                  {abilityMod(character.abilityScores.con) !== 0 && (
                    <span className="text-xs text-[var(--color-disabled)] ml-1">
                      ({rolledHp} + CON {abilityMod(character.abilityScores.con) >= 0 ? '+' : ''}{abilityMod(character.abilityScores.con)})
                    </span>
                  )}
                </span>
              )}
            </div>
          )}
        </div>

        {/* ASI */}
        {hasAsi && (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wide">Ability Score Improvement</p>
            <div className="flex gap-2">
              {(['+2', '+1+1', 'feat'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => { setAsiMode(m); setBoostOne(null); setBoostA(null); setBoostB(null); setChosenFeat(null); setFeatAbilityPick(null); setFeatProfSel(EMPTY_FEAT_PROF_SELECTION); setFeatQuery(''); setFeatResults([]); }}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                    asiMode === m ? 'bg-amber-500 text-slate-900' : 'bg-[var(--color-raised)] text-[var(--color-text-2)] hover:bg-[var(--color-card-inner)]'
                  }`}
                >
                  {m === '+2' ? '+2 to one' : m === '+1+1' ? '+1 to two' : 'Take a feat'}
                </button>
              ))}
            </div>

            {asiMode === '+2' && (
              <div className="grid grid-cols-3 gap-2">
                {ABILITY_KEYS.map(key => {
                  const current = character.abilityScores[key];
                  const capped = current >= 20;
                  return (
                    <button
                      key={key}
                      onClick={() => !capped && setBoostOne(key)}
                      disabled={capped}
                      className={`py-2.5 rounded-xl text-sm transition-colors ${
                        boostOne === key
                          ? 'bg-amber-500 text-slate-900 font-semibold'
                          : capped
                          ? 'bg-[var(--color-raised)]/30 text-[var(--color-disabled)]'
                          : 'bg-[var(--color-raised)] hover:bg-[var(--color-card-inner)]'
                      }`}
                    >
                      {ABILITY_LABEL[key]}
                      <span className="block text-xs opacity-70">{current} → {Math.min(20, current + 2)}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {asiMode === '+1+1' && (
              <div className="grid grid-cols-3 gap-2">
                {ABILITY_KEYS.map(key => {
                  const current = character.abilityScores[key];
                  const capped = current >= 20;
                  const selected = boostA === key || boostB === key;
                  const full = boostA !== null && boostB !== null && !selected;
                  return (
                    <button
                      key={key}
                      disabled={capped || (full && !selected)}
                      onClick={() => {
                        if (selected) {
                          if (boostA === key) setBoostA(null);
                          else setBoostB(null);
                        } else if (boostA === null) setBoostA(key);
                        else if (boostB === null) setBoostB(key);
                      }}
                      className={`py-2.5 rounded-xl text-sm transition-colors ${
                        selected
                          ? 'bg-amber-500 text-slate-900 font-semibold'
                          : capped || full
                          ? 'bg-[var(--color-raised)]/30 text-[var(--color-disabled)]'
                          : 'bg-[var(--color-raised)] hover:bg-[var(--color-card-inner)]'
                      }`}
                    >
                      {ABILITY_LABEL[key]}
                      <span className="block text-xs opacity-70">{current} → {Math.min(20, current + (selected ? 1 : 0))}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {asiMode === 'feat' && (
              <div className="space-y-2">
                {chosenFeat ? (
                  <>
                    <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-amber-500/20 border border-amber-500/40">
                      <span className="text-sm font-medium">{chosenFeat.name}</span>
                      <button
                        onClick={() => { setChosenFeat(null); setFeatAbilityPick(null); setFeatProfSel(EMPTY_FEAT_PROF_SELECTION); setFeatQuery(''); }}
                        className="text-xs text-[var(--color-faint)] hover:text-[var(--color-text)]"
                      >
                        Change
                      </button>
                    </div>
                    {/* Half-feat with a choice increase: pick which ability gets it */}
                    {chosenFeatGrant?.choice && (
                      <>
                        <p className="text-xs text-[var(--color-faint)]">
                          {chosenFeat.name} also increases an ability by {chosenFeatGrant.choice.amount} — choose which:
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                          {chosenFeatGrant.choice.from.map(key => {
                            const current = character.abilityScores[key];
                            const capped = current >= 20;
                            return (
                              <button
                                key={key}
                                disabled={capped}
                                onClick={() => setFeatAbilityPick(key)}
                                className={`py-2.5 rounded-xl text-sm transition-colors ${
                                  featAbilityPick === key
                                    ? 'bg-amber-500 text-slate-900 font-semibold'
                                    : capped
                                    ? 'bg-[var(--color-raised)]/30 text-[var(--color-disabled)]'
                                    : 'bg-[var(--color-raised)] hover:bg-[var(--color-card-inner)]'
                                }`}
                              >
                                {ABILITY_LABEL[key]}
                                <span className="block text-xs opacity-70">{current} → {Math.min(20, current + chosenFeatGrant.choice!.amount)}</span>
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}
                    {/* Feats that grant proficiency/expertise choices (Prodigy, Skilled, …) */}
                    {featProf && featProf.choices.length > 0 && (
                      <>
                        <p className="text-xs text-[var(--color-faint)]">{chosenFeat.name} also grants proficiencies — choose:</p>
                        <FeatProficiencyPicker
                          proficiencies={featProf}
                          proficientSkills={character.proficiencies.skills}
                          value={featProfSel}
                          onChange={setFeatProfSel}
                        />
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <input
                      type="search"
                      autoFocus
                      placeholder="Search feats…"
                      value={featQuery}
                      onChange={e => setFeatQuery(e.target.value)}
                      className="w-full bg-[var(--color-raised)] rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-[var(--color-gold-lt)] placeholder:text-[var(--color-faint)]"
                    />
                    {featResults.length > 0 && (
                      <div className="bg-[var(--color-raised)] rounded-xl overflow-hidden divide-y divide-[var(--color-border)]">
                        {featResults.map(feat => {
                          const pre = featPrereqLabel(feat.prerequisite);
                          return (
                            <button
                              key={`${feat.name}|${feat.source}`}
                              onClick={() => { setChosenFeat(feat); setFeatProfSel(EMPTY_FEAT_PROF_SELECTION); }}
                              className="w-full flex items-start justify-between px-4 py-2.5 text-left hover:bg-white/5"
                            >
                              <div>
                                <p className="text-sm font-medium">{feat.name}</p>
                                {pre && <p className="text-xs text-[var(--color-faint)] mt-0.5">Req: {pre}</p>}
                              </div>
                              <span className="text-xs text-[var(--color-disabled)] ml-2 shrink-0">{feat.source}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {featQuery.trim() && featResults.length === 0 && (
                      <p className="text-xs text-[var(--color-disabled)] text-center">No feats found</p>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Subclass picker */}
        {picksSubclass && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wide">
              Subclass
              <span className="ml-1.5 text-red-400">*required</span>
            </p>
            {availableSubclasses.length === 0 ? (
              <p className="text-sm text-[var(--color-faint)] italic">Loading subclasses…</p>
            ) : (
              <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
                {availableSubclasses.map(sub => {
                  const isChosen = chosenSubclass?.name === sub.name && chosenSubclass?.source === sub.source;
                  return (
                    <button
                      key={`${sub.name}|${sub.source}`}
                      onClick={() => setChosenSubclass(sub)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-left transition-colors ${
                        isChosen
                          ? 'bg-violet-500/20 border border-violet-500/40'
                          : 'bg-[var(--color-raised)] hover:bg-[var(--color-card-inner)]'
                      }`}
                    >
                      <span className="text-sm font-medium">{sub.name}</span>
                      <span className="text-xs text-[var(--color-faint)] ml-2 shrink-0">{sub.source}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Confirm */}
        <div className="flex gap-2 pb-2">
          <button
            onClick={onClose}
            className="flex-1 py-3 text-sm text-[var(--color-muted)] border border-[var(--color-border)] rounded-xl hover:text-[var(--color-text)]"
          >
            Cancel
          </button>
          <button
            onClick={confirm}
            disabled={!canConfirm}
            className="flex-1 py-3 text-sm font-semibold bg-amber-500 text-slate-900 rounded-xl hover:bg-amber-400 disabled:opacity-40"
          >
            Level Up! +{hpGain} HP
          </button>
        </div>
      </div>
    </>
  );
}
