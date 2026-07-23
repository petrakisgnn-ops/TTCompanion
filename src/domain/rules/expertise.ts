/**
 * How many Expertise picks a class has by a given level (2014 PHB). Expertise doubles the
 * proficiency bonus of a chosen proficient skill. Only Rogue and Bard grant it in the core
 * rules: Rogue at levels 1 and 6, Bard at levels 3 and 10 (2 each). Returns 0 for every other
 * class. (Rogue's thieves'-tools option isn't modeled — the app tracks skill expertise only.)
 */
export function expertiseCount(className: string, level: number): number {
  switch (className.toLowerCase()) {
    case 'rogue': return level >= 6 ? 4 : level >= 1 ? 2 : 0;
    case 'bard':  return level >= 10 ? 4 : level >= 3 ? 2 : 0;
    default:      return 0;
  }
}
