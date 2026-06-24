import type { Character } from '../character/types';

/**
 * Max spell level accessible per class level, indexed 0 = level 1.
 * Derived from the official D&D 5e spell slot tables.
 */
const FULL: number[]  = [1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,9,9];
const HALF: number[]  = [0,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5];
const PACT: number[]  = [1,1,2,2,3,3,4,4,5,5,5,5,5,5,5,5,5,5,5,5];
const THIRD: number[] = [0,0,1,1,1,1,2,2,2,2,2,2,3,3,3,3,3,3,4,4];
// Artificer is half-caster but rounds up and starts at level 1
const ARTI: number[]  = [1,1,2,2,3,3,3,3,4,4,4,4,5,5,5,5,5,5,5,5];

type Progression = 'full' | '1/2' | 'pact' | '1/3' | 'artificer';

/** Class names (lowercase) → spellcasting progression type. Non-casters are absent. */
const CLASS_PROGRESSION: Record<string, Progression> = {
  bard:       'full',
  cleric:     'full',
  druid:      'full',
  sorcerer:   'full',
  wizard:     'full',
  paladin:    '1/2',
  ranger:     '1/2',
  warlock:    'pact',
  artificer:  'artificer',
  // Subclass casters — base class may not grant spells but subclass does at level 3
  // Treat as 1/3 caster when the class name is encountered without a matching progression
};

const PROGRESSION_TABLE: Record<Progression, number[]> = {
  full: FULL, '1/2': HALF, pact: PACT, '1/3': THIRD, artificer: ARTI,
};

/**
 * Returns the highest spell level the character can cast for a given class/level combo.
 * Returns 0 if the class has no spellcasting progression.
 */
export function maxSpellLevelForClass(className: string, classLevel: number): number {
  const prog = CLASS_PROGRESSION[className.toLowerCase()];
  if (!prog) return 0;
  const idx = Math.min(Math.max(classLevel, 1), 20) - 1;
  return PROGRESSION_TABLE[prog][idx];
}

/**
 * Returns the highest spell level the character can currently cast across all their classes.
 * A cantrip-only caster returns 0 (cantrips are level 0 — always allowed).
 */
export function maxSpellLevelForCharacter(character: Character): number {
  if (character.classes.length === 0) return 0;
  return Math.max(0, ...character.classes.map(cl =>
    maxSpellLevelForClass(cl.classRef.name, cl.level),
  ));
}

export const LEVEL_LABEL = ['Cantrip', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th'] as const;
