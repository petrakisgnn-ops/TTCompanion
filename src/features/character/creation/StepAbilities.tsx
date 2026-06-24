import { useState } from 'react';
import { abilityMod } from '../../../domain/rules';
import type { WizardData } from './CharacterWizard';

const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];
const ABILITY_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const;
const ABILITY_LABELS: Record<string, string> = {
  str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA',
};
const ABILITY_NAMES: Record<string, string> = {
  str: 'Strength', dex: 'Dexterity', con: 'Constitution',
  int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma',
};

type AbilityKey = typeof ABILITY_KEYS[number];

interface StepAbilitiesProps {
  data: WizardData;
  patch: (p: Partial<WizardData>) => void;
}

type Mode = 'standard' | 'manual';

export function StepAbilities({ data, patch }: StepAbilitiesProps) {
  const [mode, setMode] = useState<Mode>('standard');
  // Track which array value is assigned to which ability (index into STANDARD_ARRAY)
  const [assignments, setAssignments] = useState<Partial<Record<AbilityKey, number>>>({});
  const [selected, setSelected] = useState<AbilityKey | null>(null);

  const usedIndices = new Set(Object.values(assignments));
  const usedKeys = new Set(Object.keys(assignments));

  const assign = (abilityKey: AbilityKey, arrayIndex: number) => {
    // Remove previous binding for this index
    const prev = Object.entries(assignments).find(([, i]) => i === arrayIndex)?.[0] as AbilityKey | undefined;
    const next = { ...assignments };
    if (prev) delete next[prev];
    next[abilityKey] = arrayIndex;
    setAssignments(next);
    setSelected(null);

    // Update the scores
    const scores = { ...data.abilityScores };
    if (prev) scores[prev] = 8;
    scores[abilityKey] = STANDARD_ARRAY[arrayIndex];
    patch({ abilityScores: scores });
  };

  const handleManualChange = (key: AbilityKey, raw: string) => {
    const val = parseInt(raw, 10);
    if (isNaN(val)) return;
    const clamped = Math.max(1, Math.min(30, val));
    patch({ abilityScores: { ...data.abilityScores, [key]: clamped } });
  };

  return (
    <div className="px-4 pb-6 space-y-4">
      <div>
        <h2 className="text-base font-semibold pt-3">Ability Scores</h2>
        <div className="flex gap-2 mt-2">
          {(['standard', 'manual'] as Mode[]).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                mode === m
                  ? 'bg-amber-500 text-slate-900'
                  : 'bg-[var(--color-card)] text-[var(--color-text-2)] hover:bg-[var(--color-raised)]'
              }`}
            >
              {m === 'standard' ? 'Standard Array' : 'Manual Entry'}
            </button>
          ))}
        </div>
      </div>

      {mode === 'standard' ? (
        <>
          {/* Available values */}
          <div>
            <p className="text-xs text-[var(--color-faint)] mb-2">Tap an ability, then tap a value to assign it.</p>
            <div className="flex gap-2 flex-wrap">
              {STANDARD_ARRAY.map((val, i) => {
                const taken = usedIndices.has(i);
                const active = selected !== null && assignments[selected] === i;
                return (
                  <button
                    key={i}
                    onClick={() => {
                      if (!selected || taken) return;
                      assign(selected, i);
                    }}
                    className={`w-12 h-12 rounded-xl font-bold text-base transition-colors ${
                      active
                        ? 'bg-amber-500 text-slate-900'
                        : taken
                        ? 'bg-[var(--color-raised)] text-[var(--color-faint)] cursor-default'
                        : 'bg-[var(--color-card)] text-[var(--color-text)] hover:bg-[var(--color-raised)]'
                    }`}
                  >
                    {val}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Ability slots */}
          <div className="space-y-2">
            {ABILITY_KEYS.map(key => {
              const idx = assignments[key];
              const val = idx !== undefined ? STANDARD_ARRAY[idx] : null;
              const mod = val !== null && val !== undefined ? abilityMod(val) : null;
              const isSelected = selected === key;
              const isAssigned = idx !== undefined;
              return (
                <button
                  key={key}
                  onClick={() => setSelected(isSelected ? null : key)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-left transition-colors ${
                    isSelected
                      ? 'bg-amber-500/20 ring-1 ring-amber-500'
                      : isAssigned
                      ? 'bg-[var(--color-card)]'
                      : 'bg-[var(--color-card)]/50 border border-dashed border-slate-700'
                  }`}
                >
                  <div>
                    <span className="font-mono font-bold text-amber-500 text-xs">{ABILITY_LABELS[key]}</span>
                    <span className="ml-2 text-xs text-[var(--color-muted)]">{ABILITY_NAMES[key]}</span>
                  </div>
                  <div className="text-right">
                    {val !== null && val !== undefined ? (
                      <>
                        <span className="font-bold text-base">{val}</span>
                        <span className="text-[var(--color-muted)] text-sm ml-1">
                          ({mod !== null && mod! >= 0 ? '+' : ''}{mod})
                        </span>
                      </>
                    ) : (
                      <span className="text-[var(--color-disabled)] text-sm">—</span>
                    )}
                    {!isAssigned && usedKeys.size < 6 && (
                      <div className="text-xs text-[var(--color-disabled)] mt-0.5">tap to pick</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Unassign hint */}
          {selected && assignments[selected] !== undefined && (
            <button
              onClick={() => {
                const next = { ...assignments };
                const idx = next[selected]!;
                delete next[selected];
                setAssignments(next);
                setSelected(null);
                const scores = { ...data.abilityScores, [selected]: 8 };
                patch({ abilityScores: scores });
                // suppress unused warning
                void idx;
              }}
              className="text-xs text-[var(--color-faint)] underline"
            >
              Clear {ABILITY_LABELS[selected]}
            </button>
          )}
        </>
      ) : (
        <div className="space-y-2">
          {ABILITY_KEYS.map(key => {
            const val = data.abilityScores[key];
            const mod = abilityMod(val);
            return (
              <div key={key} className="flex items-center gap-3 bg-[var(--color-card)] rounded-xl px-4 py-2">
                <span className="font-mono font-bold text-amber-500 text-xs w-8">{ABILITY_LABELS[key]}</span>
                <span className="text-xs text-[var(--color-muted)] flex-1">{ABILITY_NAMES[key]}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleManualChange(key, String(val - 1))}
                    className="w-8 h-8 rounded-lg bg-[var(--color-raised)] font-bold hover:bg-[var(--color-card-inner)]"
                  >
                    −
                  </button>
                  <span className="w-8 text-center font-bold">{val}</span>
                  <button
                    onClick={() => handleManualChange(key, String(val + 1))}
                    className="w-8 h-8 rounded-lg bg-[var(--color-raised)] font-bold hover:bg-[var(--color-card-inner)]"
                  >
                    +
                  </button>
                  <span className="text-[var(--color-muted)] text-sm w-8 text-right">
                    {mod >= 0 ? '+' : ''}{mod}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
