import { abilityMod } from '../domain/rules';
import { registerWidget } from './registry';
import type { WidgetProps } from './registry';

const KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const;
const LABELS = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];

function AbilityScoresWidget({ character }: WidgetProps) {
  return (
    <div className="grid grid-cols-6 gap-1 p-3">
      {KEYS.map((k, i) => {
        const score = character.abilityScores[k];
        const mod = abilityMod(score);
        return (
          <div key={k} className="flex flex-col items-center py-2 bg-[var(--color-card-inner)] rounded-lg">
            <span className="text-amber-500 font-bold text-xs leading-none">{LABELS[i]}</span>
            <span className="text-base font-bold leading-tight mt-1">{score}</span>
            <span className="text-[var(--color-text-3)] text-xs">{mod >= 0 ? '+' : ''}{mod}</span>
          </div>
        );
      })}
    </div>
  );
}

registerWidget({
  typeId: 'ability-scores',
  label: 'Ability Scores',
  icon: 'psychology',
  defaultConfig: {},
  defaultSpan: 2,
  component: AbilityScoresWidget,
});
