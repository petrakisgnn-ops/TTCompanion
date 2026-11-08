import { useEffect, useState } from 'react';
import { CLASSES, classSourceFor, subclassLevel } from '../../../domain/rules/classData';
import { useSettingsStore } from '../../../stores/settingsStore';
import type { WizardData } from './CharacterWizard';
import type { RefId } from '../../../domain/reference/types';
import { subclassLabel } from '../subclassLabel';
import { FeatureChoicesPicker } from './FeatureChoicesPicker';
import { fetchSubclassOptions } from '../grantSourcesCache';

interface StepClassProps {
  data: WizardData;
  patch: (p: Partial<WizardData>) => void;
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
  const selectedName = data.classRef?.name ?? null;

  // Any class whose subclass level is already reached at the chosen creation level must
  // pick it here — Cleric/Sorcerer/Warlock always (level 1), and everyone else when the
  // character is being created at/above their subclass level (e.g. a Fighter made at
  // level 5 picks their Martial Archetype now, not via a future level-up).
  const needsSubclassNow = data.classRef ? data.level >= subclassLevel(data.classRef.name, edition) : false;

  useEffect(() => {
    if (!needsSubclassNow || !data.classRef) { setSubclasses([]); return; }
    fetchSubclassOptions(data.classRef.name, data.classRef.source, edition).then(setSubclasses);
  }, [needsSubclassNow, data.classRef?.name, edition]);

  const chooseClass = (cls: { name: string; source: string }) => {
    // 2024 characters reference the XPHB reprint so features/equipment resolve to the 2024 rules.
    patch({ classRef: { name: cls.name, source: classSourceFor(cls.name, edition) }, subclassRef: null, featureChoices: {} });
  };

  return (
    <div className="pb-4">
      <div className="px-4 py-3">
        <h2 className="text-base font-semibold">Choose a Class</h2>
      </div>

      <div className="divide-y divide-[var(--color-border)]">
        {CLASSES.map(cls => {
          const key = `${cls.name}|${cls.source}`;
          const selected = selectedName === cls.name;
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
                <span className="text-xs text-[var(--color-faint)] ml-2 shrink-0">{classSourceFor(cls.name, edition)}</span>
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
                                {subclassLabel(sub, subclasses)}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* "Choose one" class features reached by this level (2024 Divine Order, Primal Order, …) */}
                  <FeatureChoicesPicker data={data} patch={patch} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
