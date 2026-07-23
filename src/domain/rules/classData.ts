// Static class metadata — avoids parsing complex class JSON at runtime.
// Extend when subclass support is needed.

import type { AbilityScores } from '../character/types';
import type { Edition } from './edition';

export type SpellcastingType = 'full' | 'half' | 'artificer' | 'pact' | 'none';
export type AbilityKey = keyof AbilityScores;

/** Multiclassing prerequisite (PHB p.163) — met if all of `all` AND at least one of `any` are >= 13. */
export interface AbilityPrereq {
  all?: AbilityKey[];
  any?: AbilityKey[];
}

/**
 * The reduced proficiency set gained when multiclassing INTO this class (PHB "Multiclassing"
 * table) — not the full first-class grant. `skillChoice` is just a count; the actual eligible
 * skill list is the class's own from `classSkills.ts` (`CLASS_SKILLS`) — not duplicated here.
 */
export interface MulticlassProficiencyGrant {
  armor: string[];
  weapons: string[];
  tool?: string;
  skillChoice?: number;
}

export function meetsPrereq(prereq: AbilityPrereq, scores: AbilityScores): boolean {
  const allOk = (prereq.all ?? []).every(k => scores[k] >= 13);
  const anyOk = !prereq.any || prereq.any.some(k => scores[k] >= 13);
  return allOk && anyOk;
}

export interface ClassData {
  name: string;
  source: string;
  hitDie: number;
  saves: string[];
  spellcasting: SpellcastingType;
  spellcastingAbility?: string;
  multiclassPrereq: AbilityPrereq;
  multiclassProficiency: MulticlassProficiencyGrant;
  /** Armor/weapon proficiencies granted by taking this class FIRST (PHB class tables) — the reduced multiclass grant is `multiclassProficiency`. */
  startingProficiency: { armor: string[]; weapons: string[] };
  /** Known-cantrip count by level (index 0 = level 1). Absent for classes with no cantrips (Paladin, Ranger). */
  cantripsKnown?: readonly number[];
  /** Known-spell count by level (index 0 = level 1) — known casters only (Bard/Sorcerer/Warlock/Ranger). */
  spellsKnownTable?: readonly number[];
}

