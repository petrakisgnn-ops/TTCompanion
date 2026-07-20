import { rollDice } from './dice';

/**
 * One entry inside an equipment choice option. `item`/`category` quantities default to 1.
 * `currency` is always expressed in copper pieces (cp) — the raw data's `value`/
 * `containsValue` fields already use cp (e.g. 1500 = 15 gp).
 */
export type EquipmentAtom =
  | { kind: 'item'; key: string; displayName?: string; quantity: number }
  | { kind: 'special'; label: string; quantity: number }
  | { kind: 'currency'; cp: number }
  | { kind: 'category'; types: string[]; quantity: number };

/** One "equipment package slot". `options.length === 1` means there's no real choice to make. */
export interface EquipmentGroup {
  options: EquipmentAtom[][];
}

function parseAtom(raw: unknown): EquipmentAtom[] {
  if (typeof raw === 'string') {
    return [{ kind: 'item', key: raw.toLowerCase(), quantity: 1 }];
  }
  if (!raw || typeof raw !== 'object') return [];
  const r = raw as Record<string, unknown>;
  const atoms: EquipmentAtom[] = [];

  // An item ref and the currency it contains (e.g. a coin pouch) can appear on the same
  // raw entry — surface both rather than dropping the contained value.
  if (typeof r.item === 'string') {
    atoms.push({
      kind: 'item',
      key: r.item.toLowerCase(),
      displayName: typeof r.displayName === 'string' ? r.displayName : undefined,
      quantity: typeof r.quantity === 'number' ? r.quantity : 1,
    });
  }
  if (typeof r.containsValue === 'number') {
    atoms.push({ kind: 'currency', cp: r.containsValue });
  }
  if (atoms.length > 0) return atoms;

  if (typeof r.special === 'string') {
    return [{ kind: 'special', label: r.special, quantity: typeof r.quantity === 'number' ? r.quantity : 1 }];
  }
  if (typeof r.value === 'number') {
    return [{ kind: 'currency', cp: r.value }];
  }
  if (typeof r.equipmentType === 'string') {
    return [{ kind: 'category', types: [r.equipmentType], quantity: typeof r.quantity === 'number' ? r.quantity : 1 }];
  }
  if (Array.isArray(r.equipmentTypes)) {
    const types = r.equipmentTypes.filter((t): t is string => typeof t === 'string');
    if (types.length > 0) {
      return [{ kind: 'category', types, quantity: typeof r.quantity === 'number' ? r.quantity : 1 }];
    }
  }
  return [];
}

function parseOption(raw: unknown): EquipmentAtom[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap(parseAtom);
}

/**
 * Parses the shared "array of equipment groups" shape used by both a background's
 * `startingEquipment` (used directly) and a class's `startingEquipment.defaultData`
 * (extract that field first). Each group is either `{ "_": [...] }` (always granted) or a
 * lettered choice (`{ a: [...], b: [...] }` in 2014 data, `{ A: [...], B: [...] }` in 2024/XPHB
 * data) — keys are matched case-insensitively and sorted for a stable option order.
 */
export function parseEquipmentGroups(raw: unknown): EquipmentGroup[] {
  if (!Array.isArray(raw)) return [];
  const groups: EquipmentGroup[] = [];

  for (const g of raw) {
    if (!g || typeof g !== 'object') continue;
    const obj = g as Record<string, unknown>;

    if (Array.isArray(obj._)) {
      const option = parseOption(obj._);
      if (option.length > 0) groups.push({ options: [option] });
      continue;
    }

    const letterKeys = Object.keys(obj)
      .filter(k => /^[a-zA-Z]$/.test(k))
      .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
    if (letterKeys.length === 0) continue;

    const options = letterKeys.map(k => parseOption(obj[k])).filter(opt => opt.length > 0);
    if (options.length > 0) groups.push({ options });
  }

  return groups;
}

export interface GoldFormula {
  count: number;
  sides: number;
  /** Already gp-scaled (e.g. the "× 10" in "5d4 × 10") — defaults to 1 (Monk's bare "5d4"). */
  multiplier: number;
}

/**
 * Parses a class's `goldAlternative`, e.g. `"{@dice 5d4 × 10|5d4 × 10|Starting Gold}"`.
 * Extracts the dice expression from the @dice tag (or the raw string itself if untagged).
 */
export function parseGoldAlternative(raw: string | undefined): GoldFormula | null {
  if (!raw) return null;
  const tagMatch = raw.match(/\{@dice\s+([^|}]+)/);
  const expr = (tagMatch ? tagMatch[1] : raw).trim();
  const diceMatch = expr.match(/^(\d+)d(\d+)/i);
  if (!diceMatch) return null;
  const multMatch = expr.match(/[×x*]\s*(\d+)/i);
  return {
    count: Number(diceMatch[1]),
    sides: Number(diceMatch[2]),
    multiplier: multMatch ? Number(multMatch[1]) : 1,
  };
}

/** Rolls a gold formula. Result is in copper pieces (the formula's own gp-scaled multiplier × 100). */
export function rollGold(formula: GoldFormula): number {
  const sum = rollDice(formula.count, formula.sides).reduce((a, b) => a + b, 0);
  return sum * formula.multiplier * 100;
}
