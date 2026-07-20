import { RACE_NAME_LISTS } from './nameLists';

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Generates a plausible race-appropriate name. Falls back to a generic pool for unrecognized races. */
export function generateName(race: string): string {
  const key = race.trim().toLowerCase();
  const list = RACE_NAME_LISTS[key] ?? RACE_NAME_LISTS.generic;
  const useMiddle = Math.random() > 0.4;
  const name = pick(list.starts) + (useMiddle ? pick(list.middles) : '') + pick(list.ends);
  return capitalize(name.toLowerCase());
}
