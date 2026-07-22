import type { GrantedSpellOption } from './grantedSpells';

const ORDINALS = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th'];

// Warlock's class-warlock.json spellsKnownProgressionFixedByLevel: at each character
// level, unlocks one fixed spell of the given level, castable once per long rest
// without expending a slot.
const THRESHOLDS: { charLevel: number; spellLevel: number }[] = [
  { charLevel: 11, spellLevel: 6 },
  { charLevel: 13, spellLevel: 7 },
  { charLevel: 15, spellLevel: 8 },
  { charLevel: 17, spellLevel: 9 },
];

/** Mystic Arcanum choice grants a Warlock has unlocked at the given class level — one per unlocked spell level, each "pick 1 from the Warlock list, 1/long rest". */
export function mysticArcanumOptions(warlockLevel: number): GrantedSpellOption[] {
  return THRESHOLDS
    .filter(t => warlockLevel >= t.charLevel)
    .map(t => ({
      kind: 'choice',
      query: { levels: [t.spellLevel], classFilter: ['Warlock'] },
      count: 1,
      grantedBy: `Mystic Arcanum (${ORDINALS[t.spellLevel - 1]} level)`,
      innate: true,
      dailyUses: 1,
      resetOn: 'longRest',
    }));
}
