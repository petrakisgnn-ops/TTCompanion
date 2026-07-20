import type { AbilityScores } from '../character/types';

export type AbilityKey = keyof AbilityScores;

const ABILITY_KEYS: readonly AbilityKey[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

function isAbilityKey(k: string): k is AbilityKey {
  return (ABILITY_KEYS as readonly string[]).includes(k);
}

export interface ChooseClause {
  from: AbilityKey[];
  count: number;
  amount: number;
}

export interface RaceAbilityGrant {
  fixed: Partial<AbilityScores>;
  choose?: ChooseClause;
}

/**
 * Parses a 2014-style race/subrace `ability` block: fixed numeric bonuses
 * (`{"str": 1}`) plus an optional `choose` clause (`{"from": [...], "count"?, "amount"?}`,
 * defaulting to picking 1 ability for +1 when those are omitted — matches the shape
 * seen on e.g. `Custom Lineage|TCE`, which only specifies `amount`).
 */
export function parseFixedAndChoose(ability: unknown): RaceAbilityGrant {
  const block = Array.isArray(ability) ? (ability[0] as Record<string, unknown> | undefined) : undefined;
  if (!block || typeof block !== 'object') return { fixed: {} };

  const fixed: Partial<AbilityScores> = {};
  let choose: ChooseClause | undefined;

  for (const [key, val] of Object.entries(block)) {
    if (key === 'choose' && val && typeof val === 'object') {
      const c = val as { from?: unknown; count?: number; amount?: number };
      const from = Array.isArray(c.from) ? c.from.filter((k): k is AbilityKey => typeof k === 'string' && isAbilityKey(k)) : [];
      choose = { from, count: c.count ?? 1, amount: c.amount ?? 1 };
      continue;
    }
    if (isAbilityKey(key) && typeof val === 'number') {
      fixed[key] = (fixed[key] ?? 0) + val;
    }
  }

  return { fixed, choose };
}

/** Sums two race/subrace grants (their fixed parts combine; only one is expected to carry a `choose`). */
export function mergeRaceAbilityGrants(a: RaceAbilityGrant, b: RaceAbilityGrant): RaceAbilityGrant {
  const fixed: Partial<AbilityScores> = { ...a.fixed };
  for (const [key, val] of Object.entries(b.fixed)) {
    const k = key as AbilityKey;
    fixed[k] = (fixed[k] ?? 0) + (val ?? 0);
  }
  return { fixed, choose: a.choose ?? b.choose };
}

export interface AbilityPattern {
  label: string;
  from: AbilityKey[];
  weights: number[];
}

/**
 * Parses a 2024-style background `ability` block: an array of alternative
 * "weighted choose" patterns (typically one +2/+1 split and one +1/+1/+1 split)
 * over a background-specific 3-ability pool, e.g. `Acolyte|XPHB`.
 */
export function parseBackgroundAbilityPatterns(ability: unknown): AbilityPattern[] {
  if (!Array.isArray(ability)) return [];
  const patterns: AbilityPattern[] = [];

  for (const block of ability) {
    const choose = (block as Record<string, unknown> | undefined)?.choose as
      | { weighted?: { from?: unknown; weights?: unknown } }
      | undefined;
    const weighted = choose?.weighted;
    if (!weighted) continue;
    const from = Array.isArray(weighted.from)
      ? weighted.from.filter((k): k is AbilityKey => typeof k === 'string' && isAbilityKey(k))
      : [];
    const weights = Array.isArray(weighted.weights) ? weighted.weights.filter((w): w is number => typeof w === 'number') : [];
    if (from.length === 0 || weights.length === 0) continue;
    const label = weights.every(w => w === weights[0]) ? weights.map(() => `+${weights[0]}`).join('/') : weights.map(w => `+${w}`).join('/');
    patterns.push({ label, from, weights });
  }

  return patterns;
}
