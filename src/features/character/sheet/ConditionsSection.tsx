import { useState } from 'react';
import { CONDITIONS, CONDITION_COLOR } from '../../../domain/rules/conditions';
import { useCharacterStore } from '../../../stores/characterStore';
import type { Character } from '../../../domain/character/types';

interface ConditionsSectionProps { character: Character }

export function ConditionsSection({ character }: ConditionsSectionProps) {
  const { addCondition, removeCondition } = useCharacterStore();
  const [showPicker, setShowPicker] = useState(false);
  const conditions = character.conditions ?? [];

  const exhaustionLevel = conditions.filter(c => c === 'Exhaustion').length;
  const activeNonExhaustion = conditions.filter(c => c !== 'Exhaustion');
  const hasAny = activeNonExhaustion.length > 0 || exhaustionLevel > 0;

  const toggle = (cond: string) => {
    if (conditions.includes(cond)) {
      removeCondition(character.id, cond);
    } else {
      addCondition(character.id, cond);
    }
  };

  return (
    <div className="space-y-2">
      {/* Active conditions */}
      {hasAny && (
        <div className="flex flex-wrap gap-1.5">
          {/* Non-exhaustion conditions */}
          {activeNonExhaustion.map(cond => (
            <button
              key={cond}
              onClick={() => removeCondition(character.id, cond)}
              className={`text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1 transition-opacity hover:opacity-80 ${CONDITION_COLOR[cond] ?? 'bg-[var(--color-card-inner)] text-[var(--color-text)]'}`}
            >
              {cond}
              <span className="opacity-60 text-[10px]">✕</span>
            </button>
          ))}

          {/* Exhaustion with level counter */}
          {exhaustionLevel > 0 && (
            <div className={`text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1 ${CONDITION_COLOR['Exhaustion']}`}>
              <button
                onClick={() => removeCondition(character.id, 'Exhaustion')}
                className="opacity-70 hover:opacity-100 font-bold leading-none"
              >
                −
              </button>
              <span>Exhaustion {exhaustionLevel}</span>
              <button
                onClick={() => exhaustionLevel < 6 && addCondition(character.id, 'Exhaustion')}
                disabled={exhaustionLevel >= 6}
                className="opacity-70 hover:opacity-100 font-bold leading-none disabled:opacity-30"
              >
                +
              </button>
            </div>
          )}
        </div>
      )}

      {/* Add / empty state */}
      {!hasAny && !showPicker && (
        <p className="text-xs text-[var(--color-disabled)] italic">No active conditions.</p>
      )}

      {/* Condition picker */}
      {showPicker ? (
        <div className="bg-[var(--color-raised)]/50 rounded-xl p-3 space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {CONDITIONS.filter(c => c !== 'Exhaustion' && !conditions.includes(c)).map(cond => (
              <button
                key={cond}
                onClick={() => { addCondition(character.id, cond); }}
                className={`text-xs font-medium px-2.5 py-1 rounded-full transition-opacity hover:opacity-80 ${CONDITION_COLOR[cond] ?? 'bg-[var(--color-card-inner)] text-[var(--color-text)]'}`}
              >
                {cond}
              </button>
            ))}
            {/* Exhaustion always available if < 6 */}
            {exhaustionLevel < 6 && (
              <button
                onClick={() => addCondition(character.id, 'Exhaustion')}
                className={`text-xs font-medium px-2.5 py-1 rounded-full transition-opacity hover:opacity-80 ${CONDITION_COLOR['Exhaustion']}`}
              >
                Exhaustion {exhaustionLevel > 0 ? `(${exhaustionLevel + 1})` : ''}
              </button>
            )}
          </div>
          <button
            onClick={() => setShowPicker(false)}
            className="text-xs text-[var(--color-muted)] hover:text-[var(--color-text)] w-full text-center pt-1"
          >
            Done
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowPicker(true)}
          className="text-xs text-amber-500 hover:text-amber-400 font-semibold"
        >
          + Add Condition
        </button>
      )}
    </div>
  );
}
