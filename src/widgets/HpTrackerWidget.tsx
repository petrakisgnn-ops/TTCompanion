import { useState } from 'react';
import { useCharacterStore } from '../stores/characterStore';
import { ShortRestPanel } from '../features/character/sheet/ShortRestPanel';
import { totalLevel } from '../domain/rules';
import { registerWidget } from './registry';
import type { WidgetProps } from './registry';

function HpTrackerWidget({ character }: WidgetProps) {
  const { updateHp, longRest } = useCharacterStore();
  const [inputVal, setInputVal] = useState('');
  const [mode, setMode] = useState<'heal' | 'damage'>('damage');
  const [showShortRest, setShowShortRest] = useState(false);

  const { current, max, temp } = character.hp;
  const level = totalLevel(character.classes);
  const hitDiceAvailable = level - (character.hitDiceSpent ?? 0);
  const pct = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;
  const barColor = pct > 60 ? 'bg-emerald-500' : pct > 25 ? 'bg-amber-500' : 'bg-red-500';

  const apply = () => {
    const n = parseInt(inputVal, 10);
    if (isNaN(n) || n <= 0) return;
    updateHp(character.id, mode === 'heal' ? n : -n);
    setInputVal('');
  };

  return (
    <div className="space-y-2 p-3">
      <div className="flex items-end justify-between">
        <div>
          <span className="text-3xl font-bold">{current}</span>
          <span className="text-slate-400">/{max}</span>
          {temp > 0 && <span className="ml-1.5 text-sky-400 text-sm">+{temp}t</span>}
        </div>
        <div className="text-right">
          <span className="text-xs text-slate-500 uppercase tracking-wide font-semibold block">HP</span>
          <span className="text-xs text-slate-600">{hitDiceAvailable}/{level} HD</span>
        </div>
      </div>

      <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
      </div>

      {/* Quick adjust */}
      <div className="flex gap-1">
        {[-5, -1, '+1', '+5'].map(v => {
          const n = typeof v === 'string' ? parseInt(v, 10) : v;
          return (
            <button
              key={v}
              onClick={() => updateHp(character.id, n)}
              className="flex-1 py-2 rounded-lg bg-slate-700 text-xs font-semibold hover:bg-slate-600 active:scale-95 transition-all"
            >
              {n > 0 ? `+${n}` : n}
            </button>
          );
        })}
      </div>

      {/* Heal/damage input */}
      <div className="flex gap-1.5">
        <div className="flex rounded-lg overflow-hidden border border-white/10 shrink-0">
          {(['damage', 'heal'] as const).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                mode === m
                  ? m === 'damage' ? 'bg-red-500/30 text-red-400' : 'bg-emerald-500/30 text-emerald-400'
                  : 'text-slate-500'
              }`}
            >
              {m === 'damage' ? 'Dmg' : 'Heal'}
            </button>
          ))}
        </div>
        <input
          type="number"
          min={1}
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && apply()}
          placeholder="0"
          className="flex-1 min-w-0 bg-slate-700 rounded-lg px-2 py-1.5 text-sm text-center outline-none focus:ring-1 focus:ring-amber-500 placeholder:text-slate-500"
        />
        <button
          onClick={apply}
          className="px-3 py-1.5 rounded-lg bg-slate-700 text-sm font-semibold hover:bg-slate-600"
        >
          Go
        </button>
      </div>

      {/* Rest buttons / Short rest panel */}
      {showShortRest ? (
        <ShortRestPanel character={character} onDone={() => setShowShortRest(false)} />
      ) : (
        <div className="flex gap-2 pt-0.5">
          <button
            onClick={() => setShowShortRest(true)}
            className="flex-1 text-xs text-slate-400 py-1.5 rounded-lg bg-slate-700/50 hover:bg-slate-700 transition-colors"
          >
            Short Rest
          </button>
          <button
            onClick={() => longRest(character.id)}
            className="flex-1 text-xs text-amber-400 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 transition-colors"
          >
            Long Rest
          </button>
        </div>
      )}
    </div>
  );
}

registerWidget({
  typeId: 'hp-tracker',
  label: 'HP Tracker',
  icon: 'favorite',
  defaultConfig: {},
  defaultSpan: 2,
  component: HpTrackerWidget,
});
