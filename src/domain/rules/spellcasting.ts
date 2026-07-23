import type { Character } from '../character/types';
import type { Edition } from './edition';
import { getClassData, getSubclassCaster } from './classData';

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
 * A caster subclass (Eldritch Knight / Arcane Trickster) on a non-casting class counts
 * as a 1/3 progression. Returns 0 if neither class nor subclass casts.
 */
export function maxSpellLevelForClass(className: string, classLevel: number, subclassName?: string): number {
  const prog = CLASS_PROGRESSION[className.toLowerCase()]
    ?? (getSubclassCaster(subclassName) ? '1/3' as const : undefined);
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
    maxSpellLevelForClass(cl.classRef.name, cl.level, cl.subclass?.name),
  ));
}

export const LEVEL_LABEL = ['Cantrip', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th'] as const;

/**
 * Prepared casters choose a subset of a pool each day (Cleric/Druid/Paladin/Artificer
 * from their entire class list, Wizard from their own spellbook). Everyone else
 * (Bard, Sorcerer, Warlock, Ranger) has a fixed known list — known = always castable,
 * no daily prep step. Classified by class name only (2014 PHB known/prepared split);
 * doesn't fork by the app's `edition` setting.
 */
const PREPARED_CASTER_CLASSES = new Set(['cleric', 'druid', 'paladin', 'artificer', 'wizard']);

/**
 * 2024 makes every caster a *prepared* caster with a fixed "Prepared Spells" count from its class
 * table (no longer level + ability mod, and the old known-lists are gone). XPHB `Prepared Spells`
 * columns, index 0 = level 1.
 */
const PREPARED_2024: Record<string, readonly number[]> = {
  bard:      [4, 5, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 17, 17, 18, 18, 19, 20, 21, 22],
  cleric:    [4, 5, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 17, 17, 18, 18, 19, 20, 21, 22],
  druid:     [4, 5, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 17, 17, 18, 18, 19, 20, 21, 22],
  sorcerer:  [2, 4, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 17, 17, 18, 18, 19, 20, 21, 22],
  wizard:    [4, 5, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 17, 18, 19, 21, 22, 23, 24, 25],
  warlock:   [2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 11, 11, 12, 12, 13, 13, 14, 14, 15, 15],
  paladin:   [2, 3, 4, 5, 6, 6, 7, 7, 9, 9, 10, 10, 11, 11, 12, 12, 14, 14, 15, 15],
  ranger:    [2, 3, 4, 5, 6, 6, 7, 7, 9, 9, 10, 10, 11, 11, 12, 12, 14, 14, 15, 15],
  artificer: [2, 3, 4, 5, 6, 6, 7, 7, 9, 9, 10, 10, 11, 11, 12, 12, 14, 14, 15, 15],
};

export function isPreparedCaster(className: string, edition: Edition = '5e'): boolean {
  // 2024: every caster prepares; 2014: only the classic prepared-list casters.
  if (edition === '5.5e') return className.toLowerCase() in PREPARED_2024;
  return PREPARED_CASTER_CLASSES.has(className.toLowerCase());
}

/**
 * Prepared-spell cap. 2014: class level (or half for Paladin/Artificer) + ability mod, min 1.
 * 2024: the flat "Prepared Spells" table value (ability mod no longer factors in).
 */
export function maxPreparedSpells(className: string, classLevel: number, abilityMod: number, edition: Edition = '5e'): number {
  if (edition === '5.5e') {
    const table = PREPARED_2024[className.toLowerCase()];
    if (table) return table[Math.min(Math.max(classLevel, 1), 20) - 1];
  }
  const half = ['paladin', 'artificer'].includes(className.toLowerCase());
  const levelPart = half ? Math.floor(classLevel / 2) : classLevel;
  return Math.max(1, levelPart + abilityMod);
}

/**
 * True for casters with a fixed personal spell list (known = always castable, no daily
 * prep) — including subclass casters (Eldritch Knight / Arcane Trickster), who learn
 * from the Wizard list but never prepare.
 */
export function isKnownCaster(className: string, subclassName?: string, edition: Edition = '5e'): boolean {
  const classData = getClassData(className);
  if (!classData) return false;
  if (classData.spellcasting === 'none') return !!getSubclassCaster(subclassName);
  return !isPreparedCaster(className, edition);
}

// Wizard's spellbook grows by a fixed amount per level (starts with 6, then +2/level),
// independent of the general `spellsKnownTable` used by known casters — spellsKnownProgressionFixed
// in class-wizard.json. Spells learned this way may be of any level ≤ the character's max, not just
// the newly-unlocked level (spellsKnownProgressionFixedAllowLowerLevel), so the cap is cumulative.
const WIZARD_SPELLBOOK_GROWTH = [6, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2];

/**
 * Max spells a known caster (Bard/Sorcerer/Warlock/Ranger) can have known, or a Wizard's
 * spellbook capacity (cumulative growth), at a given class level. Returns 0 for classes
 * with no known-spell table (prepared casters other than Wizard, non-casters).
 */
export function maxKnownSpells(className: string, classLevel: number, subclassName?: string): number {
  const idx = Math.min(Math.max(classLevel, 1), 20) - 1;
  if (className.toLowerCase() === 'wizard') {
    return WIZARD_SPELLBOOK_GROWTH.slice(0, idx + 1).reduce((sum, n) => sum + n, 0);
  }
  const own = getClassData(className)?.spellsKnownTable?.[idx];
  if (own !== undefined) return own;
  return getSubclassCaster(subclassName)?.spellsKnownTable[idx] ?? 0;
}

/**
 * Whether a class (+ optional caster subclass) has any spell to pick at this level — a cantrip,
 * or a known/prepared spell of level ≥ 1. False for non-casters and for half-casters below the
 * level they gain spellcasting (Paladin/Ranger level 1). Used to decide whether the creation
 * wizard shows a Spells step.
 */
export function classHasSpellChoices(className: string, classLevel: number, subclassName?: string, edition: Edition = '5e'): boolean {
  if (maxKnownCantrips(className, classLevel, subclassName) > 0) return true;
  if (maxSpellLevelForClass(className, classLevel, subclassName) < 1) return false;
  if (isPreparedCaster(className, edition)) return true;
  return maxKnownSpells(className, classLevel, subclassName) > 0;
}

/** Max cantrips known at a given class level. Returns 0 for classes with no cantrips (Paladin, Ranger). */
export function maxKnownCantrips(className: string, classLevel: number, subclassName?: string): number {
  const idx = Math.min(Math.max(classLevel, 1), 20) - 1;
  const own = getClassData(className)?.cantripsKnown?.[idx];
  if (own !== undefined) return own;
  return getSubclassCaster(subclassName)?.cantripsKnown[idx] ?? 0;
}
