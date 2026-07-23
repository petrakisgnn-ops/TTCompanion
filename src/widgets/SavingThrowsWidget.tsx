import { abilityMod, proficiencyBonus, totalLevel } from '../domain/rules';
import { registerWidget } from './registry';
import type { WidgetProps } from './registry';

const SAVES = [
  { key: 'str', label: 'STR' },
  { key: 'dex', label: 'DEX' },
  { key: 'con', label: 'CON' },
  { key: 'int', label: 'INT' },
  { key: 'wis', label: 'WIS' },
  { key: 'cha', label: 'CHA' },
] as const;

function SavingThrowsWidget({ character }: WidgetProps) {
  const level = totalLevel(character.classes);
  const pb = proficiencyBonus(level);

  return (
    <div className="p-3 space-y-1">
      <p className="text-xs font-semibold text-[var(--color-text-3)] uppercase tracking-wide mb-2">Saving Throws</p>
      <div className="grid grid-cols-3 gap-1.5">
        {SAVES.map(({ key, label }) => {
          const proficient = character.proficiencies.saves.includes(key);
          const mod = abilityMod(character.abilityScores[key]) + (proficient ? pb : 0);
          return (
            <div
              key={key}
              className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 ${
                proficient ? 'bg-amber-500/10' : 'bg-[var(--color-card-inner)]'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  proficient ? 'bg-amber-500' : 'border border-[var(--color-border)]'
                }`}
              />
              <span className="text-xs text-[var(--color-text-3)] w-7">{label}</span>
              <span className={`text-sm font-bold ml-auto ${proficient ? 'text-amber-400' : ''}`}>
                {mod >= 0 ? '+' : ''}{mod}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

registerWidget({
  typeId: 'saving-throws',
  label: 'Saving Throws',
  icon: 'security',
  defaultConfig: {},
  defaultSpan: 2,
  component: SavingThrowsWidget,
});
