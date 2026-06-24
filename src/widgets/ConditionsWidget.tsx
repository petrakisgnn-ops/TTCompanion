import { useState } from 'react';
import { CONDITIONS, CONDITION_COLOR } from '../domain/rules/conditions';
import { useCharacterStore } from '../stores/characterStore';
import { registerWidget } from './registry';
import type { WidgetProps } from './registry';

function ConditionsWidget({ character }: WidgetProps) {
  const { addCondition, removeCondition } = useCharacterStore();
  const [showPicker, setShowPicker] = useState(false);
  const conditions = character.conditions ?? [];
  const exhaustionLevel = conditions.filter(c => c === 'Exhaustion').length;
  const activeNonExhaustion = conditions.filter(c => c !== 'Exhaustion');
  const hasAny = activeNonExhaustion.length > 0 || exhaustionLevel > 0;

  return (
    <div className="p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Conditions</span>
        <button
          onClick={() => setShowPicker(v => !v)}
          className="text-xs text-amber-500 hover:text-amber-400 font-semibold"
        >
          {showPicker ? 'Done' : '+ Add'}
        </button>
      </div>

      {hasAny && (
        <div className="flex flex-wrap gap-1.5">
          {activeNonExhaustion.map(cond => (
            <button
              key={cond}
              onClick={() => removeCondition(character.id, cond)}
              className={`text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1 transition-opacity hover:opacity-80 ${CONDITION_COLOR[cond] ?? 'bg-slate-600 text-slate-200'}`}
            >
              {cond}
              <span className="opacity-60 text-[10px]">✕</span>
            </button>
          ))}
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

      {!hasAny && !showPicker && (
        <p className="text-xs text-slate-600 italic">No active conditions.</p>
      )}

      {showPicker && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {CONDITIONS
            .filter(c => c !== 'Exhaustion' && !conditions.includes(c))
            .map(cond => (
              <button
                key={cond}
                onClick={() => addCondition(character.id, cond)}
                className={`text-xs font-medium px-2.5 py-1 rounded-full opacity-60 hover:opacity-100 transition-opacity ${CONDITION_COLOR[cond] ?? 'bg-slate-600 text-slate-200'}`}
              >
                {cond}
              </button>
            ))}
          {exhaustionLevel < 6 && (
            <button
              onClick={() => addCondition(character.id, 'Exhaustion')}
              className={`text-xs font-medium px-2.5 py-1 rounded-full opacity-60 hover:opacity-100 transition-opacity ${CONDITION_COLOR['Exhaustion']}`}
            >
              Exhaustion{exhaustionLevel > 0 ? ` (${exhaustionLevel + 1})` : ''}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

registerWidget({
  typeId: 'conditions',
  label: 'Conditions',
  icon: 'sick',
  defaultConfig: {},
  defaultSpan: 2,
  component: ConditionsWidget,
});
