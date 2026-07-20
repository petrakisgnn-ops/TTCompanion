import { useState } from 'react';
import { useCharacterStore } from '../../../stores/characterStore';
import type { Character, Personality, Appearance } from '../../../domain/character/types';

const ALIGNMENTS = ['LG', 'NG', 'CG', 'LN', 'N', 'CN', 'LE', 'NE', 'CE'];
const ALIGNMENT_LABELS: Record<string, string> = {
  LG: 'Lawful Good', NG: 'Neutral Good', CG: 'Chaotic Good',
  LN: 'Lawful Neutral', N: 'True Neutral', CN: 'Chaotic Neutral',
  LE: 'Lawful Evil', NE: 'Neutral Evil', CE: 'Chaotic Evil',
};

const PERSONALITY_FIELDS: { key: keyof Personality; label: string }[] = [
  { key: 'trait', label: 'Personality Trait' },
  { key: 'ideal', label: 'Ideal' },
  { key: 'bond', label: 'Bond' },
  { key: 'flaw', label: 'Flaw' },
];

const APPEARANCE_FIELDS: { key: keyof Appearance; label: string }[] = [
  { key: 'age', label: 'Age' }, { key: 'height', label: 'Height' }, { key: 'weight', label: 'Weight' },
  { key: 'eyes', label: 'Eyes' }, { key: 'skin', label: 'Skin' }, { key: 'hair', label: 'Hair' },
];

interface IdentitySectionProps { character: Character }

export function IdentitySection({ character }: IdentitySectionProps) {
  const { mutate } = useCharacterStore();
  const [editing, setEditing] = useState(false);
  const [personality, setPersonality] = useState<Personality>(character.personality);
  const [appearance, setAppearance] = useState<Appearance>(character.appearance);

  const startEdit = () => {
    setPersonality(character.personality);
    setAppearance(character.appearance);
    setEditing(true);
  };

  const save = () => {
    mutate(character.id, c => ({ ...c, personality, appearance }));
    setEditing(false);
  };

  const setAlignment = (a: string) => {
    mutate(character.id, c => ({ ...c, alignment: c.alignment === a ? null : a }));
  };

  const hasAnyText = Object.values(character.personality).some(Boolean) || Object.values(character.appearance).some(Boolean);

  return (
    <div className="bg-[var(--color-card)] rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wide">Identity</h3>
        {editing ? (
          <div className="flex gap-3">
            <button onClick={() => setEditing(false)} className="text-xs text-[var(--color-muted)] hover:text-[var(--color-text)]">Cancel</button>
            <button onClick={save} className="text-xs font-semibold text-amber-400 hover:text-amber-300">Save</button>
          </div>
        ) : (
          <button onClick={startEdit} className="text-xs text-amber-500 hover:text-amber-400">Edit</button>
        )}
      </div>

      {/* Alignment — tap to set/clear, immediate */}
      <div>
        <p className="text-xs text-[var(--color-faint)] mb-1.5">Alignment</p>
        <div className="grid grid-cols-3 gap-1.5">
          {ALIGNMENTS.map(a => (
            <button
              key={a}
              onClick={() => setAlignment(a)}
              className={`py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                character.alignment === a
                  ? 'bg-amber-500 text-slate-900'
                  : 'bg-[var(--color-raised)] text-[var(--color-text-2)] hover:bg-[var(--color-card-inner)]'
              }`}
            >
              {ALIGNMENT_LABELS[a]}
            </button>
          ))}
        </div>
      </div>

      {editing ? (
        <>
          <div className="space-y-2">
            {PERSONALITY_FIELDS.map(({ key, label }) => (
              <div key={key}>
                <label className="text-xs text-[var(--color-faint)] mb-1 block">{label}</label>
                <textarea
                  value={personality[key]}
                  onChange={e => setPersonality(p => ({ ...p, [key]: e.target.value }))}
                  rows={2}
                  className="w-full bg-[var(--color-raised)] rounded-lg px-3 py-2 text-sm outline-none resize-none focus:ring-1 focus:ring-[var(--color-gold-lt)]"
                />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {APPEARANCE_FIELDS.map(({ key, label }) => (
              <input
                key={key}
                placeholder={label}
                value={appearance[key]}
                onChange={e => setAppearance(a => ({ ...a, [key]: e.target.value }))}
                className="w-full bg-[var(--color-raised)] rounded-lg px-3 py-2 text-sm outline-none placeholder:text-[var(--color-disabled)] focus:ring-1 focus:ring-[var(--color-gold-lt)]"
              />
            ))}
          </div>
        </>
      ) : hasAnyText ? (
        <div className="space-y-2 text-sm">
          {PERSONALITY_FIELDS.filter(f => character.personality[f.key]).map(({ key, label }) => (
            <p key={key}><span className="text-[var(--color-faint)]">{label}: </span>{character.personality[key]}</p>
          ))}
          {Object.values(character.appearance).some(Boolean) && (
            <p className="text-[var(--color-text-2)]">
              {APPEARANCE_FIELDS.filter(f => character.appearance[f.key]).map(f => `${f.label} ${character.appearance[f.key]}`).join(' · ')}
            </p>
          )}
        </div>
      ) : (
        <p className="text-xs text-[var(--color-disabled)]">No personality or appearance details yet.</p>
      )}
    </div>
  );
}
