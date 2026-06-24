import { useState } from 'react';
import { useCharacterStore } from '../../../stores/characterStore';
import type { Character } from '../../../domain/character/types';
import { getClassData } from '../../../domain/rules/classData';
import { abilityMod, totalLevel } from '../../../domain/rules';

export interface ShortRestPanelProps {
  character: Character;
  onDone: () => void;
}

export function ShortRestPanel({ character, onDone }: ShortRestPanelProps) {
  const { spendHitDie, shortRest } = useCharacterStore();
  const [lastRoll, setLastRoll] = useState<number | null>(null);

  const level = totalLevel(character.classes);
  const spent = character.hitDiceSpent ?? 0;
  const available = level - spent;

  const hitDice = character.classes.map(cl => ({
    label: cl.classRef.name,
    die: getClassData(cl.classRef.name)?.hitDie ?? 8,
    count: cl.level,
  }));

  const conMod = abilityMod(character.abilityScores.con);
  const atMax = character.hp.current >= character.hp.max;

  const roll = (die: number) => {
    const rolled = Math.floor(Math.random() * die) + 1;
    const total = Math.max(1, rolled + conMod);
    setLastRoll(total);
    spendHitDie(character.id, total);
  };

  const finish = () => {
    shortRest(character.id);
    onDone();
  };

  return (
    <div className="border-t border-[var(--color-border)] pt-3 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wide">Short Rest — Hit Dice</p>
        <p className="text-xs text-[var(--color-faint)]">{available}/{level} available</p>
      </div>

      {/* Per-class hit dice */}
      <div className="space-y-1.5">
        {hitDice.map(({ label, die, count }) => (
          <div key={label} className="flex items-center gap-3">
            <span className="text-xs text-[var(--color-muted)] w-20 shrink-0">{label}</span>
            <span className="text-xs text-[var(--color-faint)] shrink-0">d{die} × {count}</span>
            <div className="flex-1" />
            <button
              onClick={() => roll(die)}
              disabled={available <= 0 || atMax}
              className="text-xs bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 disabled:opacity-30 disabled:cursor-not-allowed px-3 py-1.5 rounded-lg font-semibold transition-colors"
            >
              Roll d{die}
            </button>
          </div>
        ))}
      </div>

      {/* Last roll result */}
      {lastRoll !== null && (
        <div className="bg-emerald-900/20 border border-emerald-500/20 rounded-lg px-3 py-2 text-center">
          <span className="text-emerald-400 font-bold text-lg">+{lastRoll}</span>
          <span className="text-xs text-[var(--color-faint)] ml-2">
            HP recovered (roll + CON {conMod >= 0 ? '+' : ''}{conMod})
          </span>
        </div>
      )}

      {atMax && (
        <p className="text-xs text-[var(--color-faint)] text-center">Already at full HP</p>
      )}

      {available <= 0 && (
        <p className="text-xs text-amber-500 text-center">No hit dice remaining — recover half on long rest</p>
      )}

      <div className="flex gap-2 pt-1">
        <button
          onClick={onDone}
          className="flex-1 text-xs text-[var(--color-muted)] hover:text-[var(--color-text)] py-2 rounded-lg border border-[var(--color-border)] transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={finish}
          className="flex-1 text-xs font-semibold text-slate-900 bg-amber-500 hover:bg-amber-400 py-2 rounded-lg transition-colors"
        >
          Finish Short Rest
        </button>
      </div>
    </div>
  );
}
