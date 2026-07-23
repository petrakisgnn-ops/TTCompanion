import { useEffect, useMemo, useState } from 'react';
import type { AbilityScores } from '../../../domain/character/types';
import { parseFeatAbility, type FeatAbilityGrant } from '../../../domain/rules/featAbility';
import {
  parseFeatProficiencies, featProfChoicesComplete, type FeatProficiencies,
} from '../../../domain/rules/featRewards';
import { asiLevelsUpTo, type AbilityKey } from '../../../domain/rules/classData';
import { FeatProficiencyPicker } from '../FeatProficiencyPicker';
import { BLANK_ASI_CHOICE, type AsiChoice, type WizardData } from './CharacterWizard';

interface FeatEntry {
  name: string;
  source: string;
  ability?: unknown;
  prerequisite?: unknown[];
  skillProficiencies?: unknown;
  toolProficiencies?: unknown;
  languageProficiencies?: unknown;
  expertise?: unknown;
  skillToolLanguageProficiencies?: unknown;
}

const ABILITY_KEYS: AbilityKey[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const ABILITY_LABEL: Record<AbilityKey, string> = {
  str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA',
};

interface Props {
  className: string;
  level: number;
  data: WizardData;
  patch: (p: Partial<WizardData>) => void;
}

/** Resolves a slot's boosts + completeness from its current selections and (for feats) grants. */
function resolveChoice(choice: AsiChoice, grant: FeatAbilityGrant | null, prof: FeatProficiencies | null): AsiChoice {
  if (choice.mode === '+2') {
    return { ...choice, boosts: choice.one ? { [choice.one]: 2 } : {}, complete: choice.one != null };
  }
  if (choice.mode === '+1+1') {
    const [a, b] = choice.two;
    const ok = a != null && b != null && a !== b;
    return { ...choice, boosts: ok ? { [a]: 1, [b]: 1 } : {}, complete: ok };
  }
  // feat
  if (!choice.feat) return { ...choice, boosts: {}, complete: false };
  const boosts: Partial<AbilityScores> = { ...(grant?.fixed ?? {}) };
  let complete = true;
  if (grant?.choice) {
    if (choice.featAbility) boosts[choice.featAbility] = (boosts[choice.featAbility] ?? 0) + grant.choice.amount;
    else complete = false;
  }
  if (prof && !featProfChoicesComplete(prof, choice.featProfSel)) complete = false;
  return { ...choice, boosts, complete };
}

export function AsiChoicesSection({ className, level, data, patch }: Props) {
  const slotLevels = useMemo(() => asiLevelsUpTo(className, level), [className, level]);
  const [allFeats, setAllFeats] = useState<FeatEntry[]>([]);
  const [featQuery, setFeatQuery] = useState<Record<number, string>>({});

  const featByKey = useMemo(
    () => new Map(allFeats.map(f => [`${f.name}|${f.source}`.toLowerCase(), f])),
    [allFeats],
  );

  const choices = data.asiChoices;
  const active = choices.slice(0, slotLevels.length);
  const anyFeatMode = active.some(c => c?.mode === 'feat');

  // Lazily load feats.json the first time any slot is set to "take a feat".
  useEffect(() => {
    if (!anyFeatMode || allFeats.length > 0) return;
    fetch(`${import.meta.env.BASE_URL}data/feats.json`)
      .then(r => r.json())
      .then((json: { feat: FeatEntry[] }) => setAllFeats(json.feat));
  }, [anyFeatMode, allFeats.length]);

  // Keep exactly one choice entry per earned slot (grows/trims when class or level changes).
  useEffect(() => {
    if (choices.length === slotLevels.length && choices.every(Boolean)) return;
    const next: AsiChoice[] = [];
    for (let i = 0; i < slotLevels.length; i++) {
      next.push(choices[i] ?? { ...BLANK_ASI_CHOICE, two: [null, null], boosts: {} });
    }
    patch({ asiChoices: next });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slotLevels.length]);

  if (slotLevels.length === 0) return null;

  const slotAt = (i: number): AsiChoice => choices[i] ?? { ...BLANK_ASI_CHOICE, two: [null, null], boosts: {} };

  const featEntryFor = (choice: AsiChoice): FeatEntry | undefined =>
    choice.feat ? featByKey.get(`${choice.feat.name}|${choice.feat.source}`.toLowerCase()) : undefined;
  const grantFor = (choice: AsiChoice): FeatAbilityGrant | null => {
    const entry = featEntryFor(choice);
    return entry ? parseFeatAbility(entry.ability) : null;
  };
  const profFor = (choice: AsiChoice): FeatProficiencies | null => {
    const entry = featEntryFor(choice);
    return entry ? parseFeatProficiencies(entry) : null;
  };

  const update = (i: number, partial: Partial<AsiChoice>) => {
    const merged = { ...slotAt(i), ...partial };
    const resolved = resolveChoice(merged, grantFor(merged), profFor(merged));
    const arr: AsiChoice[] = [];
    for (let s = 0; s < slotLevels.length; s++) arr.push(s === i ? resolved : slotAt(s));
    patch({ asiChoices: arr });
  };

  // Score an ability already has before a given slot's boost — base + racial/bg bonus + every
  // other slot's boost — so per-slot pickers can preview totals and cap at 20 like a real level-up.
  const baseScore = (key: AbilityKey) => data.abilityScores[key] + (data.abilityBonus[key] ?? 0);
  const scoreBefore = (i: number, key: AbilityKey) =>
    baseScore(key) + active.reduce((sum, c, j) => (j === i ? sum : sum + (c.boosts[key] ?? 0)), 0);

  // Feats already spoken for elsewhere (other ASI slots + the race variant bonus feat).
  const takenFeatKeys = new Set<string>();
  active.forEach(c => { if (c.feat) takenFeatKeys.add(`${c.feat.name}|${c.feat.source}`.toLowerCase()); });
  if (data.raceBonusFeat) takenFeatKeys.add(`${data.raceBonusFeat.name}|${data.raceBonusFeat.source}`.toLowerCase());

  const featResults = (i: number): FeatEntry[] => {
    const q = (featQuery[i] ?? '').trim().toLowerCase();
    if (!q) return [];
    const selfKey = (() => { const f = slotAt(i).feat; return f ? `${f.name}|${f.source}`.toLowerCase() : ''; })();
    return allFeats
      .filter(f => {
        const key = `${f.name}|${f.source}`.toLowerCase();
        return f.name.toLowerCase().includes(q) &&
          f.name.toLowerCase() !== 'ability score improvement' &&
          (!takenFeatKeys.has(key) || key === selfKey);
      })
      .slice(0, 8);
  };

  return (
    <div>
      <h2 className="text-base font-semibold pt-3">Ability Score Improvements</h2>
      <p className="text-xs text-[var(--color-faint)] mt-1">
        Starting at level {level}, {className} has earned {slotLevels.length} improvement
        {slotLevels.length !== 1 ? 's' : ''} (level{slotLevels.length !== 1 ? 's' : ''} {slotLevels.join(', ')}).
        Resolve each as an ability increase or a feat.
      </p>

      <div className="mt-3 space-y-3">
        {slotLevels.map((lvl, i) => {
          const choice = slotAt(i);
          const grant = grantFor(choice);
          const prof = profFor(choice);
          return (
            <div key={lvl} className="bg-[var(--color-card)] rounded-xl p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wide">
                  Level {lvl}
                </span>
                {!choice.complete && <span className="text-xs text-red-400">Choose</span>}
              </div>

              {/* Mode toggle */}
              <div className="flex gap-2">
                {(['+2', '+1+1', 'feat'] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => update(i, { mode: m, one: null, two: [null, null], feat: null, featAbility: null, featProfSel: { skills: [], tools: [], languages: [], expertise: [] } })}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                      choice.mode === m
                        ? 'bg-amber-500 text-slate-900'
                        : 'bg-[var(--color-raised)] text-[var(--color-text-2)] hover:bg-[var(--color-card-inner)]'
                    }`}
                  >
                    {m === '+2' ? '+2 to one' : m === '+1+1' ? '+1 to two' : 'Take a feat'}
                  </button>
                ))}
              </div>

              {choice.mode === '+2' && (
                <div className="grid grid-cols-3 gap-2">
                  {ABILITY_KEYS.map(key => {
                    const current = scoreBefore(i, key);
                    const capped = current >= 20;
                    return (
                      <button
                        key={key}
                        disabled={capped}
                        onClick={() => update(i, { one: key })}
                        className={`py-2 rounded-lg text-sm transition-colors ${
                          choice.one === key
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

              {choice.mode === '+1+1' && (
                <div className="grid grid-cols-3 gap-2">
                  {ABILITY_KEYS.map(key => {
                    const [a, b] = choice.two;
                    const selected = a === key || b === key;
                    const current = scoreBefore(i, key);
                    const capped = current >= 20;
                    const full = a != null && b != null && !selected;
                    return (
                      <button
                        key={key}
                        disabled={capped || full}
                        onClick={() => {
                          let next: (AbilityKey | null)[];
                          if (a === key) next = [null, b];
                          else if (b === key) next = [a, null];
                          else if (a == null) next = [key, b];
                          else if (b == null) next = [a, key];
                          else next = [a, b];
                          update(i, { two: next });
                        }}
                        className={`py-2 rounded-lg text-sm transition-colors ${
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

              {choice.mode === 'feat' && (
                <div className="space-y-2">
                  {choice.feat ? (
                    <>
                      <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-amber-500/20 border border-amber-500/40">
                        <span className="text-sm font-medium">{choice.feat.name}</span>
                        <button
                          onClick={() => { update(i, { feat: null, featAbility: null, featProfSel: { skills: [], tools: [], languages: [], expertise: [] } }); setFeatQuery(q => ({ ...q, [i]: '' })); }}
                          className="text-xs text-[var(--color-faint)] hover:text-[var(--color-text)]"
                        >
                          Change
                        </button>
                      </div>
                      {grant?.choice && (
                        <>
                          <p className="text-xs text-[var(--color-faint)]">
                            {choice.feat.name} also increases an ability by {grant.choice.amount} — choose which:
                          </p>
                          <div className="grid grid-cols-3 gap-2">
                            {grant.choice.from.map(key => {
                              const current = scoreBefore(i, key);
                              const capped = current >= 20;
                              return (
                                <button
                                  key={key}
                                  disabled={capped}
                                  onClick={() => update(i, { featAbility: key })}
                                  className={`py-2 rounded-lg text-sm transition-colors ${
                                    choice.featAbility === key
                                      ? 'bg-amber-500 text-slate-900 font-semibold'
                                      : capped
                                      ? 'bg-[var(--color-raised)]/30 text-[var(--color-disabled)]'
                                      : 'bg-[var(--color-raised)] hover:bg-[var(--color-card-inner)]'
                                  }`}
                                >
                                  {ABILITY_LABEL[key]}
                                  <span className="block text-xs opacity-70">{current} → {Math.min(20, current + grant.choice!.amount)}</span>
                                </button>
                              );
                            })}
                          </div>
                        </>
                      )}
                      {prof && prof.choices.length > 0 && (
                        <>
                          <p className="text-xs text-[var(--color-faint)]">{choice.feat.name} also grants proficiencies — choose:</p>
                          <FeatProficiencyPicker
                            proficiencies={prof}
                            proficientSkills={data.skills}
                            value={choice.featProfSel}
                            onChange={sel => update(i, { featProfSel: sel })}
                          />
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      <input
                        type="search"
                        placeholder="Search feats…"
                        value={featQuery[i] ?? ''}
                        onChange={e => setFeatQuery(q => ({ ...q, [i]: e.target.value }))}
                        className="w-full bg-[var(--color-raised)] rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[var(--color-gold-lt)] placeholder:text-[var(--color-faint)]"
                      />
                      {featResults(i).length > 0 && (
                        <div className="bg-[var(--color-raised)] rounded-lg overflow-hidden divide-y divide-[var(--color-border)]">
                          {featResults(i).map(feat => (
                            <button
                              key={`${feat.name}|${feat.source}`}
                              onClick={() => { update(i, { feat: { name: feat.name, source: feat.source }, featAbility: null, featProfSel: { skills: [], tools: [], languages: [], expertise: [] } }); setFeatQuery(q => ({ ...q, [i]: '' })); }}
                              className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-white/5"
                            >
                              <span className="text-sm font-medium">{feat.name}</span>
                              <span className="text-xs text-[var(--color-disabled)] ml-2 shrink-0">{feat.source}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      {(featQuery[i] ?? '').trim() && featResults(i).length === 0 && allFeats.length > 0 && (
                        <p className="text-xs text-[var(--color-disabled)] text-center">No feats found</p>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
