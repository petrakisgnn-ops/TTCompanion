import { useEffect, useState } from 'react';
import { abilityMod } from '../../../domain/rules';
import type { WizardData } from './CharacterWizard';
import { useSettingsStore } from '../../../stores/settingsStore';
import { buildRaceOptions, type RawRace, type RawSubrace } from '../../../domain/reference/races';
import {
  parseFixedAndChoose, mergeRaceAbilityGrants, parseBackgroundAbilityPatterns,
  type RaceAbilityGrant, type AbilityPattern, type AbilityKey,
} from '../../../domain/rules/abilityBonus';
import { rollAbilityScores, type AbilityRollResult } from '../../../domain/rules/abilityRoll';
import type { AbilityScores } from '../../../domain/character/types';
import { AsiChoicesSection } from './AsiChoicesSection';

const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];
const ABILITY_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const;
const ABILITY_LABELS: Record<string, string> = {
  str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA',
};
const ABILITY_NAMES: Record<string, string> = {
  str: 'Strength', dex: 'Dexterity', con: 'Constitution',
  int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma',
};

interface StepAbilitiesProps {
  data: WizardData;
  patch: (p: Partial<WizardData>) => void;
}

type Mode = 'standard' | 'roll' | 'manual';

const NO_GRANT: RaceAbilityGrant = { fixed: {} };

