import type { Edition } from './edition';

/** 2024 feat categories: Origin (background/species), General (ASI, level 4+), Fighting Style, Epic Boon (19). */
export type FeatCategory = 'origin' | 'general' | 'fighting-style' | 'epic-boon' | 'other';

/** Maps a feat's raw `category` code (O / G / FS / FS:P / FS:R / EB) to a category. */
export function featCategory(category: string | undefined): FeatCategory {
  switch (category) {
    case 'O': return 'origin';
    case 'G': return 'general';
    case 'FS': case 'FS:P': case 'FS:R': return 'fighting-style';
    case 'EB': return 'epic-boon';
    default: return 'other';
  }
}

/** The minimum character level a feat's `prerequisite` requires (a General feat needs 4). Defaults to 1. */
export function featLevelRequirement(prerequisite: unknown): number {
  if (!Array.isArray(prerequisite)) return 1;
  let req = 1;
  for (const p of prerequisite) {
    const raw = (p as { level?: unknown }).level;
    if (typeof raw === 'number') req = Math.max(req, raw);
    else if (raw && typeof raw === 'object' && typeof (raw as { level?: unknown }).level === 'number') {
      req = Math.max(req, (raw as { level: number }).level);
    }
  }
  return req;
}

interface FeatLike { category?: string; prerequisite?: unknown }

/**
 * Whether a feat can be taken as an ASI/level-up feat choice. 2014 has no feat categories, so any
 * feat qualifies. 2024 restricts ASI feats to the **General** category and enforces its level
 * prerequisite (General feats require level 4). Origin feats (background/species) and Epic Boons
 * (level 19) are chosen through their own contexts, not the ASI slot.
 */
export function isAsiFeatEligible(feat: FeatLike, characterLevel: number, edition: Edition): boolean {
  if (edition !== '5.5e') return true;
  if (featCategory(feat.category) !== 'general') return false;
  return characterLevel >= featLevelRequirement(feat.prerequisite);
}
