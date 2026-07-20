// Static class metadata — avoids parsing complex class JSON at runtime.
// Extend when subclass support is needed.

import type { AbilityScores } from '../character/types';

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
}

export const CLASSES: readonly ClassData[] = [
  {
    name: 'Artificer', source: 'TCE', hitDie: 8, saves: ['con', 'int'], spellcasting: 'artificer', spellcastingAbility: 'int',
    multiclassPrereq: { all: ['int'] },
    multiclassProficiency: { armor: ['Light armor'], weapons: [], tool: "Thieves' Tools or one artisan's tools" },
  },
  {
    name: 'Barbarian', source: 'PHB', hitDie: 12, saves: ['str', 'con'], spellcasting: 'none',
    multiclassPrereq: { all: ['str'] },
    multiclassProficiency: { armor: ['Shields'], weapons: ['Simple weapons', 'Martial weapons'] },
  },
  {
    name: 'Bard', source: 'PHB', hitDie: 8, saves: ['dex', 'cha'], spellcasting: 'full', spellcastingAbility: 'cha',
    multiclassPrereq: { all: ['cha'] },
    multiclassProficiency: { armor: ['Light armor'], weapons: [], tool: 'One musical instrument', skillChoice: 1 },
  },
  {
    name: 'Cleric', source: 'PHB', hitDie: 8, saves: ['wis', 'cha'], spellcasting: 'full', spellcastingAbility: 'wis',
    multiclassPrereq: { all: ['wis'] },
    multiclassProficiency: { armor: ['Light armor', 'Medium armor', 'Shields'], weapons: [] },
  },
  {
    name: 'Druid', source: 'PHB', hitDie: 8, saves: ['int', 'wis'], spellcasting: 'full', spellcastingAbility: 'wis',
    multiclassPrereq: { all: ['wis'] },
    multiclassProficiency: { armor: ['Shields'], weapons: [] },
  },
  {
    name: 'Fighter', source: 'PHB', hitDie: 10, saves: ['str', 'con'], spellcasting: 'none',
    multiclassPrereq: { any: ['str', 'dex'] },
    multiclassProficiency: { armor: ['Light armor', 'Medium armor', 'Shields'], weapons: ['Simple weapons', 'Martial weapons'] },
  },
  {
    name: 'Monk', source: 'PHB', hitDie: 8, saves: ['str', 'dex'], spellcasting: 'none',
    multiclassPrereq: { all: ['dex', 'wis'] },
    multiclassProficiency: { armor: [], weapons: ['Simple weapons', 'Shortswords'] },
  },
  {
    name: 'Paladin', source: 'PHB', hitDie: 10, saves: ['wis', 'cha'], spellcasting: 'half', spellcastingAbility: 'cha',
    multiclassPrereq: { all: ['str', 'cha'] },
    multiclassProficiency: { armor: ['Light armor', 'Medium armor', 'Shields'], weapons: ['Simple weapons', 'Martial weapons'] },
  },
  {
    name: 'Ranger', source: 'PHB', hitDie: 10, saves: ['str', 'dex'], spellcasting: 'half', spellcastingAbility: 'wis',
    multiclassPrereq: { all: ['dex', 'wis'] },
    multiclassProficiency: { armor: ['Light armor'], weapons: ['Simple weapons', 'Martial weapons'], skillChoice: 1 },
  },
  {
    name: 'Rogue', source: 'PHB', hitDie: 8, saves: ['dex', 'int'], spellcasting: 'none',
    multiclassPrereq: { all: ['dex'] },
    multiclassProficiency: { armor: ['Light armor'], weapons: [], tool: "Thieves' Tools", skillChoice: 1 },
  },
  {
    name: 'Sorcerer', source: 'PHB', hitDie: 6, saves: ['con', 'cha'], spellcasting: 'full', spellcastingAbility: 'cha',
    multiclassPrereq: { all: ['cha'] },
    multiclassProficiency: { armor: [], weapons: [] },
  },
  {
    name: 'Warlock', source: 'PHB', hitDie: 8, saves: ['wis', 'cha'], spellcasting: 'pact', spellcastingAbility: 'cha',
    multiclassPrereq: { all: ['cha'] },
    multiclassProficiency: { armor: ['Light armor'], weapons: ['Simple weapons'] },
  },
  {
    name: 'Wizard', source: 'PHB', hitDie: 6, saves: ['int', 'wis'], spellcasting: 'full', spellcastingAbility: 'int',
    multiclassPrereq: { all: ['int'] },
    multiclassProficiency: { armor: [], weapons: [] },
  },
] as const;

export function getClassData(name: string): ClassData | undefined {
  return CLASSES.find(c => c.name.toLowerCase() === name.toLowerCase());
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

// Level at which the class picks a subclass
const SUBCLASS_LEVEL: Record<string, number> = {
  Cleric: 1, Sorcerer: 1, Warlock: 1,
};
export function subclassLevel(className: string): number {
  return SUBCLASS_LEVEL[className] ?? 3;
}
