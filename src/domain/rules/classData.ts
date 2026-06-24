// Static class metadata — avoids parsing complex class JSON at runtime.
// Extend when subclass support is needed.

export type SpellcastingType = 'full' | 'half' | 'artificer' | 'pact' | 'none';

export interface ClassData {
  name: string;
  source: string;
  hitDie: number;
  saves: string[];
  spellcasting: SpellcastingType;
  spellcastingAbility?: string;
}

export const CLASSES: readonly ClassData[] = [
  { name: 'Artificer',  source: 'TCE', hitDie: 8,  saves: ['con', 'int'], spellcasting: 'artificer', spellcastingAbility: 'int' },
  { name: 'Barbarian',  source: 'PHB', hitDie: 12, saves: ['str', 'con'], spellcasting: 'none' },
  { name: 'Bard',       source: 'PHB', hitDie: 8,  saves: ['dex', 'cha'], spellcasting: 'full',       spellcastingAbility: 'cha' },
  { name: 'Cleric',     source: 'PHB', hitDie: 8,  saves: ['wis', 'cha'], spellcasting: 'full',       spellcastingAbility: 'wis' },
  { name: 'Druid',      source: 'PHB', hitDie: 8,  saves: ['int', 'wis'], spellcasting: 'full',       spellcastingAbility: 'wis' },
  { name: 'Fighter',    source: 'PHB', hitDie: 10, saves: ['str', 'con'], spellcasting: 'none' },
  { name: 'Monk',       source: 'PHB', hitDie: 8,  saves: ['str', 'dex'], spellcasting: 'none' },
  { name: 'Paladin',    source: 'PHB', hitDie: 10, saves: ['wis', 'cha'], spellcasting: 'half',       spellcastingAbility: 'cha' },
  { name: 'Ranger',     source: 'PHB', hitDie: 10, saves: ['str', 'dex'], spellcasting: 'half',       spellcastingAbility: 'wis' },
  { name: 'Rogue',      source: 'PHB', hitDie: 8,  saves: ['dex', 'int'], spellcasting: 'none' },
  { name: 'Sorcerer',   source: 'PHB', hitDie: 6,  saves: ['con', 'cha'], spellcasting: 'full',       spellcastingAbility: 'cha' },
  { name: 'Warlock',    source: 'PHB', hitDie: 8,  saves: ['wis', 'cha'], spellcasting: 'pact',       spellcastingAbility: 'cha' },
  { name: 'Wizard',     source: 'PHB', hitDie: 6,  saves: ['int', 'wis'], spellcasting: 'full',       spellcastingAbility: 'int' },
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
