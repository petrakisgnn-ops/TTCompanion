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

/** 2024 classes whose own features include Fighting Style (the prerequisite of Fighting Style feats). */
const FIGHTING_STYLE_CLASSES = new Set(['fighter', 'paladin', 'ranger']);

function requiredFeatures(prerequisite: unknown): string[] {
  if (!Array.isArray(prerequisite)) return [];
  return prerequisite.flatMap(p => {
    const feature = (p as { feature?: unknown }).feature;
    return Array.isArray(feature) ? feature.filter((x): x is string => typeof x === 'string') : [];
  });
}

/**
 * Whether a feat can be taken in place of an Ability Score Improvement. 2014 has no feat
 * categories, so any feat qualifies. 2024 (PHB p. 41): the ASI feature grants "the Ability Score
 * Improvement feat or another feat of your choice for which you qualify" — so General feats
 * (level 4+), **Origin feats** (no prerequisite, e.g. Tough, Alert), Fighting Style feats (only
 * with the Fighting Style feature — Fighter/Paladin/Ranger) and Epic Boons (level 19) all count.
 * Other prerequisites (ability scores, spellcasting, armor training) are shown as advisory text
 * (see featPrereqSummary), not enforced.
 */
export function isAsiFeatEligible(
  feat: FeatLike,
  characterLevel: number,
  edition: Edition,
  classNames: string[] = [],
): boolean {
  if (edition !== '5.5e') return true;
  if (characterLevel < featLevelRequirement(feat.prerequisite)) return false;
  switch (featCategory(feat.category)) {
    case 'general':
    case 'origin':
      return true;
    case 'epic-boon':
      return characterLevel >= 19;
    case 'fighting-style':
      return !requiredFeatures(feat.prerequisite).includes('Fighting Style') ||
        classNames.some(c => FIGHTING_STYLE_CLASSES.has(c.toLowerCase()));
    default:
      return true;
  }
}

const ABILITY_NAMES: Record<string, string> = { str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA' };

/** A short human-readable list of a feat's non-level prerequisites, e.g. "Spellcasting", "STR or DEX 13". Null when none. */
export function featPrereqSummary(prerequisite: unknown): string | null {
  if (!Array.isArray(prerequisite) || prerequisite.length === 0) return null;
  const parts: string[] = [];
  for (const raw of prerequisite) {
    const p = raw as Record<string, unknown>;
    if (Array.isArray(p.ability)) {
      const opts = (p.ability as Record<string, number>[]).flatMap(o =>
        Object.entries(o).map(([k, v]) => `${ABILITY_NAMES[k] ?? k.toUpperCase()} ${v}`));
      if (opts.length) parts.push(opts.join(' or '));
    }
    if (p.spellcasting || p.spellcasting2020 || p.spellcastingFeature) parts.push('Spellcasting');
    if (Array.isArray(p.feature)) parts.push(...(p.feature as string[]));
    if (Array.isArray(p.proficiency)) {
      for (const prof of p.proficiency as Record<string, string>[]) {
        if (prof.armor) parts.push(`${prof.armor} armor training`);
        if (prof.weapon) parts.push(`${prof.weapon} weapon proficiency`);
      }
    }
    const other = p.otherSummary as { entrySummary?: string } | undefined;
    if (other?.entrySummary) parts.push(other.entrySummary);
    if (typeof p.other === 'string') parts.push(p.other);
  }
  const unique = [...new Set(parts)];
  return unique.length ? unique.join('; ') : null;
}
