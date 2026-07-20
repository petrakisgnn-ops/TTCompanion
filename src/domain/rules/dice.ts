/** Rolls `count` dice of `sides` faces each, returning the individual results. */
export function rollDice(count: number, sides: number): number[] {
  return Array.from({ length: count }, () => 1 + Math.floor(Math.random() * sides));
}
