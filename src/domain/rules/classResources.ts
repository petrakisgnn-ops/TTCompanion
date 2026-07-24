import type { AbilityScores, ResourceTrack } from '../character/types';
import type { Edition } from './edition';
import { abilityMod, proficiencyBonus } from './index';

/**
 * Static per-class resource id lists — used only by the level-up merge to know which existing
 * resource ids "belong" to a given class, independent of whether the current level's
 * computation actually produces them (e.g. Rage disappears at level 20 but 'rage' must still
 * be recognized as Barbarian's so it gets cleanly removed rather than left stale).
 */
export const CLASS_RESOURCE_IDS: Record<string, string[]> = {
  Barbarian: ['rage'],
  Bard: ['bardic-inspiration'],
  Cleric: ['channel-divinity'],
  Druid: ['wild-shape'],
  Fighter: ['second-wind', 'action-surge', 'indomitable'],
  Monk: ['ki'],
  Paladin: ['lay-on-hands', 'channel-divinity'],
  Sorcerer: ['sorcery-points'],
  Wizard: ['arcane-recovery'],
};

// PHB Barbarian table, "Rages" column, levels 1–19. Level 20 is "Unlimited" — nothing to
// track, so the resource is omitted entirely from that level on (see ResourceTrackerWidget.tsx
// for why an Infinity/huge-number track isn't used instead).
const RAGE_USES = [2, 2, 3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 6, 6, 6];

function thresholdUses(level: number, thresholds: [number, number][]): number {
  let uses = 0;
  for (const [at, count] of thresholds) if (level >= at) uses = count;
  return uses;
}

const track = (id: string, label: string, max: number, resetOn: ResourceTrack['resetOn']): ResourceTrack[] =>
  max > 0 ? [{ id, label, current: max, max, resetOn }] : [];

/** Computes the non-spell resource pools a class grants at a given level (see classResources plan for the PHB rule behind each). */
export function computeClassResources(className: string, level: number, abilityScores: AbilityScores, edition: Edition = '5e'): ResourceTrack[] {
  const is2024 = edition === '5.5e';
  switch (className) {
    case 'Barbarian': {
      // 2014: Rage is Unlimited at level 20 (untracked). 2024: a tracked 6 uses at level 20.
      if (!is2024 && level >= 20) return [];
      const max = RAGE_USES[Math.min(level, 19) - 1] ?? 0; // level 20 → index 18 = 6
      return track('rage', 'Rage', max, 'longRest');
    }
    case 'Bard': {
      // Bardic Inspiration: uses = CHA mod (min 1). Font of Inspiration (lvl 5) moves the
      // recharge from long rest to short rest.
      const max = Math.max(1, abilityMod(abilityScores.cha));
      return track('bardic-inspiration', 'Bardic Inspiration', max, level >= 5 ? 'shortRest' : 'longRest');
    }
    case 'Cleric': {
      // Channel Divinity — 2014: 1/2/3 at levels 2/6/18. 2024: 2/3/4 at 2/6/18.
      const max = thresholdUses(level, is2024 ? [[2, 2], [6, 3], [18, 4]] : [[2, 1], [6, 2], [18, 3]]);
      return track('channel-divinity', 'Channel Divinity', max, 'shortRest');
    }
    case 'Druid': {
      // Wild Shape: 2 uses/rest from level 2, flat (no further scaling in core rules).
      const max = level >= 2 ? 2 : 0;
      return track('wild-shape', 'Wild Shape', max, 'shortRest');
    }
    case 'Fighter': {
      const secondWind = track('second-wind', 'Second Wind', level >= 1 ? 1 : 0, 'shortRest');
      const actionSurgeMax = thresholdUses(level, [[2, 1], [17, 2]]);
      const actionSurge = track('action-surge', 'Action Surge', actionSurgeMax, 'shortRest');
      const indomitableMax = thresholdUses(level, [[9, 1], [13, 2], [17, 3]]);
      const indomitable = track('indomitable', 'Indomitable', indomitableMax, 'longRest');
      return [...secondWind, ...actionSurge, ...indomitable];
    }
    case 'Monk': {
      // Ki points = monk level, from level 2.
      const max = level >= 2 ? level : 0;
      return track('ki', 'Ki Points', max, 'shortRest');
    }
    case 'Paladin': {
      const layOnHands = track('lay-on-hands', 'Lay on Hands', level * 5, 'longRest');
      // Channel Divinity — 2014: 1 from level 3 (never scales). 2024: 2 from level 3, 3 from level 11.
      const channelDivinityMax = thresholdUses(level, is2024 ? [[3, 2], [11, 3]] : [[3, 1]]);
      const channelDivinity = track('channel-divinity', 'Channel Divinity', channelDivinityMax, 'shortRest');
      return [...layOnHands, ...channelDivinity];
    }
    case 'Sorcerer': {
      // Sorcery points = sorcerer level, from level 2. Long rest only — no short-rest recovery.
      const max = level >= 2 ? level : 0;
      return track('sorcery-points', 'Sorcery Points', max, 'longRest');
    }
    case 'Wizard': {
      // Arcane Recovery: once per day (spent after a short rest to recover slots).
      return track('arcane-recovery', 'Arcane Recovery', 1, 'longRest');
    }
    default:
      return [];
  }
}

/**
 * Static per-subclass resource id lists — same role as CLASS_RESOURCE_IDS but keyed by subclass,
 * so the level-up merge recognizes (and cleanly removes) pools a subclass grants.
 */
export const SUBCLASS_RESOURCE_IDS: Record<string, string[]> = {
  'Battle Master': ['superiority-dice'],
  'Psi Warrior': ['psionic-energy-dice'],
  'Arcane Archer': ['arcane-shot'],
  'Samurai': ['fighting-spirit'],
};

/**
 * Non-spell resource pools a *subclass* grants at a given class level. Hand-maintained like
 * computeClassResources; currently the Fighter subclasses whose whole identity is a limited pool
 * (Battle Master's superiority dice being the archetypal case). `level` is the class's own level.
 */
export function computeSubclassResources(
  subclassName: string | undefined,
  level: number,
): ResourceTrack[] {
  switch (subclassName) {
    case 'Battle Master': {
      // Superiority dice: 4 / 5 / 6 at levels 3 / 7 / 15; die grows d8 → d10 (10) → d12 (18).
      const dice = thresholdUses(level, [[3, 4], [7, 5], [15, 6]]);
      const dieSize = level >= 18 ? 'd12' : level >= 10 ? 'd10' : 'd8';
      return track('superiority-dice', `Superiority Dice (${dieSize})`, dice, 'shortRest');
    }
    case 'Psi Warrior': {
      // Psionic Energy dice: twice proficiency bonus, recharged on a short or long rest.
      const dice = level >= 3 ? proficiencyBonus(level) * 2 : 0;
      return track('psionic-energy-dice', 'Psionic Energy Dice', dice, 'shortRest');
    }
    case 'Arcane Archer': {
      // Arcane Shot: 2 uses, regained on a short or long rest.
      return track('arcane-shot', 'Arcane Shot', level >= 3 ? 2 : 0, 'shortRest');
    }
    case 'Samurai': {
      // Fighting Spirit: 3 uses per long rest.
      return track('fighting-spirit', 'Fighting Spirit', level >= 3 ? 3 : 0, 'longRest');
    }
    default:
      return [];
  }
}
