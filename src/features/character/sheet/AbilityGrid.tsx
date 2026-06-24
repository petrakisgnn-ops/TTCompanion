import { abilityMod } from '../../../domain/rules';
import type { AbilityScores } from '../../../domain/character/types';

const ABILITY_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const;
const ABILITY_LABELS = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];

interface AbilityGridProps {
  scores: AbilityScores;
}

export function AbilityGrid({ scores }: AbilityGridProps) {
  return (
    <div className="grid grid-cols-6 gap-1.5">
      {ABILITY_KEYS.map((key, i) => {
        const score = scores[key];
        const mod = abilityMod(score);
        return (
          <div
            key={key}
            className="bg-[var(--color-card)] rounded-xl flex flex-col items-center py-2.5 gap-0.5"
          >
            <span className="text-amber-500 font-bold text-xs">{ABILITY_LABELS[i]}</span>
            <span className="text-xl font-bold leading-none">{score}</span>
            <span className="text-[var(--color-muted)] text-xs">
              {mod >= 0 ? '+' : ''}{mod}
            </span>
          </div>
        );
      })}
    </div>
  );
}
