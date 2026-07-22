/**
 * Race `speed` in the dump is either a plain number or `{walk, fly?, swim?, climb?}`;
 * a subrace may carry its own value that overrides the base race (Wood Elf 35 over
 * Elf 30). Class-feature speed bonuses (Monk's Unarmored Movement, Barbarian's Fast
 * Movement) are prose features and are not applied here.
 */
export function resolveWalkSpeed(raceSpeed: unknown, subraceSpeed?: unknown): number {
  const parse = (s: unknown): number | undefined => {
    if (typeof s === 'number') return s;
    if (s && typeof s === 'object' && typeof (s as { walk?: unknown }).walk === 'number') {
      return (s as { walk: number }).walk;
    }
    return undefined;
  };
  return parse(subraceSpeed) ?? parse(raceSpeed) ?? 30;
}
