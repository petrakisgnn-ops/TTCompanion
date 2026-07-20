// Canonical tool proficiency names, gathered from the toolProficiencies keys that
// actually appear across public/data/backgrounds.json (both editions grant tools).
export const ARTISAN_TOOLS = [
  "Alchemist's Supplies", "Brewer's Supplies", "Calligrapher's Supplies", "Carpenter's Tools",
  "Cartographer's Tools", "Cobbler's Tools", "Cook's Utensils", "Glassblower's Tools",
  "Jeweler's Tools", "Leatherworker's Tools", "Mason's Tools", "Painter's Supplies",
  "Potter's Tools", "Smith's Tools", "Tinker's Tools", "Weaver's Tools", "Woodcarver's Tools",
] as const;

export const GAMING_SETS = ['Dice Set', 'Playing Card Set'] as const;

export const MUSICAL_INSTRUMENTS = [
  'Bagpipes', 'Drum', 'Dulcimer', 'Flute', 'Lute', 'Lyre', 'Horn', 'Pan Flute', 'Shawm', 'Viol',
] as const;

export const OTHER_TOOLS = [
  "Thieves' Tools", 'Disguise Kit', 'Forgery Kit', 'Herbalism Kit', "Navigator's Tools", "Poisoner's Kit",
  'Vehicles (Land)', 'Vehicles (Water)', 'Vehicles (Air)', 'Vehicles (Space)',
] as const;

export const ALL_TOOLS: readonly string[] = [...ARTISAN_TOOLS, ...GAMING_SETS, ...MUSICAL_INSTRUMENTS, ...OTHER_TOOLS];

const normalize = (s: string): string => s.toLowerCase().replace(/[\s']/g, '');

const KEY_TO_NAME = new Map(ALL_TOOLS.map(t => [normalize(t), t]));

export interface ToolGrant {
  fixed: string[];
  choiceCount: number;
}

const NO_GRANT: ToolGrant = { fixed: [], choiceCount: 0 };

/**
 * Parses a background's raw `toolProficiencies` block: fixed tools (`{"thieves'
 * tools": true}`), generic choice-count categories (`anyArtisansTool`,
 * `anyGamingSet`, `anyMusicalInstrument`), and a bare `{"choose": {...}}` (+1,
 * matching parseLanguageGrant's handling of the same shape).
 */
export function parseToolGrant(raw: unknown): ToolGrant {
  const block = Array.isArray(raw) ? (raw[0] as Record<string, unknown> | undefined) : undefined;
  if (!block || typeof block !== 'object') return NO_GRANT;

  const fixed: string[] = [];
  let choiceCount = 0;

  for (const [key, val] of Object.entries(block)) {
    if (key === 'anyArtisansTool' || key === 'anyGamingSet' || key === 'anyMusicalInstrument' || key === 'any') {
      if (typeof val === 'number') choiceCount += val;
      continue;
    }
    if (key === 'choose') {
      choiceCount += 1;
      continue;
    }
    if (val === true) {
      fixed.push(KEY_TO_NAME.get(normalize(key)) ?? key.replace(/\b\w/g, c => c.toUpperCase()));
    }
  }

  return { fixed, choiceCount };
}
