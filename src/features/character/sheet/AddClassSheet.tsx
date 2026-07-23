import { useEffect, useState } from 'react';
import { useCharacterStore } from '../../../stores/characterStore';
import { useSettingsStore, type Edition } from '../../../stores/settingsStore';
import type { Character, AbilityScores } from '../../../domain/character/types';
import type { RefId } from '../../../domain/reference/types';
import { CLASSES, subclassLevel, meetsPrereq, type ClassData, type AbilityPrereq } from '../../../domain/rules/classData';
import { CLASS_SKILLS, ALL_SKILLS } from '../../../domain/rules/classSkills';
import { matchesEdition } from '../../../domain/rules/edition';
import { abilityMod } from '../../../domain/rules';

interface RawSubclass { name: string; source: string; reprintedAs?: unknown }

async function fetchSubclasses(className: string, edition: Edition): Promise<RefId[]> {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}data/class/class-${className.toLowerCase()}.json`);
    if (!res.ok) return [];
    const json = await res.json() as { subclass?: RawSubclass[] };
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

function prereqLabel(p: AbilityPrereq): string {
  const parts: string[] = [];
  if (p.all?.length) parts.push(p.all.map(k => `${k.toUpperCase()} 13`).join(' and '));
  if (p.any?.length) parts.push(p.any.map(k => `${k.toUpperCase()} 13`).join(' or '));
  return parts.join(' and ');
}

interface AddClassSheetProps {
  character: Character;
  onClose: () => void;
}

export function AddClassSheet({ character, onClose }: AddClassSheetProps) {
  const { addClass } = useCharacterStore();
  const { edition } = useSettingsStore();

  const availableClasses = CLASSES.filter(
    cls => !character.classes.some(cl => cl.classRef.name === cls.name),
  );

  const [selected, setSelected] = useState<ClassData | null>(null);
  const [hpChoice, setHpChoice] = useState<'average' | 'roll'>('average');
  const [rolledHp, setRolledHp] = useState('');
  const [subclasses, setSubclasses] = useState<RefId[]>([]);
  const [chosenSubclass, setChosenSubclass] = useState<RefId | null>(null);
  const [chosenSkill, setChosenSkill] = useState<string | null>(null);

  // Multiclassing in adds the class at its level 1, so a subclass is only needed immediately when
  // that class picks one at level 1 — true for a few 2014 classes, never in 2024 (subclass @3).
  const needsSubclassNow = selected ? subclassLevel(selected.name, character.edition) === 1 : false;

  useEffect(() => {
    setChosenSubclass(null);
    setChosenSkill(null);
    setSubclasses([]);
    if (!selected || !needsSubclassNow) return;
    fetchSubclasses(selected.name, edition).then(setSubclasses);
  }, [selected?.name, needsSubclassNow, edition]);

  if (!selected) {
    return (
      <>
        <div className="fixed inset-0 z-40 bg-black/60" onClick={onClose} />
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--color-card)] rounded-t-2xl p-5 space-y-4 max-h-[85vh] overflow-y-auto">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-base">Multiclass — Choose a Class</h2>
            <button onClick={onClose} className="text-[var(--color-muted)] hover:text-[var(--color-text)] text-sm">✕</button>
          </div>
          <div className="space-y-1">
            {availableClasses.map(cls => (
              <button
                key={`${cls.name}|${cls.source}`}
                onClick={() => setSelected(cls)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-left bg-[var(--color-raised)] hover:bg-[var(--color-card-inner)] transition-colors"
              >
                <span className="text-sm font-medium">{cls.name}</span>
                <span className="text-xs text-[var(--color-faint)]">d{cls.hitDie}</span>
              </button>
            ))}
          </div>
        </div>
      </>
    );
  }

  const conMod = abilityMod(character.abilityScores.con);
  const averageHp = Math.floor(selected.hitDie / 2) + 1 + conMod;
  const hpGain = hpChoice === 'average'
    ? averageHp
    : Math.max(1, (parseInt(rolledHp, 10) || 0) + conMod);

  // Prereqs: RAW requires meeting the new class's prereq AND every class you already have.
  // Excludes `selected` from the existing-classes half — guards a transient render right after
  // confirming, where `character.classes` already includes the just-added class for one frame
  // before this sheet unmounts, which would otherwise list it twice.
  const prereqChecks = [
    { name: selected.name, prereq: selected.multiclassPrereq },
    ...character.classes
      .filter(cl => cl.classRef.name !== selected.name)
      .map(cl => ({
        name: cl.classRef.name,
        prereq: CLASSES.find(c => c.name === cl.classRef.name)?.multiclassPrereq,
      })),
  ].filter((x): x is { name: string; prereq: AbilityPrereq } => !!x.prereq && (!!x.prereq.all?.length || !!x.prereq.any?.length));

  const classChoice = CLASS_SKILLS[selected.name];
  const classSkillList = classChoice ? (classChoice.from.length > 0 ? classChoice.from : ALL_SKILLS) : ALL_SKILLS;
  const eligibleSkills = classSkillList.filter(s => !character.proficiencies.skills.includes(s));
  const needsSkillChoice = !!selected.multiclassProficiency.skillChoice;
  const skillComplete = !needsSkillChoice || chosenSkill !== null;
  const hpComplete = hpChoice === 'average' || parseInt(rolledHp, 10) > 0;
  const subclassComplete = !needsSubclassNow || chosenSubclass !== null;
  const canConfirm = hpComplete && subclassComplete && skillComplete;

  const confirm = async () => {
    await addClass(character.id, {
      classRef: { name: selected.name, source: selected.source },
      hpGain,
      subclass: chosenSubclass ?? undefined,
      proficiencies: {
        armor: selected.multiclassProficiency.armor,
        weapons: selected.multiclassProficiency.weapons,
        tool: selected.multiclassProficiency.tool,
        skill: chosenSkill ?? undefined,
      },
    });
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--color-card)] rounded-t-2xl p-5 space-y-5 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-base">Multiclass into {selected.name}</h2>
          <button onClick={onClose} className="text-[var(--color-muted)] hover:text-[var(--color-text)] text-sm">✕</button>
        </div>

        <button onClick={() => setSelected(null)} className="text-xs text-amber-500">← Choose a different class</button>

        {/* Prerequisites — advisory only, matches this app's "informs, doesn't enforce" rules stance */}
        {prereqChecks.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wide">
              Prerequisites <span className="normal-case font-normal">(informational — some tables ignore this)</span>
            </p>
            {prereqChecks.map(({ name, prereq }) => {
              const met = meetsPrereq(prereq, character.abilityScores as AbilityScores);
              return (
                <div key={name} className="flex items-center justify-between bg-[var(--color-raised)]/50 rounded-lg px-3 py-2">
                  <span className="text-sm">{name}</span>
                  <span className={`text-xs font-medium ${met ? 'text-emerald-400' : 'text-red-400'}`}>
                    {met ? '✓' : '✗'} {prereqLabel(prereq)}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Granted proficiencies */}
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wide">Grants</p>
          <p className="text-sm text-[var(--color-text-2)]">
            {[...selected.multiclassProficiency.armor, ...selected.multiclassProficiency.weapons, selected.multiclassProficiency.tool]
              .filter(Boolean)
              .join(', ') || 'No additional proficiencies (per PHB multiclassing rules)'}
          </p>
        </div>

        {/* Bonus skill choice */}
        {needsSkillChoice && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wide">Choose 1 bonus skill</p>
            <div className="flex flex-wrap gap-2">
              {eligibleSkills.map(skill => (
                <button
                  key={skill}
                  onClick={() => setChosenSkill(skill)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                    chosenSkill === skill ? 'bg-amber-500 text-slate-900' : 'bg-[var(--color-raised)] text-[var(--color-text-2)] hover:bg-[var(--color-card-inner)]'
                  }`}
                >
                  {skill}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* HP gain */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wide">HP Gain (Level 1 of {selected.name})</p>
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
              Roll d{selected.hitDie}
            </button>
          </div>
          {hpChoice === 'roll' && (
            <input
              type="number"
              min={1}
              max={selected.hitDie}
              value={rolledHp}
              onChange={e => setRolledHp(e.target.value)}
              placeholder={`1–${selected.hitDie}`}
              className="w-full bg-[var(--color-raised)] rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-[var(--color-gold-lt)] placeholder:text-[var(--color-faint)]"
            />
          )}
        </div>

        {/* Subclass picker */}
        {needsSubclassNow && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wide">
              Subclass <span className="ml-1.5 text-red-400">*required</span>
            </p>
            {subclasses.length === 0 ? (
              <p className="text-sm text-[var(--color-faint)] italic">Loading subclasses…</p>
            ) : (
              <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
                {subclasses.map(sub => {
                  const isChosen = chosenSubclass?.name === sub.name && chosenSubclass?.source === sub.source;
                  return (
                    <button
                      key={`${sub.name}|${sub.source}`}
                      onClick={() => setChosenSubclass(sub)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-left transition-colors ${
                        isChosen ? 'bg-violet-500/20 border border-violet-500/40' : 'bg-[var(--color-raised)] hover:bg-[var(--color-card-inner)]'
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

        <div className="flex gap-2 pb-2">
          <button onClick={onClose} className="flex-1 py-3 text-sm text-[var(--color-muted)] border border-[var(--color-border)] rounded-xl hover:text-[var(--color-text)]">
            Cancel
          </button>
          <button
            onClick={confirm}
            disabled={!canConfirm}
            className="flex-1 py-3 text-sm font-semibold bg-amber-500 text-slate-900 rounded-xl hover:bg-amber-400 disabled:opacity-40"
          >
            Multiclass! +{hpGain} HP
          </button>
        </div>
      </div>
    </>
  );
}
