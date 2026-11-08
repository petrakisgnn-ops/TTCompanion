import { useState } from 'react';
import { Sheet } from '../../ui/Sheet';
import { useCharacterStore } from '../../stores/characterStore';
import { effectiveMaxHp } from '../../domain/rules/hitPoints';
import type { Character } from '../../domain/character/types';

interface MaxHpSheetProps {
  character: Character;
  onClose: () => void;
}

const QUICK = [
  { label: 'Aid +5', value: 5 },
  { label: 'Aid +10', value: 10 },
  { label: 'Aid +15', value: 15 },
];

const signed = (n: number) => (n > 0 ? `+${n}` : String(n));

/**
 * Edit a character's maximum HP: a temporary adjustment (Aid, Heroes' Feast, a curse, Life
 * Drain) kept apart from the permanent maximum, plus a way to correct the permanent number.
 * Opened from the sheet's HP tracker, the HP widget and the Party list.
 */
export function MaxHpSheet({ character, onClose }: MaxHpSheetProps) {
  const { setMaxHpModifier, setMaxHpNote, setBaseMaxHp } = useCharacterStore();
  const { hp } = character;
  const modifier = hp.maxModifier ?? 0;
  const [baseText, setBaseText] = useState(String(hp.max));
  const [noteText, setNoteText] = useState(hp.maxModifierNote ?? '');

  const baseValue = Number(baseText);
  const baseValid = baseText.trim() !== '' && Number.isFinite(baseValue) && baseValue >= 1;
  const setMod = (n: number, note?: string) => {
    if (n === 0) setNoteText('');
    else if (note !== undefined) setNoteText(note);
    void setMaxHpModifier(character.id, n, note);
  };
  const saveNote = (text: string) => { setNoteText(text); void setMaxHpNote(character.id, text); };

  return (
    <Sheet icon="favorite" title="Max Hit Points" onClose={onClose}>
      <div className="space-y-5">
        {/* Current picture */}
        <div className="flex items-end justify-between bg-[var(--color-raised)] rounded-xl px-4 py-3">
          <div>
            <p className="text-xs text-[var(--color-faint)] uppercase tracking-wide font-semibold">Max HP now</p>
            <p className="text-3xl font-bold">{effectiveMaxHp(hp)}</p>
          </div>
          <p className="text-sm text-[var(--color-muted)] text-right">
            {hp.max} base
            {modifier !== 0 && (
              <span className={modifier > 0 ? 'text-emerald-400' : 'text-red-400'}> {signed(modifier)} {hp.maxModifierNote ?? 'temporary'}</span>
            )}
            <span className="block text-xs text-[var(--color-faint)]">Current {hp.current}</span>
          </p>
        </div>

        {/* Temporary adjustment */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wide">Temporary change</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMod(modifier - 1)}
              className="w-12 h-12 rounded-xl bg-[var(--color-raised)] text-xl font-bold"
              aria-label="Lower max HP by 1"
            >−</button>
            <span className={`flex-1 text-center text-2xl font-bold ${
              modifier > 0 ? 'text-emerald-400' : modifier < 0 ? 'text-red-400' : ''
            }`}>
              {modifier === 0 ? '0' : signed(modifier)}
            </span>
            <button
              onClick={() => setMod(modifier + 1)}
              className="w-12 h-12 rounded-xl bg-[var(--color-raised)] text-xl font-bold"
              aria-label="Raise max HP by 1"
            >+</button>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {QUICK.map(q => (
              <button
                key={q.label}
                // A quick Aid pick also labels the change "Aid" unless you already wrote a source.
                onClick={() => setMod(q.value, noteText.trim() ? undefined : 'Aid')}
                className={`min-h-[44px] rounded-xl text-xs font-semibold ${
                  modifier === q.value ? 'bg-emerald-500/25 text-emerald-300' : 'bg-[var(--color-raised)] text-[var(--color-text-2)]'
                }`}
              >
                {q.label}
              </button>
            ))}
            <button
              onClick={() => setMod(0)}
              disabled={modifier === 0}
              className="min-h-[44px] rounded-xl text-xs font-semibold bg-[var(--color-raised)] text-amber-400 disabled:opacity-40"
            >
              Clear
            </button>
          </div>
          <div>
            <label htmlFor="max-hp-note" className="block text-xs text-[var(--color-muted)] mb-1">Source</label>
            <input
              id="max-hp-note"
              value={noteText}
              onChange={e => saveNote(e.target.value)}
              placeholder="e.g. Aid (3rd level), Curse of the hag, Life Drain"
              maxLength={80}
              className="w-full bg-[var(--color-raised)] rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-[var(--color-gold-lt)] placeholder:text-[var(--color-faint)]"
            />
          </div>
          <p className="text-xs text-[var(--color-faint)] leading-relaxed">
            For spells like Aid or Heroes' Feast (positive) and curses or Life Drain (negative). Raising the
            maximum also raises current HP by the same amount; lowering it caps current HP. It stays until you clear it.
          </p>
        </div>

        {/* Permanent maximum */}
        <div className="space-y-2 border-t border-[var(--color-border)] pt-4">
          <h3 className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wide">Permanent max HP</h3>
          <div className="flex gap-2">
            <input
              type="number"
              inputMode="numeric"
              min={1}
              value={baseText}
              onChange={e => setBaseText(e.target.value)}
              aria-label="Permanent max HP"
              className="flex-1 bg-[var(--color-raised)] rounded-xl px-3 py-2.5 text-lg font-semibold outline-none focus:ring-1 focus:ring-[var(--color-gold-lt)]"
            />
            <button
              onClick={() => { if (baseValid) void setBaseMaxHp(character.id, baseValue); }}
              disabled={!baseValid || baseValue === hp.max}
              className="min-h-[44px] px-5 rounded-xl bg-amber-500 text-slate-900 text-sm font-semibold disabled:opacity-40"
            >
              Save
            </button>
          </div>
          <p className="text-xs text-[var(--color-faint)] leading-relaxed">
            The maximum from creation and level-ups. Change it to fix a mistake or match rolled HP — level-ups keep adding to it.
          </p>
        </div>
      </div>
    </Sheet>
  );
}
