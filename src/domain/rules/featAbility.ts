import type { AbilityScores } from '../character/types';
import type { AbilityKey } from './classData';

export interface FeatAbilityGrant {
  /** Ability increases the feat applies unconditionally (e.g. Heavy Armor Master's +1 STR). */
  fixed: Partial<AbilityScores>;
  /** A player-chosen increase (e.g. Resilient: +1 to one of the listed abilities). */
  choice?: { from: AbilityKey[]; amount: number; count: number };
}

const ABILITY_KEYS: AbilityKey[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

function isAbilityKey(k: string): k is AbilityKey {
  return (ABILITY_KEYS as string[]).includes(k);
}

/**
 * Parses a feat's `ability` field into the increases it grants. Verified shapes in
 * feats.json:
 *  - `[{"str": 1}]` — fixed increase (22 feats)
 *  - `[{"choose": {"from": [...], "amount": 1}}]` — choose one of a list (Resilient, Fey Touched, ...)
 *  - `{"choose": ["int","wis","cha"]}` — bare-array choose, seen on some XPHB feats
 * Unrecognized shapes contribute nothing (degrade gracefully). Returns null when the
 * feat grants no ability increase at all.
 */
export function parseFeatAbility(ability: unknown): FeatAbilityGrant | null {
  if (!ability) return null;
  const entries = Array.isArray(ability) ? ability : [ability];

  const fixed: Partial<AbilityScores> = {};
  let choice: FeatAbilityGrant['choice'];

  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') continue;
    const obj = entry as Record<string, unknown>;

    for (const [key, value] of Object.entries(obj)) {
      if (isAbilityKey(key) && typeof value === 'number') {
        fixed[key] = (fixed[key] ?? 0) + value;
      }
    }

    if ('choose' in obj && !choice) {
      const raw = obj.choose;
      if (Array.isArray(raw)) {
        const from = raw.filter((k): k is AbilityKey => typeof k === 'string' && isAbilityKey(k));
        if (from.length > 0) choice = { from, amount: 1, count: 1 };
      } else if (raw && typeof raw === 'object') {
        const c = raw as { from?: unknown; amount?: unknown; count?: unknown };
        const from = Array.isArray(c.from)
          ? c.from.filter((k): k is AbilityKey => typeof k === 'string' && isAbilityKey(k))
          : [];
        if (from.length > 0) {
          choice = {
            from,
            amount: typeof c.amount === 'number' ? c.amount : 1,
            count: typeof c.count === 'number' ? c.count : 1,
          };
        }
      }
    }
  }

  if (Object.keys(fixed).length === 0 && !choice) return null;
  return { fixed, choice };
}
