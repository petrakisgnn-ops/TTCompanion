export type SourceTag = string;

export interface RefId {
  name: string;
  source: SourceTag;
}

export const refKey = (r: RefId): string =>
  `${r.name}|${r.source}`.toLowerCase();

export type Entry = string | EntryNode;

export interface EntryNode {
  type:
    | 'entries'
    | 'list'
    | 'table'
    | 'inset'
    | 'insetReadaloud'
    | 'quote'
    | 'section'
    | 'abilityDc'
    | 'abilityAttackMod'
    | string;
  name?: string;
  entries?: Entry[];
  /** Singular inline value on a `type: "item"` node (e.g. a background's "Skill Proficiencies: …"). */
  entry?: string;
  items?: Entry[];
  colLabels?: string[];
  rows?: Entry[][];
  [k: string]: unknown;
}

// ── Spell ──────────────────────────────────────────────────────────────────

export interface Spell {
  name: string;
  source: SourceTag;
  level: number;
  school: string;
  time: unknown[];
  range: unknown;
  components: unknown;
  duration: unknown[];
  entries: Entry[];
  entriesHigherLevel?: Entry[];
  classes?: unknown;
  reprintedAs?: unknown;
}

// ── Monster ────────────────────────────────────────────────────────────────

export type MonsterType =
  | string
  | { type: string; tags?: string[]; swarmSize?: string };

export type CrValue = string | { cr: string; xp?: number };

export interface MonsterBlock {
  name: string;
  entries: Entry[];
}

export interface Monster {
  name: string;
  source: SourceTag;
  size: string[];
  type: MonsterType;
  alignment?: string[];
  ac: unknown[];
  hp: { average: number; formula: string };
  speed: unknown;
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
  save?: Record<string, string>;
  skill?: Record<string, string>;
  senses?: string[];
  passive?: number;
  languages?: string[];
  immune?: unknown[];
  resist?: unknown[];
  conditionImmune?: unknown[];
  vulnerable?: unknown[];
  cr: CrValue;
  trait?: MonsterBlock[];
  action?: MonsterBlock[];
  reaction?: MonsterBlock[];
  legendary?: MonsterBlock[];
  legendaryHeader?: string[];
  spellcasting?: unknown[];
}

// ── Item ───────────────────────────────────────────────────────────────────

export interface Item {
  name: string;
  source: SourceTag;
  type?: string;
  rarity?: string;
  requiresAttunement?: string | boolean;
  reqAttune?: string | boolean;
  wondrous?: boolean;
  entries?: Entry[];
  [k: string]: unknown;
}

// ── Display helpers (pure functions, no React) ─────────────────────────────

export function monsterTypeStr(type: MonsterType | undefined | null): string {
  if (type == null) return '—';
  if (typeof type === 'string') return type;
  const base = type.type;
  if (type.swarmSize) return `swarm of ${type.swarmSize} ${base}s`;
  if (type.tags && type.tags.length > 0) return `${base} (${type.tags.join(', ')})`;
  return base;
}

export function crStr(cr: CrValue | undefined | null): string {
  if (cr == null) return '—';
  if (typeof cr === 'string') return cr;
  return cr.cr;
}

export function parseCr(cr: CrValue | undefined | null): number {
  const s = crStr(cr);
  if (s.includes('/')) {
    const [num, den] = s.split('/').map(Number);
    return (num ?? 0) / (den ?? 1);
  }
  return Number(s) || 0;
}

export function acStr(ac: unknown[]): string {
  if (!ac || ac.length === 0) return '—';
  const first = ac[0];
  if (typeof first === 'number') return String(first);
  if (first && typeof first === 'object') {
    const a = first as { ac?: number };
    return String(a.ac ?? '—');
  }
  return '—';
}

export function speedStr(speed: unknown): string {
  if (!speed || typeof speed !== 'object') return '—';
  const s = speed as Record<string, number | { number: number }>;
  return Object.entries(s)
    .map(([mode, val]) => {
      const n = typeof val === 'number' ? val : val.number;
      return mode === 'walk' ? `${n} ft.` : `${mode} ${n} ft.`;
    })
    .join(', ');
}

const ALIGN_MAP: Record<string, string> = {
  L: 'lawful', N: 'neutral', C: 'chaotic',
  G: 'good', E: 'evil',
  U: 'unaligned', A: 'any alignment',
  NX: 'neutral', NY: 'neutral',
};

export function alignmentStr(alignment?: string[]): string {
  if (!alignment || alignment.length === 0) return '';
  return alignment.map(a => ALIGN_MAP[a] ?? a.toLowerCase()).join(' ');
}
