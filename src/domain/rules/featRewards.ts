import { parseFeatAbility, type FeatAbilityGrant } from './featAbility';
import { parseSkillGrant, skillDisplayName, type SkillGrant } from './skillGrants';
import { parseLanguageGrant, type LanguageGrant } from './languages';
import { parseToolGrant, type ToolGrant } from './tools';

/** The raw reward-bearing fields of a feat record (feats.json). */
export interface RawFeat {
  name: string;
  source: string;
  ability?: unknown;
  skillProficiencies?: unknown;
  languageProficiencies?: unknown;
  toolProficiencies?: unknown;
  expertise?: unknown;
  skillToolLanguageProficiencies?: unknown;
  additionalSpells?: unknown;
}

export interface FeatRewards {
  /** Ability score increase(s), or null when the feat grants none. */
  ability: FeatAbilityGrant | null;
  /** Skill proficiencies (fixed + choose/any). */
  skills: SkillGrant;
  /** Languages (fixed + free-choice count). */
  languages: LanguageGrant;
  /** Tool proficiencies (fixed + choose count). */
  tools: ToolGrant;
  /** The feat grants Expertise in a skill/tool (e.g. Prodigy) — shape varies, not itemized here. */
  grantsExpertise: boolean;
  /** The feat grants spells (e.g. Magic Initiate, Fey Touched) via additionalSpells. */
  grantsSpells: boolean;
}

/**
 * The mechanical rewards a feat grants, parsed from its raw record — reusing the same skill/
 * language/tool parsers as backgrounds (identical data shapes) plus feat-specific ability
 * parsing. A single derivation the reconciliation tests assert against; note the character
 * store currently applies only `ability` (see addFeat), so the proficiency/expertise/spell
 * fields describe what a feat *should* grant, which the app does not yet apply on its own.
 */
export function parseFeatRewards(feat: RawFeat): FeatRewards {
  return {
    ability: parseFeatAbility(feat.ability),
    skills: parseSkillGrant(feat.skillProficiencies),
    languages: parseLanguageGrant(feat.languageProficiencies),
    tools: parseToolGrant(feat.toolProficiencies),
    grantsExpertise: Array.isArray(feat.expertise) && feat.expertise.length > 0,
    grantsSpells: Array.isArray(feat.additionalSpells) && feat.additionalSpells.length > 0,
  };
}

// ── Applying a feat's proficiency grants (fixed + player choices) ──────────────

/** What kind of proficiency a feat choice targets — drives which option list the picker shows. */
export type FeatProfKind = 'skill' | 'tool' | 'language' | 'expertise' | 'skillOrTool';

export interface FeatProfChoice {
  /** Stable id within a feat (one per choice group), e.g. "skill" / "expertise". */
  id: string;
  kind: FeatProfKind;
  count: number;
  /** Restricted options (display names); undefined = any of the kind. Expertise = any *proficient* skill. */
  from?: string[];
}

export interface FeatProficiencies {
  fixed: { skills: string[]; tools: string[]; languages: string[]; expertise: string[] };
  choices: FeatProfChoice[];
}

function block(raw: unknown): Record<string, unknown> | undefined {
  return Array.isArray(raw) ? (raw[0] as Record<string, unknown> | undefined) : undefined;
}

/**
 * The proficiency/expertise grants a feat gives — fixed grants applied automatically, plus any
 * player choices (Prodigy's skill/tool/language/expertise, Skilled's "3 from skills or tools").
 * The spell and ability rewards are handled elsewhere (granted-spell sync / ability boosts).
 */
export function parseFeatProficiencies(feat: RawFeat): FeatProficiencies {
  const skills = parseSkillGrant(feat.skillProficiencies);
  const languages = parseLanguageGrant(feat.languageProficiencies);
  const tools = parseToolGrant(feat.toolProficiencies);

  const fixed = {
    skills: [...skills.fixed],
    tools: [...tools.fixed],
    languages: [...languages.fixed],
    expertise: [] as string[],
  };
  const choices: FeatProfChoice[] = [];

  if (skills.choiceCount > 0) {
    choices.push({ id: 'skill', kind: 'skill', count: skills.choiceCount, from: skills.choiceFrom.length ? skills.choiceFrom : undefined });
  }
  if (tools.choiceCount > 0) choices.push({ id: 'tool', kind: 'tool', count: tools.choiceCount });
  if (languages.choiceCount > 0) choices.push({ id: 'language', kind: 'language', count: languages.choiceCount });

  // Expertise: `{anyProficientSkill: N}` → choose N of your proficient skills; `{skill: true}` → fixed.
  const exp = block(feat.expertise);
  if (exp) {
    let expChoice = 0;
    for (const [key, val] of Object.entries(exp)) {
      if (key === 'anyProficientSkill' || key === 'any') { if (typeof val === 'number') expChoice += val; }
      else if (val === true) fixed.expertise.push(skillDisplayName(key));
    }
    if (expChoice > 0) choices.push({ id: 'expertise', kind: 'expertise', count: expChoice });
  }

  // Skilled: `skillToolLanguageProficiencies: [{choose: [{from: ["anySkill","anyTool"], count: N}]}]`.
  const stl = block(feat.skillToolLanguageProficiencies);
  const stlChoose = stl?.choose;
  if (Array.isArray(stlChoose)) {
    for (const c of stlChoose as { from?: unknown; count?: unknown }[]) {
      const from = Array.isArray(c.from) ? c.from.map(String) : [];
      const count = typeof c.count === 'number' ? c.count : 1;
      // Only the "any skill or tool" form appears in the data; treat it as a combined pick.
      if (from.includes('anySkill') || from.includes('anyTool')) {
        choices.push({ id: 'skillOrTool', kind: 'skillOrTool', count });
      }
    }
  }

  return { fixed, choices };
}

/** The proficiencies a player has chosen for a feat's choice groups, by target list. */
export interface FeatProfSelection {
  skills: string[];
  tools: string[];
  languages: string[];
  expertise: string[];
}

export const EMPTY_FEAT_PROF_SELECTION: FeatProfSelection = { skills: [], tools: [], languages: [], expertise: [] };

/** How many picks a given choice group has so far (skillOrTool counts skills + tools together). */
export function pickedForChoice(choice: FeatProfChoice, sel: FeatProfSelection): number {
  switch (choice.kind) {
    case 'skill': return sel.skills.length;
    case 'tool': return sel.tools.length;
    case 'language': return sel.languages.length;
    case 'expertise': return sel.expertise.length;
    case 'skillOrTool': return sel.skills.length + sel.tools.length;
  }
}

/** True once every choice group has exactly the number of picks the feat requires. */
export function featProfChoicesComplete(prof: FeatProficiencies, sel: FeatProfSelection): boolean {
  return prof.choices.every(c => pickedForChoice(c, sel) >= c.count);
}

/** Merges a feat's fixed grants with the player's choices into the final proficiency lists. */
export function resolveFeatProficiencies(prof: FeatProficiencies, sel: FeatProfSelection): FeatProfSelection {
  return {
    skills: [...new Set([...prof.fixed.skills, ...sel.skills])],
    tools: [...new Set([...prof.fixed.tools, ...sel.tools])],
    languages: [...new Set([...prof.fixed.languages, ...sel.languages])],
    expertise: [...new Set([...prof.fixed.expertise, ...sel.expertise])],
  };
}