export const CLASSES: readonly ClassData[] = [
  {
    name: 'Artificer', source: 'TCE', hitDie: 8, saves: ['con', 'int'], spellcasting: 'artificer', spellcastingAbility: 'int',
    multiclassPrereq: { all: ['int'] },
    multiclassProficiency: { armor: ['Light armor'], weapons: [], tool: "Thieves' Tools or one artisan's tools" },
    startingProficiency: { armor: ['Light armor', 'Medium armor', 'Shields'], weapons: ['Simple weapons'] },
    cantripsKnown: [2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4],
  },
  {
    name: 'Barbarian', source: 'PHB', hitDie: 12, saves: ['str', 'con'], spellcasting: 'none',
    multiclassPrereq: { all: ['str'] },
    multiclassProficiency: { armor: ['Shields'], weapons: ['Simple weapons', 'Martial weapons'] },
    startingProficiency: { armor: ['Light armor', 'Medium armor', 'Shields'], weapons: ['Simple weapons', 'Martial weapons'] },
  },
  {
    name: 'Bard', source: 'PHB', hitDie: 8, saves: ['dex', 'cha'], spellcasting: 'full', spellcastingAbility: 'cha',
    multiclassPrereq: { all: ['cha'] },
    multiclassProficiency: { armor: ['Light armor'], weapons: [], tool: 'One musical instrument', skillChoice: 1 },
    startingProficiency: { armor: ['Light armor'], weapons: ['Simple weapons', 'Hand crossbows', 'Longswords', 'Rapiers', 'Shortswords'] },
    cantripsKnown: [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
    spellsKnownTable: [4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15, 15, 16, 18, 19, 19, 20, 22, 22, 22],
  },
  {
    name: 'Cleric', source: 'PHB', hitDie: 8, saves: ['wis', 'cha'], spellcasting: 'full', spellcastingAbility: 'wis',
    multiclassPrereq: { all: ['wis'] },
    multiclassProficiency: { armor: ['Light armor', 'Medium armor', 'Shields'], weapons: [] },
    startingProficiency: { armor: ['Light armor', 'Medium armor', 'Shields'], weapons: ['Simple weapons'] },
    cantripsKnown: [3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
  },
  {
    name: 'Druid', source: 'PHB', hitDie: 8, saves: ['int', 'wis'], spellcasting: 'full', spellcastingAbility: 'wis',
    multiclassPrereq: { all: ['wis'] },
    multiclassProficiency: { armor: ['Shields'], weapons: [] },
    startingProficiency: { armor: ['Light armor', 'Medium armor', 'Shields (non-metal)'], weapons: ['Clubs', 'Daggers', 'Darts', 'Javelins', 'Maces', 'Quarterstaffs', 'Scimitars', 'Sickles', 'Slings', 'Spears'] },
    cantripsKnown: [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
  },
  {
    name: 'Fighter', source: 'PHB', hitDie: 10, saves: ['str', 'con'], spellcasting: 'none',
    multiclassPrereq: { any: ['str', 'dex'] },
    multiclassProficiency: { armor: ['Light armor', 'Medium armor', 'Shields'], weapons: ['Simple weapons', 'Martial weapons'] },
    startingProficiency: { armor: ['Light armor', 'Medium armor', 'Heavy armor', 'Shields'], weapons: ['Simple weapons', 'Martial weapons'] },
  },
  {
    name: 'Monk', source: 'PHB', hitDie: 8, saves: ['str', 'dex'], spellcasting: 'none',
    multiclassPrereq: { all: ['dex', 'wis'] },
    multiclassProficiency: { armor: [], weapons: ['Simple weapons', 'Shortswords'] },
    startingProficiency: { armor: [], weapons: ['Simple weapons', 'Shortswords'] },
  },
  {
    name: 'Paladin', source: 'PHB', hitDie: 10, saves: ['wis', 'cha'], spellcasting: 'half', spellcastingAbility: 'cha',
    multiclassPrereq: { all: ['str', 'cha'] },
    multiclassProficiency: { armor: ['Light armor', 'Medium armor', 'Shields'], weapons: ['Simple weapons', 'Martial weapons'] },
    startingProficiency: { armor: ['Light armor', 'Medium armor', 'Heavy armor', 'Shields'], weapons: ['Simple weapons', 'Martial weapons'] },
  },
  {
    name: 'Ranger', source: 'PHB', hitDie: 10, saves: ['str', 'dex'], spellcasting: 'half', spellcastingAbility: 'wis',
    multiclassPrereq: { all: ['dex', 'wis'] },
    multiclassProficiency: { armor: ['Light armor'], weapons: ['Simple weapons', 'Martial weapons'], skillChoice: 1 },
    startingProficiency: { armor: ['Light armor', 'Medium armor', 'Shields'], weapons: ['Simple weapons', 'Martial weapons'] },
    spellsKnownTable: [0, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11],
  },
  {
    name: 'Rogue', source: 'PHB', hitDie: 8, saves: ['dex', 'int'], spellcasting: 'none',
    multiclassPrereq: { all: ['dex'] },
    multiclassProficiency: { armor: ['Light armor'], weapons: [], tool: "Thieves' Tools", skillChoice: 1 },
    startingProficiency: { armor: ['Light armor'], weapons: ['Simple weapons', 'Hand crossbows', 'Longswords', 'Rapiers', 'Shortswords'] },
  },
  {
    name: 'Sorcerer', source: 'PHB', hitDie: 6, saves: ['con', 'cha'], spellcasting: 'full', spellcastingAbility: 'cha',
    multiclassPrereq: { all: ['cha'] },
    multiclassProficiency: { armor: [], weapons: [] },
    startingProficiency: { armor: [], weapons: ['Daggers', 'Darts', 'Slings', 'Quarterstaffs', 'Light crossbows'] },
    cantripsKnown: [4, 4, 4, 5, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6],
    spellsKnownTable: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 12, 13, 13, 14, 14, 15, 15, 15, 15],
  },
  {
    name: 'Warlock', source: 'PHB', hitDie: 8, saves: ['wis', 'cha'], spellcasting: 'pact', spellcastingAbility: 'cha',
    multiclassPrereq: { all: ['cha'] },
    multiclassProficiency: { armor: ['Light armor'], weapons: ['Simple weapons'] },
    startingProficiency: { armor: ['Light armor'], weapons: ['Simple weapons'] },
    cantripsKnown: [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
    spellsKnownTable: [2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 11, 11, 12, 12, 13, 13, 14, 14, 15, 15],
  },
  {
    name: 'Wizard', source: 'PHB', hitDie: 6, saves: ['int', 'wis'], spellcasting: 'full', spellcastingAbility: 'int',
    multiclassPrereq: { all: ['int'] },
    multiclassProficiency: { armor: [], weapons: [] },
    startingProficiency: { armor: [], weapons: ['Daggers', 'Darts', 'Slings', 'Quarterstaffs', 'Light crossbows'] },
    cantripsKnown: [3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
  },
] as const;

export function getClassData(name: string): ClassData | undefined {
  return CLASSES.find(c => c.name.toLowerCase() === name.toLowerCase());
}

/**
 * Subclasses that grant spellcasting to an otherwise non-casting class (PHB
 * third-casters). Tables hardcoded from class-fighter/rogue.json subclass entries
 * (index 0 = class level 1); their spell list is the Wizard list.
 */
export interface SubclassCasterData {
  progression: '1/3';
  ability: AbilityKey;
  spellList: string;
  cantripsKnown: readonly number[];
  spellsKnownTable: readonly number[];
}

const SUBCLASS_CASTERS: Record<string, SubclassCasterData> = {
  'Eldritch Knight': {
    progression: '1/3', ability: 'int', spellList: 'Wizard',
    cantripsKnown:    [0, 0, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
    spellsKnownTable: [0, 0, 3, 4, 4, 4, 5, 6, 6, 7, 8, 8, 9, 10, 10, 11, 11, 11, 12, 13],
  },
  'Arcane Trickster': {
    progression: '1/3', ability: 'int', spellList: 'Wizard',
    cantripsKnown:    [0, 0, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
    spellsKnownTable: [0, 0, 3, 4, 4, 4, 5, 6, 6, 7, 8, 8, 9, 10, 10, 11, 11, 11, 12, 13],
  },
};

export function getSubclassCaster(subclassName: string | undefined): SubclassCasterData | undefined {
  return subclassName ? SUBCLASS_CASTERS[subclassName] : undefined;
}

// Levels at which each class gains an Ability Score Improvement (or Feat)
const ASI_LEVELS: Record<string, readonly number[]> = {
  Fighter: [4, 6, 8, 12, 14, 16, 19],
  Rogue:   [4, 8, 10, 12, 16, 19],
};
const ASI_DEFAULT = [4, 8, 12, 16, 19] as const;

export function isAsiLevel(className: string, level: number): boolean {
  return (ASI_LEVELS[className] ?? ASI_DEFAULT).includes(level);
}

/** Every level at or below `level` at which the class grants an ASI/feat — used to collect
 * the choices a character created above level 1 has already accrued (e.g. a level-10 Fighter
 * has three: levels 4, 6 and 8). */
export function asiLevelsUpTo(className: string, level: number): number[] {
  return (ASI_LEVELS[className] ?? ASI_DEFAULT).filter(l => l <= level);
}

// Level at which the class picks a subclass (2014). 2024 standardizes this to level 3 for all.
const SUBCLASS_LEVEL: Record<string, number> = {
  Cleric: 1, Sorcerer: 1, Warlock: 1,
  Wizard: 2, Druid: 2,
};
// 2024 Weapon Mastery — how many weapons' mastery properties a martial can use. Barbarian and
// Fighter scale (their class table has a "Weapon Mastery" column); Paladin/Ranger/Rogue get a
// fixed 2 from their level-1 feature. No such mechanic exists in 2014.
const WEAPON_MASTERY_2024: Record<string, readonly number[]> = {
  Barbarian: [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
  Fighter:   [3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6],
};
const WEAPON_MASTERY_FIXED_2024: Record<string, number> = { Paladin: 2, Ranger: 2, Rogue: 2 };

export function weaponMasteryCount(className: string, level: number, edition: Edition = '5e'): number {
  if (edition !== '5.5e') return 0;
  const scaling = WEAPON_MASTERY_2024[className];
  if (scaling) return scaling[Math.min(Math.max(level, 1), 20) - 1];
  return WEAPON_MASTERY_FIXED_2024[className] ?? 0;
}

export function subclassLevel(className: string, edition: Edition = '5e'): number {
  if (edition === '5.5e') return 3; // 2024: every class chooses its subclass at level 3
  return SUBCLASS_LEVEL[className] ?? 3;
}
