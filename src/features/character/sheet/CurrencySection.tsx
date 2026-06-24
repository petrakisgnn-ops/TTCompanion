import { useState } from 'react';
import { useCharacterStore } from '../../../stores/characterStore';
import type { Character, Currency } from '../../../domain/character/types';

const COINS: { key: keyof Currency; label: string; color: string }[] = [
  { key: 'pp', label: 'PP', color: 'text-[var(--color-text-2)]' },
  { key: 'gp', label: 'GP', color: 'text-amber-400' },
  { key: 'ep', label: 'EP', color: 'text-[var(--color-muted)]' },
  { key: 'sp', label: 'SP', color: 'text-[var(--color-muted)]' },
  { key: 'cp', label: 'CP', color: 'text-orange-400' },
];

// Standard 5e conversion to GP
const TO_GP: Record<keyof Currency, number> = {
  pp: 10, gp: 1, ep: 0.5, sp: 0.1, cp: 0.01,
};

interface CurrencySectionProps { character: Character }

export function CurrencySection({ character }: CurrencySectionProps) {
  const { setCurrency } = useCharacterStore();
  const currency = character.currency ?? { pp: 0, gp: 0, ep: 0, sp: 0, cp: 0 };
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Currency>(currency);

  const totalGp = COINS.reduce((sum, c) => sum + (currency[c.key] * TO_GP[c.key]), 0);

  const startEdit = () => { setDraft({ ...currency }); setEditing(true); };

  const save = () => {
    setCurrency(character.id, draft);
    setEditing(false);
  };

  const patch = (key: keyof Currency, raw: string) => {
    const val = Math.max(0, parseInt(raw, 10) || 0);
    setDraft(d => ({ ...d, [key]: val }));
  };

  return (
    <div className="bg-[var(--color-card)] rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wide">Currency</h3>
        {editing ? (
          <div className="flex gap-3">
            <button onClick={() => setEditing(false)} className="text-xs text-[var(--color-muted)] hover:text-[var(--color-text)]">Cancel</button>
            <button onClick={save} className="text-xs font-semibold text-amber-400 hover:text-amber-300">Save</button>
          </div>
        ) : (
          <button onClick={startEdit} className="text-xs text-amber-500 hover:text-amber-400">Edit</button>
        )}
      </div>

      {editing ? (
        <div className="grid grid-cols-5 gap-2">
          {COINS.map(({ key, label, color }) => (
            <div key={key} className="flex flex-col items-center gap-1">
              <label className={`text-xs font-bold ${color}`}>{label}</label>
              <input
                type="number"
                min={0}
                value={draft[key] || ''}
                placeholder="0"
                onChange={e => patch(key, e.target.value)}
                className="w-full bg-[var(--color-raised)] rounded-lg px-1 py-1.5 text-sm text-center outline-none outline-none focus:ring-1 focus:ring-[var(--color-gold-lt)] placeholder:text-[var(--color-disabled)]"
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-5 gap-2">
          {COINS.map(({ key, label, color }) => (
            <div key={key} className="flex flex-col items-center gap-0.5 bg-[var(--color-raised)]/50 rounded-xl py-2.5">
              <span className={`text-base font-bold leading-none ${color}`}>
                {currency[key]}
              </span>
              <span className="text-xs text-[var(--color-faint)] mt-1">{label}</span>
            </div>
          ))}
        </div>
      )}

      {!editing && (
        <p className="text-xs text-[var(--color-disabled)] text-right">
          ≈ {totalGp % 1 === 0 ? totalGp : totalGp.toFixed(1)} gp total
        </p>
      )}
    </div>
  );
}
