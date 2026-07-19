export const STANDARD_LANGUAGES = [
  'Common', 'Dwarvish', 'Elvish', 'Giant', 'Gnomish', 'Goblin', 'Halfling', 'Orc',
] as const;

export const EXOTIC_LANGUAGES = [
  'Abyssal', 'Celestial', 'Deep Speech', 'Draconic', 'Infernal', 'Primordial', 'Sylvan', 'Undercommon',
] as const;

export const ALL_LANGUAGES: readonly string[] = [...STANDARD_LANGUAGES, ...EXOTIC_LANGUAGES];

const normalize = (s: string): string => s.toLowerCase().replace(/\s+/g, '');

const KEY_TO_NAME = new Map(ALL_LANGUAGES.map(l => [normalize(l), l]));

export interface LanguageGrant {
  /** Languages granted outright — no choice involved. */
  fixed: string[];
  /** Number of additional languages the player picks freely. */
  choiceCount: number;
}

const NO_GRANT: LanguageGrant = { fixed: [], choiceCount: 0 };

/**
 * Parses a race/background's raw `languageProficiencies` block. Real-world shapes:
 * fixed grants (`{"common": true}`), numeric choice counts (`{"anyStandard": 1}`),
 * a single free pick (`{"other": true}`), and a `{"choose": {"from": [...]}}` form
 * (treated as "pick 1" — the `from` restriction isn't enforced, matching this app's
 * general preference for a simpler, more permissive picker over a full rules engine).
 */
export function parseLanguageGrant(raw: unknown): LanguageGrant {
  const block = Array.isArray(raw) ? (raw[0] as Record<string, unknown> | undefined) : undefined;
  if (!block || typeof block !== 'object') return NO_GRANT;

  const fixed: string[] = [];
  let choiceCount = 0;

  for (const [key, val] of Object.entries(block)) {
    if (key === 'anyStandard' || key === 'anyExotic' || key === 'any') {
      if (typeof val === 'number') choiceCount += val;
      continue;
    }
    if (key === 'other') {
      if (val) choiceCount += 1;
      continue;
    }
    if (key === 'choose') {
      choiceCount += 1;
      continue;
    }
    if (val === true) {
      fixed.push(KEY_TO_NAME.get(normalize(key)) ?? (key.charAt(0).toUpperCase() + key.slice(1)));
    }
  }

  return { fixed, choiceCount };
}

export function mergeLanguageGrants(...grants: LanguageGrant[]): LanguageGrant {
  return {
    fixed: [...new Set(grants.flatMap(g => g.fixed))],
    choiceCount: grants.reduce((sum, g) => sum + g.choiceCount, 0),
  };
}
