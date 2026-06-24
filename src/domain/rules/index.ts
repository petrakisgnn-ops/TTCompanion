import type { AbilityScores } from '../character/types';
export { maxSpellLevelForClass, maxSpellLevelForCharacter, LEVEL_LABEL } from './spellcasting';

export const abilityMod = (score: number): number =>
  Math.floor((score - 10) / 2);

export const proficiencyBonus = (totalLevel: number): number =>
  Math.ceil(totalLevel / 4) + 1;

export const spellSaveDc = (abilityMod: number, profBonus: number): number =>
  8 + abilityMod + profBonus;

export const spellAttackBonus = (abilityMod: number, profBonus: number): number =>
  abilityMod + profBonus;

export const passiveScore = (mod: number, profBonus: number, proficient: boolean): number =>
  10 + mod + (proficient ? profBonus : 0);

export const totalLevel = (classes: { level: number }[]): number =>
  classes.reduce((sum, c) => sum + c.level, 0);

export const allAbilityMods = (scores: AbilityScores) => ({
  str: abilityMod(scores.str),
  dex: abilityMod(scores.dex),
  con: abilityMod(scores.con),
  int: abilityMod(scores.int),
  wis: abilityMod(scores.wis),
  cha: abilityMod(scores.cha),
});
