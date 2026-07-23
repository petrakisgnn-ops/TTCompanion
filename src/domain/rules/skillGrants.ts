import { ALL_SKILLS } from './classSkills';

const normalize = (s: string): string => s.toLowerCase().replace(/\s+/g, '');

const KEY_TO_NAME = new Map(ALL_SKILLS.map(s => [normalize(s), s]));

/** Maps a raw skill key ("animal handling", "sleightOfHand") to its display name. */
export function skillDisplayName(key: string): string {
  return KEY_TO_NAME.get(normalize(key)) ?? (key.charAt(0).toUpperCase() + key.slice(1));
}

export interface SkillGrant {
  /** Skills granted outright — no choice involved. */
  fixed: string[];
  /** Number of additional skills the player picks. */
  choiceCount: number;
  /** Skills the choice is restricted to (empty = any skill). */
  choiceFrom: string[];
}

const NO_GRANT: SkillGrant = { fixed: [], choiceCount: 0, choiceFrom: [] };

/**
 * Parses a race/subrace/background's raw `skillProficiencies` block. Real-world shapes:
 * fixed grants (`{"perception": true}`), a restricted choice
 * (`{"choose": {"from": [...], "count": N}}`, default count 1), and a free choice from
 * every skill (`{"any": N}`). Mirrors `parseLanguageGrant` — kept deliberately permissive
 * rather than a full rules engine.
 */
export function parseSkillGrant(raw: unknown): SkillGrant {
  const block = Array.isArray(raw) ? (raw[0] as Record<string, unknown> | undefined) : undefined;
  if (!block || typeof block !== 'object') return NO_GRANT;

  const fixed: string[] = [];
  let choiceCount = 0;
  let choiceFrom: string[] = [];

  for (const [key, val] of Object.entries(block)) {
    if (key === 'any') {
      if (typeof val === 'number') choiceCount += val;
      continue;
    }
    if (key === 'choose' && val && typeof val === 'object') {
      const choose = val as { from?: string[]; count?: number };
      choiceCount += choose.count ?? 1;
      if (Array.isArray(choose.from)) {
        choiceFrom = [...new Set([...choiceFrom, ...choose.from.map(skillDisplayName)])];
      }
      continue;
    }
    if (val === true) {
      fixed.push(skillDisplayName(key));
    }
  }

  return { fixed, choiceCount, choiceFrom };
}
