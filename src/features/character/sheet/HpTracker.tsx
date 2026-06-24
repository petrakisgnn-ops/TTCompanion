import { useState } from 'react';
import { useCharacterStore } from '../../../stores/characterStore';
import type { Character } from '../../../domain/character/types';
import { totalLevel } from '../../../domain/rules';
import { ShortRestPanel } from './ShortRestPanel';

function DeathSaves({ character }: { character: Character }) {
  const { rollDeathSave, resetDeathSaves } = useCharacterStore();
  const ds = character.deathSaves ?? { successes: 0, failures: 0 };
  const isDead = ds.failures >= 3;

  return (
    <div className="border-t border-[var(--color-border)] pt-3 space-y-2">
      {isDead ? (
        <p className="text-center text-red-400 font-semibold text-sm">Character has died (3 failures)</p>
      ) : (
        <p className="text-xs text-[var(--color-muted)] text-center font-semibold uppercase tracking-wide">Death Saves</p>
      )}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 space-y-1">
          <p className="text-xs text-emerald-400 text-center">Successes</p>
          <div className="flex justify-center gap-2">
            {[0, 1, 2].map(i => (
              <button
                key={i}
                onClick={() => rollDeathSave(character.id, true)}
                disabled={isDead}
                className={`w-7 h-7 rounded-full border-2 transition-all ${
                  i < ds.successes ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600 hover:border-emerald-500'
                }`}
              />
            ))}
          </div>
        </div>
        <div className="flex-1 space-y-1">
          <p className="text-xs text-red-400 text-center">Failures</p>
          <div className="flex justify-center gap-2">
            {[0, 1, 2].map(i => (
              <button
                key={i}
                onClick={() => rollDeathSave(character.id, false)}
                disabled={isDead}
                className={`w-7 h-7 rounded-full border-2 transition-all ${
                  i < ds.failures ? 'bg-red-500 border-red-500' : 'border-slate-600 hover:border-red-500'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
      <button
        onClick={() => resetDeathSaves(character.id)}
        className="w-full text-xs text-[var(--color-faint)] hover:text-[var(--color-text-2)] py-1"
      >
        Reset saves (stabilized)
      </button>
    </div>
  );
}


interface HpTrackerProps {
  character: Character;
}

export function HpTracker({ character }: HpTrackerProps) {
  const { updateHp, setTempHp, longRest } = useCharacterStore();
  const [inputVal, setInputVal] = useState('');
  const [mode, setMode] = useState<'heal' | 'damage'>('damage');
  const [showShortRest, setShowShortRest] = useState(false);

  const id = character.id;
  const { current, max, temp } = character.hp;
  const level = totalLevel(character.classes);
  const hitDiceAvailable = level - (character.hitDiceSpent ?? 0);

  const apply = () => {
    const n = parseInt(inputVal, 10);
    if (isNaN(n) || n <= 0) return;
    updateHp(id, mode === 'heal' ? n : -n);
    setInputVal('');
  };

  const pct = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;
  const barColor = pct > 60 ? 'bg-emerald-500' : pct > 25 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className="bg-[var(--color-card)] rounded-xl p-4 space-y-3">
      <div className="flex items-end justify-between">
        <div>
          <span className="text-4xl font-bold">{current}</span>
          <span className="text-[var(--color-muted)] text-lg">/{max}</span>
          {temp > 0 && (
            <span className="ml-2 text-sky-400 font-semibold text-sm">+{temp} tmp</span>
          )}
        </div>
        <div className="text-right">
          <span className="text-xs text-[var(--color-faint)] uppercase tracking-wide font-semibold block">HP</span>
          <span className="text-xs text-[var(--color-disabled)]">{hitDiceAvailable}/{level} HD</span>
        </div>
      </div>

      {/* HP bar */}
      <div className="h-2 bg-[var(--color-raised)] rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
      </div>

      {/* Heal / Damage input */}
      <div className="flex gap-2">
        <div className="flex rounded-lg overflow-hidden border border-[var(--color-border)]">
          {(['damage', 'heal'] as const).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                mode === m
                  ? m === 'damage' ? 'bg-red-500/30 text-red-400' : 'bg-emerald-500/30 text-emerald-400'
                  : 'text-[var(--color-faint)] hover:text-[var(--color-text-2)]'
              }`}
            >
              {m === 'damage' ? 'Damage' : 'Heal'}
            </button>
          ))}
        </div>
        <input
          type="number"
          min={1}
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && apply()}
          placeholder="Amount"
          className="flex-1 bg-[var(--color-raised)] rounded-lg px-3 py-1.5 text-sm outline-none outline-none focus:ring-1 focus:ring-[var(--color-gold-lt)] placeholder:text-[var(--color-faint)]"
        />
        <button
          onClick={apply}
          className="px-4 py-1.5 rounded-lg bg-[var(--color-raised)] text-sm font-semibold hover:bg-[var(--color-card-inner)] active:scale-95 transition-all"
        >
          Apply
        </button>
      </div>

      {/* Quick HP adjusters */}
      <div className="flex gap-2">
        {[-10, -5, -1, '+1', '+5', '+10'].map(v => {
          const num = typeof v === 'string' ? parseInt(v, 10) : v;
          return (
            <button
              key={v}
              onClick={() => updateHp(id, num)}
              className="flex-1 py-2 rounded-lg bg-[var(--color-raised)] text-xs font-semibold hover:bg-[var(--color-card-inner)] active:scale-95 transition-all"
            >
              {num > 0 ? `+${num}` : num}
            </button>
          );
        })}
      </div>

      {/* Death saves — shown when at 0 HP */}
      {current === 0 && <DeathSaves character={character} />}

      {/* Short rest panel or rest buttons */}
      {showShortRest ? (
        <ShortRestPanel character={character} onDone={() => setShowShortRest(false)} />
      ) : (
        <div className="flex items-center gap-2 pt-1 border-t border-[var(--color-border)]">
          {/* Temp HP */}
          <span className="text-xs text-[var(--color-muted)] shrink-0">Temp HP</span>
          <input
            type="number"
            min={0}
            value={temp || ''}
            placeholder="0"
            onChange={e => setTempHp(id, parseInt(e.target.value, 10) || 0)}
            className="w-16 bg-[var(--color-raised)] rounded-lg px-2 py-1 text-sm text-center outline-none focus:ring-1 focus:ring-sky-500"
          />
          <div className="flex-1 flex gap-2 justify-end">
            <button
              onClick={() => setShowShortRest(true)}
              className="text-xs text-[var(--color-muted)] hover:text-[var(--color-text)] px-2 py-1 rounded bg-[var(--color-raised)] hover:bg-[var(--color-card-inner)] transition-colors"
            >
              Short Rest
            </button>
            <button
              onClick={() => longRest(id)}
              className="text-xs text-amber-400 hover:text-amber-300 px-2 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 transition-colors"
            >
              Long Rest
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