export function StepAbilities({ data, patch }: StepAbilitiesProps) {
  const { edition } = useSettingsStore();
  const [mode, setMode] = useState<Mode>('standard');
  // Track which pool value is assigned to which ability (index into the active pool —
  // STANDARD_ARRAY, or this attempt's rolled results).
  const [assignments, setAssignments] = useState<Partial<Record<AbilityKey, number>>>({});
  const [selected, setSelected] = useState<AbilityKey | null>(null);

  // 4d6-drop-lowest rolled pool (roll mode only)
  const [rolls, setRolls] = useState<AbilityRollResult[] | null>(null);

  const rollDice = () => {
    setRolls(rollAbilityScores().sort((a, b) => b.total - a.total));
    setAssignments({});
    setSelected(null);
    patch({ abilityScores: { str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 } });
  };

  const switchMode = (m: Mode) => {
    if (m === mode) return;
    setMode(m);
    setAssignments({});
    setSelected(null);
    if (m !== 'roll') {
      patch({ abilityScores: { str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 } });
    }
  };

  const pool = mode === 'standard' ? STANDARD_ARRAY : mode === 'roll' ? (rolls?.map(r => r.total) ?? []) : null;

  // 5e: race/subrace-derived ability grant
  const [raceGrant, setRaceGrant] = useState<RaceAbilityGrant>(NO_GRANT);
  const [chosenAbilities, setChosenAbilities] = useState<AbilityKey[]>([]);

  // 5.5e: background-derived ability patterns
  const [bgPatterns, setBgPatterns] = useState<AbilityPattern[]>([]);
  const [patternIndex, setPatternIndex] = useState<number | null>(null);
  const [weightAssignment, setWeightAssignment] = useState<Partial<Record<AbilityKey, number>>>({});

  const usedIndices = new Set(Object.values(assignments));
  const usedKeys = new Set(Object.keys(assignments));

  // Fetch the race/subrace ability grant (5e only)
  useEffect(() => {
    if (edition !== '5e' || !data.raceRef) { setRaceGrant(NO_GRANT); return; }
    fetch(`${import.meta.env.BASE_URL}data/races.json`)
      .then(r => r.json())
      .then((json: { race: RawRace[]; subrace: RawSubrace[] }) => {
        const options = buildRaceOptions(json.race, json.subrace);
        const opt = data.subraceRef
          ? options.find(o => o.subraceName === data.subraceRef!.name && o.subraceSource === data.subraceRef!.source)
          : options.find(o => !o.subraceName && o.raceName === data.raceRef!.name && o.raceSource === data.raceRef!.source);
        if (!opt) { setRaceGrant(NO_GRANT); return; }
        const grant = mergeRaceAbilityGrants(
          parseFixedAndChoose(opt.raceAbility),
          opt.subraceAbility ? parseFixedAndChoose(opt.subraceAbility) : NO_GRANT,
        );
        setRaceGrant(grant);
      });
  }, [edition, data.raceRef?.name, data.raceRef?.source, data.subraceRef?.name, data.subraceRef?.source]);

  // Fetch the background ability patterns (5.5e only)
  useEffect(() => {
    if (edition !== '5.5e' || !data.backgroundRef) { setBgPatterns([]); return; }
    fetch(`${import.meta.env.BASE_URL}data/backgrounds.json`)
      .then(r => r.json())
      .then((json: { background: { name: string; source: string; ability?: unknown }[] }) => {
        const bg = json.background.find(
          b => b.name === data.backgroundRef!.name && b.source === data.backgroundRef!.source,
        );
        setBgPatterns(parseBackgroundAbilityPatterns(bg?.ability));
      });
  }, [edition, data.backgroundRef?.name, data.backgroundRef?.source]);

  // Resolve + patch the combined bonus whenever its inputs change
  useEffect(() => {
    let bonus: Partial<AbilityScores> = {};
    if (edition === '5e') {
      bonus = { ...raceGrant.fixed };
      if (raceGrant.choose) {
        for (const key of chosenAbilities) bonus[key] = (bonus[key] ?? 0) + raceGrant.choose.amount;
      }
    } else {
      const pattern = patternIndex !== null ? bgPatterns[patternIndex] : null;
      if (pattern) {
        const isFlat = pattern.weights.every(w => w === pattern.weights[0]);
        if (isFlat) {
          for (const key of pattern.from) bonus[key] = pattern.weights[0];
        } else {
          bonus = { ...weightAssignment };
        }
      }
    }
    patch({ abilityBonus: bonus });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edition, raceGrant, chosenAbilities, bgPatterns, patternIndex, weightAssignment]);

  const toggleChosenAbility = (key: AbilityKey) => {
    if (!raceGrant.choose) return;
    if (chosenAbilities.includes(key)) {
      setChosenAbilities(chosenAbilities.filter(k => k !== key));
      return;
    }
    if (chosenAbilities.length >= raceGrant.choose.count) return;
    setChosenAbilities([...chosenAbilities, key]);
  };

  const toggleWeight = (key: AbilityKey, pattern: AbilityPattern) => {
    if (weightAssignment[key] !== undefined) {
      const next = { ...weightAssignment };
      delete next[key];
      setWeightAssignment(next);
      return;
    }
    const weightsDesc = [...new Set(pattern.weights)].sort((a, b) => b - a);
    const used = new Set(Object.values(weightAssignment));
    const nextWeight = weightsDesc.find(w => !used.has(w));
    if (nextWeight === undefined) return;
    setWeightAssignment({ ...weightAssignment, [key]: nextWeight });
  };

  const selectPattern = (idx: number) => {
    setPatternIndex(idx);
    setWeightAssignment({});
  };

  const bonusFor = (key: AbilityKey): number => {
    if (edition === '5e') {
      const chosenAmount = raceGrant.choose && chosenAbilities.includes(key) ? raceGrant.choose.amount : 0;
      return (raceGrant.fixed[key] ?? 0) + chosenAmount;
    }
    const pattern = patternIndex !== null ? bgPatterns[patternIndex] : null;
    if (!pattern) return 0;
    const isFlat = pattern.weights.every(w => w === pattern.weights[0]);
    if (isFlat) return pattern.from.includes(key) ? pattern.weights[0] : 0;
    return weightAssignment[key] ?? 0;
  };

  const assign = (abilityKey: AbilityKey, arrayIndex: number) => {
    if (!pool) return;
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
    scores[abilityKey] = pool[arrayIndex];
    patch({ abilityScores: scores });
  };

  const handleManualChange = (key: AbilityKey, raw: string) => {
    const val = parseInt(raw, 10);
    if (isNaN(val)) return;
    const clamped = Math.max(1, Math.min(30, val));
    patch({ abilityScores: { ...data.abilityScores, [key]: clamped } });
  };

  const hasBonusUi = edition === '5e'
    ? Object.keys(raceGrant.fixed).length > 0 || !!raceGrant.choose
    : bgPatterns.length > 0;

  return (
    <div className="px-4 pb-6 space-y-4">
      {hasBonusUi && (
        <div>
          <h2 className="text-base font-semibold pt-3">Ability Bonus</h2>

          {edition === '5e' ? (
            <div className="mt-2 space-y-3">
              {Object.keys(raceGrant.fixed).length > 0 && (
                <div>
                  <p className="text-xs text-[var(--color-faint)] mb-1.5 uppercase tracking-wide font-semibold">
                    From race (automatic)
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {ABILITY_KEYS.filter(k => raceGrant.fixed[k]).map(k => (
                      <span key={k} className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        {ABILITY_LABELS[k]} +{raceGrant.fixed[k]}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {raceGrant.choose && (
                <div>
                  <p className="text-xs text-[var(--color-faint)] mb-1.5 uppercase tracking-wide font-semibold">
                    Choose {raceGrant.choose.count} for +{raceGrant.choose.amount} each
                    {' '}({raceGrant.choose.count - chosenAbilities.length} remaining)
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {raceGrant.choose.from.map(k => {
                      const picked = chosenAbilities.includes(k);
                      const atMax = !picked && chosenAbilities.length >= raceGrant.choose!.count;
                      return (
                        <button
                          key={k}
                          onClick={() => toggleChosenAbility(k)}
                          disabled={atMax}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                            picked
                              ? 'bg-amber-500 text-slate-900'
                              : atMax
                              ? 'bg-[var(--color-card)] text-[var(--color-disabled)] cursor-not-allowed'
                              : 'bg-[var(--color-card)] text-[var(--color-text-2)] hover:bg-[var(--color-raised)]'
                          }`}
                        >
                          {ABILITY_LABELS[k]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-2 space-y-3">
              <div className="flex gap-2">
                {bgPatterns.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => selectPattern(i)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                      patternIndex === i
                        ? 'bg-amber-500 text-slate-900'
                        : 'bg-[var(--color-card)] text-[var(--color-text-2)] hover:bg-[var(--color-raised)]'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              {patternIndex !== null && (() => {
                const pattern = bgPatterns[patternIndex];
                const isFlat = pattern.weights.every(w => w === pattern.weights[0]);
                return (
                  <div>
                    <p className="text-xs text-[var(--color-faint)] mb-1.5 uppercase tracking-wide font-semibold">
                      {isFlat ? 'Applied automatically' : 'Tap an ability to assign the next bonus'}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {pattern.from.map(k => {
                        const bonus = isFlat ? pattern.weights[0] : weightAssignment[k];
                        return (
                          <button
                            key={k}
                            onClick={() => !isFlat && toggleWeight(k, pattern)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                              bonus
                                ? 'bg-amber-500 text-slate-900'
                                : 'bg-[var(--color-card)] text-[var(--color-text-2)] hover:bg-[var(--color-raised)]'
                            }`}
                          >
                            {ABILITY_LABELS[k]}{bonus ? ` +${bonus}` : ''}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      <div>
        <h2 className="text-base font-semibold pt-3">Ability Scores</h2>
        <div className="flex gap-2 mt-2">
          {(['standard', 'roll', 'manual'] as Mode[]).map(m => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                mode === m
                  ? 'bg-amber-500 text-slate-900'
                  : 'bg-[var(--color-card)] text-[var(--color-text-2)] hover:bg-[var(--color-raised)]'
              }`}
            >
              {m === 'standard' ? 'Standard Array' : m === 'roll' ? 'Roll Dice' : 'Manual Entry'}
            </button>
          ))}
        </div>
      </div>

      {mode === 'roll' && (!rolls || rolls.length === 0) ? (
        <button
          onClick={rollDice}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm bg-amber-500 text-slate-900 hover:bg-amber-400"
        >
          🎲 Roll 4d6 (drop lowest) × 6
        </button>
      ) : mode === 'standard' || mode === 'roll' ? (
        <>
          {/* Available values */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-[var(--color-faint)]">Tap an ability, then tap a value to assign it.</p>
              {mode === 'roll' && (
                <button onClick={rollDice} className="text-xs text-amber-500 font-semibold shrink-0 ml-2">
                  🎲 Reroll all
                </button>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              {pool!.map((val, i) => {
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
            {mode === 'roll' && rolls && (
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                {rolls.map((r, i) => (
                  <span key={i} className="text-xs text-[var(--color-faint)] font-mono">
                    {r.total} = [{r.dice.join(',')}] drop {r.dropped}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Ability slots */}
          <div className="space-y-2">
            {ABILITY_KEYS.map(key => {
              const idx = assignments[key];
              const val = idx !== undefined && pool ? pool[idx] : null;
              const bonus = bonusFor(key);
              const final = val !== null ? val + bonus : null;
              const mod = final !== null ? abilityMod(final) : null;
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
                    {val !== null ? (
                      <>
                        <span className="font-bold text-base">
                          {val}{bonus > 0 ? ` +${bonus} = ${final}` : ''}
                        </span>
                        <span className="text-[var(--color-muted)] text-sm ml-1">
                          ({mod !== null && mod >= 0 ? '+' : ''}{mod})
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
            const bonus = bonusFor(key);
            const final = val + bonus;
            const mod = abilityMod(final);
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
                  {bonus > 0 && (
                    <span className="text-xs text-amber-500 font-semibold">+{bonus} = {final}</span>
                  )}
                  <span className="text-[var(--color-muted)] text-sm w-8 text-right">
                    {mod >= 0 ? '+' : ''}{mod}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Ability Score Improvements / feats earned by starting above level 1 */}
      {data.classRef && (
        <AsiChoicesSection className={data.classRef.name} level={data.level} data={data} patch={patch} />
      )}
    </div>
  );
}
