import type { Entry, Item, RefId } from '../reference/types';

/**
 * A player-made item (homebrew, or a magic item missing from the reference data), owned by
 * one character. It's user data, not reference data — it lives on the Character and is
 * converted to the reference `Item` shape only at render time (`customItemToItem`) so the
 * inventory, attacks and AC code can treat every item the same way.
 */
export type CustomItemKind = 'weapon' | 'armor' | 'shield' | 'other';

export interface CustomItem {
  id: string;
  name: string;
  kind: CustomItemKind;
  /** A reference item this is a version of (e.g. Mace) — damage dice, properties, armor AC come from it. */
  baseItem?: RefId;
  rarity: string;
  requiresAttunement: boolean;
  /** Magic bonus to attack rolls (weapons). */
  attackBonus: number;
  /** Magic bonus to damage rolls (weapons). */
  damageBonus: number;
  /** Overrides the base item's damage dice, e.g. "1d8". */
  damageDice?: string;
  /** Overrides the base item's damage type: a 5etools code (B/P/S) or any word ("radiant"). */
  damageType?: string;
  /** Extra damage on a hit, e.g. "1d6 radiant". */
  extraDamage?: string;
  /** Uses DEX instead of STR when better (finesse). */
  finesse: boolean;
  /** Ranged weapon (always DEX). */
  ranged: boolean;
  /** Bonus to AC while equipped (magic armor/shield, or e.g. a ring). */
  acBonus: number;
  /** Base AC for armor / flat bonus for a shield when there's no base item. */
  baseAc?: number;
  weight?: number;
  description: string;
}

/** The `source` every custom item ref uses — `{ name, source: CUSTOM_ITEM_SOURCE }`. */
export const CUSTOM_ITEM_SOURCE = 'Custom';

export const isCustomRef = (ref: RefId): boolean => ref.source === CUSTOM_ITEM_SOURCE;

export const customItemRef = (item: Pick<CustomItem, 'name'>): RefId => ({ name: item.name, source: CUSTOM_ITEM_SOURCE });

export function blankCustomItem(id: string): CustomItem {
  return {
    id, name: '', kind: 'weapon', rarity: 'none', requiresAttunement: false,
    attackBonus: 0, damageBonus: 0, finesse: false, ranged: false, acBonus: 0, description: '',
  };
}

const signed = (n: number) => (n >= 0 ? `+${n}` : String(n));

/** Fields of a base item that describe the *reference* record itself and must not leak into a custom one. */
const REFERENCE_ONLY = ['srd', 'srd52', 'basicRules', 'basicRules2024', 'page', 'reprintedAs', 'referenceSources',
  'hasFluff', 'hasFluffImages', 'value', '_key', 'lootTables', 'entries', 'additionalEntries'];

/** Converts a custom item (+ its resolved base item, if any) to the reference Item shape. */
export function customItemToItem(c: CustomItem, base?: Item | null): Item {
  const inherited: Record<string, unknown> = {};
  if (base) {
    for (const [k, v] of Object.entries(base)) if (!REFERENCE_ONLY.includes(k)) inherited[k] = v;
  }

  const item: Item = {
    ...inherited,
    name: c.name,
    source: CUSTOM_ITEM_SOURCE,
    rarity: c.rarity || 'none',
  };
  if (c.requiresAttunement) item.reqAttune = true; else delete item.reqAttune;
  if (base) item.baseItem = `${base.name}|${base.source}`;

  const props = new Set<string>(((inherited.property as string[] | undefined) ?? []).map(p => p.split('|')[0]));

  if (c.kind === 'weapon') {
    if (!base) {
      item.type = c.ranged ? 'R' : 'M';
      item.weaponCategory = 'simple';
      item.weapon = true;
    }
    if (c.damageDice?.trim()) item.dmg1 = c.damageDice.trim();
    if (c.damageType?.trim()) item.dmgType = c.damageType.trim();
    if (c.finesse) props.add('F');
    if (c.ranged && !base) props.add('A');
    if (c.attackBonus) item.bonusWeaponAttack = signed(c.attackBonus);
    if (c.damageBonus) item.bonusWeaponDamage = signed(c.damageBonus);
    if (c.extraDamage?.trim()) item.extraDamage = c.extraDamage.trim();
  } else if (c.kind === 'armor' || c.kind === 'shield') {
    if (!base) {
      item.type = c.kind === 'shield' ? 'S' : 'MA';
      if (c.baseAc != null) item.ac = c.baseAc;
    }
  } else if (!base) {
    item.type = 'G';
  }
  if (props.size > 0) item.property = [...props];
  if (c.acBonus) item.bonusAc = signed(c.acBonus);
  if (c.weight != null) item.weight = c.weight;

  const paragraphs: Entry[] = c.description.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  if (paragraphs.length) item.entries = paragraphs;
  item._custom = true;
  return item;
}

/** A short one-line summary for lists, e.g. "Mace · +1 atk / +1 dmg". */
export function customItemSummary(c: CustomItem): string {
  const parts: string[] = [];
  if (c.baseItem) parts.push(c.baseItem.name);
  if (c.kind === 'weapon' && (c.attackBonus || c.damageBonus)) {
    parts.push(c.attackBonus === c.damageBonus ? `${signed(c.attackBonus)} weapon` : `${signed(c.attackBonus)} atk / ${signed(c.damageBonus)} dmg`);
  }
  if (c.acBonus) parts.push(`${signed(c.acBonus)} AC`);
  if (c.requiresAttunement) parts.push('attunement');
  return parts.join(' · ');
}
