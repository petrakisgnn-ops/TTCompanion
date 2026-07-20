import type { AbilityScores, Character } from '../character/types';
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

/**
 * AC has no dedicated field on Character — it lives as an optional override inside
 * the player-configurable `combat-stats` widget (see widgets/CombatStatsWidget.tsx).
 * Read that override if the widget is present, else fall back to the same
 * `10 + dexMod` default the widget itself uses.
 */
export const characterAc = (character: Character): number => {
  const widget = character.dashboard.widgets.find(w => w.type === 'combat-stats');
  const override = (widget?.config as { acOverride?: number } | undefined)?.acOverride;
  return override ?? 10 + abilityMod(character.abilityScores.dex);
};

export const allAbilityMods = (scores: AbilityScores) => ({
  str: abilityMod(scores.str),
  dex: abilityMod(scores.dex),
  con: abilityMod(scores.con),
  int: abilityMod(scores.int),
  wis: abilityMod(scores.wis),
  cha: abilityMod(scores.cha),
});
