import { CLASSES } from '../../../domain/rules/classData';
import type { WizardData } from './CharacterWizard';

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
  const selectedKey = data.classRef
    ? `${data.classRef.name}|${data.classRef.source}`
    : null;

  return (
    <div className="pb-4">
      <div className="px-4 py-3">
        <h2 className="text-base font-semibold">Choose a Class</h2>
      </div>

      {/* Level picker (shown when a class is selected) */}
      {data.classRef && (
        <div className="mx-4 mb-3 bg-[var(--color-card)] rounded-xl p-3 flex items-center justify-between">
          <span className="text-sm font-medium text-amber-400">{data.classRef.name} — Level</span>
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
      )}

      <div className="divide-y divide-[var(--color-border)]">
        {CLASSES.map(cls => {
          const key = `${cls.name}|${cls.source}`;
          const selected = selectedKey === key;
          return (
            <button
              key={key}
              onClick={() => patch({ classRef: { name: cls.name, source: cls.source } })}
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
          );
        })}
      </div>
    </div>
  );
}
