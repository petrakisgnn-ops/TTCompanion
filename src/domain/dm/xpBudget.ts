import type { CrValue } from '../reference/types';
import { crStr } from '../reference/types';

// XP thresholds per character level [Easy, Medium, Hard, Deadly]
const XP_THRESHOLDS: readonly number[][] = [
  [25, 50, 75, 100], [50, 100, 150, 200], [75, 150, 225, 400], [125, 250, 375, 500],
  [250, 500, 750, 1100], [300, 600, 900, 1400], [350, 750, 1100, 1700], [450, 900, 1400, 2100],
  [550, 1100, 1600, 2400], [600, 1200, 1900, 2800], [800, 1600, 2400, 3600], [1000, 2000, 3000, 4500],
  [1100, 2200, 3400, 5100], [1250, 2500, 3800, 5700], [1400, 2800, 4300, 6400], [1600, 3200, 4800, 7200],
  [2000, 3900, 5900, 8800], [2100, 4200, 6300, 9500], [2400, 4900, 7300, 10900], [2800, 5700, 8500, 12700],
];

const CR_XP: Record<string, number> = {
  '0': 10, '1/8': 25, '1/4': 50, '1/2': 100,
  '1': 200, '2': 450, '3': 700, '4': 1100, '5': 1800,
  '6': 2300, '7': 2900, '8': 3900, '9': 5000, '10': 5900,
  '11': 7200, '12': 8400, '13': 10000, '14': 11500, '15': 13000,
  '16': 15000, '17': 18000, '18': 20000, '19': 22000, '20': 25000,
  '21': 33000, '22': 41000, '23': 50000, '24': 62000, '30': 155000,
};

export const monsterXp = (cr: CrValue | undefined | null): number => CR_XP[crStr(cr)] ?? 0;

const xpMultiplier = (count: number): number => {
  if (count === 1) return 1;
  if (count === 2) return 1.5;
  if (count <= 6) return 2;
  if (count <= 10) return 2.5;
  if (count <= 14) return 3;
  return 4;
};

export const DIFFICULTY_LABELS = ['Easy', 'Medium', 'Hard', 'Deadly'] as const;

export interface EncounterDifficulty {
  budget: number[];
  adjustedXp: number;
  difficultyIndex: number; // -1 = trivial
}

/** Party XP budget vs. a proposed set of monsters — DMG-style encounter difficulty math. */
export function computeDifficulty(
  partyLevels: number[],
  monsters: { cr: CrValue; count: number }[],
): EncounterDifficulty {
  const budget = [0, 0, 0, 0];
  for (const lvl of partyLevels) {
    const thresholds = XP_THRESHOLDS[Math.min(Math.max(lvl, 1), 20) - 1];
    for (let i = 0; i < 4; i++) budget[i] += thresholds[i];
  }

  const totalBaseXp = monsters.reduce((sum, m) => sum + monsterXp(m.cr) * m.count, 0);
  const totalCount = monsters.reduce((sum, m) => sum + m.count, 0);
  const adjustedXp = Math.round(totalBaseXp * xpMultiplier(totalCount));

  let difficultyIndex = -1;
  if (adjustedXp >= budget[3]) difficultyIndex = 3;
  else if (adjustedXp >= budget[2]) difficultyIndex = 2;
  else if (adjustedXp >= budget[1]) difficultyIndex = 1;
  else if (adjustedXp >= budget[0]) difficultyIndex = 0;

  return { budget, adjustedXp, difficultyIndex };
}
