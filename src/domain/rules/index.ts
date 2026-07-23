import type { AbilityScores, Character } from '../character/types';
import { armorClass } from './ac';
export { maxSpellLevelForClass, maxSpellLevelForCharacter, LEVEL_LABEL } from './spellcasting';

export const abilityMod = (score: number): number =>
  Math.floor((score - 10) / 2);

export const proficiencyBonus = (totalLevel: number): number =>
  Math.ceil(totalLevel / 4) + 1;

export const spellSaveDc = (abilityMod: number, profBonus: number): number =>
  8 + abilityMod + profBonus;

export const spellAttackBonus = (abilityMod: number, profBonus: number): number =>
  abilityMod + profBonus;

export const passiveScore = (mod: number, profBonus: number, proficient: boolean, expertise = false): number =>
  10 + mod + (proficient ? profBonus * (expertise ? 2 : 1) : 0);

export const totalLevel = (classes: { level: number }[]): number =>
  classes.reduce((sum, c) => sum + c.level, 0);

/**
 * A character's AC without resolving worn armor — the manual override (combat-stats widget) if
 * set, else unarmored (`10 + DEX` plus Barbarian/Monk Unarmored Defense). Synchronous, for
 * contexts without item-DB access (e.g. DM combatant conversion). Components that can resolve
 * equipped armor should use the `useCharacterAc` hook, which feeds armor into `armorClass`.
 */
export const characterAc = (character: Character): number => armorClass(character);

export const allAbilityMods = (scores: AbilityScores) => ({
  str: abilityMod(scores.str),
  dex: abilityMod(scores.dex),
  con: abilityMod(scores.con),
  int: abilityMod(scores.int),
  wis: abilityMod(scores.wis),
  cha: abilityMod(scores.cha),
});
