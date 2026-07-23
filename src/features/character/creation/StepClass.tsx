import { useEffect, useState } from 'react';
import { CLASSES, subclassLevel } from '../../../domain/rules/classData';
import { matchesEdition } from '../../../domain/rules/edition';
import { useSettingsStore, type Edition } from '../../../stores/settingsStore';
import type { WizardData } from './CharacterWizard';
import type { RefId } from '../../../domain/reference/types';

interface StepClassProps {
  data: WizardData;
  patch: (p: Partial<WizardData>) => void;
}

interface RawSubclass { name: string; source: string; reprintedAs?: unknown }

async function fetchSubclasses(className: string, edition: Edition): Promise<RefId[]> {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}data/class/class-${className.toLowerCase()}.json`);
    if (!res.ok) return [];
    const json = await res.json() as { subclass?: RawSubclass[] };
    // The raw data lists every subclass more than once: a "reprintedAs" stub pointing at its
    // 2024 successor (skip — never meant to display standalone), plus separate PHB and XPHB
    // entries that share the exact same display name (e.g. "Life Domain" in both) — filter to
    // the active edition the same way Race/Background already do, then dedupe by name+source.
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

const SPELLCASTING_LABEL: Record<string, string> = {
  full: 'Full caster',
  half: 'Half caster',
  artificer: 'Half caster',
  pact: 'Pact magic',
  none: 'Non-caster',
};

export function StepClass({ data, patch }: StepClassProps) {
  const { edition } = useSettingsStore();
  const [subclasses, setSubclasses] = useState<RefId[]>([]);
  const selectedKey = data.classRef
    ? `${data.classRef.name}|${data.classRef.source}`
    : null;

  // Any class whose subclass level is already reached at the chosen creation level must
  // pick it here — Cleric/Sorcerer/Warlock always (level 1), and everyone else when the
  // character is being created at/above their subclass level (e.g. a Fighter made at
  // level 5 picks their Martial Archetype now, not via a future level-up).
  const needsSubclassNow = data.classRef ? data.level >= subclassLevel(data.classRef.name, edition) : false;

  useEffect(() => {
    if (!needsSubclassNow || !data.classRef) { setSubclasses([]); return; }
    fetchSubclasses(data.classRef.name, edition).then(setSubclasses);
  }, [needsSubclassNow, data.classRef?.name, edition]);

  const chooseClass = (cls: { name: string; source: string }) => {
    patch({ classRef: { name: cls.name, source: cls.source }, subclassRef: null });
  };

  return (
    <div className="pb-4">
      <div className="px-4 py-3">
        <h2 className="text-base font-semibold">Choose a Class</h2>
      </div>

      <div className="divide-y divide-[var(--color-border)]">
        {CLASSES.map(cls => {
          const key = `${cls.name}|${cls.source}`;
          const selected = selectedKey === key;
          return (
            <div key={key}>
              <button
                onClick={() => chooseClass(cls)}
                className={`w-full flex items-center justify-between px-4 py-3 text-left min-h-[3rem] transition-colors ${
                  selected
                    ? 'bg-amber-500/10 border-l-2 border-amber-500'
                    : 'hover:bg-white/5 active:bg-white/10'
                }`}
              >
                <div>
                  <p className={`font-medium text-sm ${selected ? 'text-amber-400' : ''}`}>
                    {cls.name}
                  </p>
                  <p className="text-xs text-[var(--color-faint)]">
                    d{cls.hitDie} · {SPELLCASTING_LABEL[cls.spellcasting]}
                  </p>
                </div>
                <span className="text-xs text-[var(--color-faint)] ml-2 shrink-0">{cls.source}</span>
              </button>

              {/* Level + subclass controls render directly under the selected class */}
              {selected && (
                <div className="mx-4 my-3 space-y-3">
                  {/* Level picker */}
                  <div className="bg-[var(--color-card)] rounded-xl p-3 flex items-center justify-between">
                    <span className="text-sm font-medium text-amber-400">{cls.name} — Level</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => patch({ level: Math.max(1, data.level - 1) })}
                        className="w-9 h-9 rounded-lg bg-[var(--color-raised)] text-lg font-bold hover:bg-[var(--color-card-inner)] flex items-center justify-center"
                      >
                        −
                      </button>
                      <span className="w-8 text-center font-bold text-lg">{data.level}</span>
                      <button
                        onClick={() => patch({ level: Math.min(20, data.level + 1) })}
                        className="w-9 h-9 rounded-lg bg-[var(--color-raised)] text-lg font-bold hover:bg-[var(--color-card-inner)] flex items-center justify-center"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Subclass picker — only when the creation level has reached the subclass level */}
                  {needsSubclassNow && (
                    <div className="bg-[var(--color-card)] rounded-xl p-3 space-y-2">
                      <p className="text-xs text-[var(--color-faint)] uppercase tracking-wide font-semibold">
                        {cls.name} chooses its subclass at level {subclassLevel(cls.name, edition)}
                      </p>
                      {subclasses.length === 0 ? (
                        <p className="text-sm text-[var(--color-faint)] italic">Loading subclasses…</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {subclasses.map(sub => {
                            const picked = data.subclassRef?.name === sub.name && data.subclassRef?.source === sub.source;
                            return (
                              <button
                                key={`${sub.name}|${sub.source}`}
                                onClick={() => patch({ subclassRef: sub })}
                                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                                  picked
                                    ? 'bg-amber-500 text-slate-900'
                                    : 'bg-[var(--color-raised)] text-[var(--color-text-2)] hover:bg-[var(--color-card-inner)]'
                                }`}
                              >
                                {sub.name}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
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
