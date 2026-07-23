import { parseSkillGrant, type SkillGrant } from './skillGrants';
import { parseLanguageGrant, type LanguageGrant } from './languages';
import { parseToolGrant, type ToolGrant } from './tools';

/** The raw reward-bearing fields of a background record (backgrounds.json). */
export interface RawBackground {
  name: string;
  source: string;
  skillProficiencies?: unknown;
  languageProficiencies?: unknown;
  toolProficiencies?: unknown;
  feats?: Record<string, boolean>[];
}

export interface BackgroundRewards {
  /** Skill proficiencies: fixed grants + any choose/any count and its restricted list. */
  skills: SkillGrant;
  /** Languages: fixed grants + free-choice count. */
  languages: LanguageGrant;
  /** Tool proficiencies: fixed grants + choose count. */
  tools: ToolGrant;
  /** Feat names granted outright (e.g. Strixhaven Initiate), before any source/qualifier. */
  featNames: string[];
}

/** Extracts the feat names a background grants (the part before `;`/`|` in each granted key). */
export function backgroundFeatNames(feats: RawBackground['feats']): string[] {
  const out: string[] = [];
  for (const grant of feats ?? []) {
    for (const [key, granted] of Object.entries(grant)) {
      if (!granted) continue;
      // Keys look like "magic initiate; cleric|xphb" — the feat's own name is before ';' and '|'.
      const name = key.split('|')[0].split(';')[0].trim();
      if (name) out.push(name);
    }
  }
  return out;
}

/**
 * The complete set of mechanical rewards a background grants, parsed from its raw record.
 * A single derivation shared by character creation (StepSkills seeds/prompts these) and the
 * background-reward reconciliation tests, so both agree on what every background gives.
 */
export function parseBackgroundRewards(bg: RawBackground): BackgroundRewards {
  return {
    skills: parseSkillGrant(bg.skillProficiencies),
    languages: parseLanguageGrant(bg.languageProficiencies),
    tools: parseToolGrant(bg.toolProficiencies),
    featNames: backgroundFeatNames(bg.feats),
  };
}
