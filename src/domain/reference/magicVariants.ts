import type { Entry, Item } from './types';

/**
 * Generic magic item variants (magicvariants.json — "+1 Weapon", "Weapon of Warning",
 * "Flame Tongue", "Armor of Resistance", …) describe a family of items; the specific
 * items ("Mace of Warning", "+1 Longsword") don't exist in items.json. This expands each
 * variant over the base items it applies to, the way 5etools' item list does. Pure.
 */

export interface MagicVariant {
  name: string;
  edition?: string;
  requires?: Record<string, unknown>[];
  excludes?: Record<string, unknown>;
  inherits: Record<string, unknown> & {
    source: string;
    namePrefix?: string;
    nameSuffix?: string;
    nameRemove?: string;
    entries?: Entry[];
  };
}

const SOURCES_2024 = new Set(['XPHB', 'XDMG', 'XMM']);

const editionOf = (source: unknown, edition: unknown): 'classic' | 'one' =>
  edition === 'one' || (edition == null && typeof source === 'string' && SOURCES_2024.has(source)) ? 'one' : 'classic';

function valueMatches(baseValue: unknown, wanted: unknown): boolean {
  if (Array.isArray(wanted)) return wanted.some(w => valueMatches(baseValue, w));
  if (Array.isArray(baseValue)) return baseValue.some(b => valueMatches(b, wanted));
  if (typeof baseValue === 'string' && typeof wanted === 'string') return baseValue.toLowerCase() === wanted.toLowerCase();
  return baseValue === wanted;
}

function appliesTo(variant: MagicVariant, base: Item): boolean {
  const reqs = variant.requires ?? [];
  if (reqs.length === 0) return false;
  const required = reqs.some(req => Object.entries(req).every(([k, v]) => valueMatches(base[k], v)));
  if (!required) return false;
  for (const [k, v] of Object.entries(variant.excludes ?? {})) {
    if (base[k] !== undefined && valueMatches(base[k], v)) return false;
  }
  return true;
}

/** Fills `{=prop}` / `{=prop/l}` templates in variant text from the generated item. */
function template(text: string, item: Record<string, unknown>, baseName: string): string {
  return text.replace(/\{=([a-zA-Z]+)(?:\/([a-z]+))?\}/g, (_m, prop: string, mod?: string) => {
    const v = prop === 'baseName' ? baseName : item[prop];
    if (typeof v !== 'string' && typeof v !== 'number') return '';
    let s = String(v);
    if (mod?.includes('l')) s = s.toLowerCase();
    if (mod?.includes('u')) s = s.toUpperCase();
    if (mod?.includes('t')) s = s.replace(/\b\w/g, c => c.toUpperCase());
    return s;
  });
}

function templateEntries(entries: Entry[], item: Record<string, unknown>, baseName: string): Entry[] {
  return entries.map(e => {
    if (typeof e === 'string') return template(e, item, baseName);
    const copy: Record<string, unknown> = { ...e };
    for (const k of ['entries', 'items'] as const) {
      if (Array.isArray(copy[k])) copy[k] = templateEntries(copy[k] as Entry[], item, baseName);
    }
    if (typeof copy.name === 'string') copy.name = template(copy.name, item, baseName);
    return copy as Entry;
  });
}

const DROP_FROM_BASE = ['srd', 'srd52', 'basicRules', 'basicRules2024', 'page', 'reprintedAs', 'referenceSources',
  'hasFluff', 'hasFluffImages', 'value', 'entries', 'edition', 'packContents', 'lootTables', '_key', 'additionalEntries'];
const VARIANT_ONLY = ['namePrefix', 'nameSuffix', 'nameRemove', 'valueExpression', 'valueMult', 'weightMult', 'weightExpression', 'barding', 'lootTables'];

/**
 * Every specific item produced by the variants over the base items. Variants only combine with
 * base items of the same edition (DMG variants × PHB weapons, XDMG × XPHB). Items whose
 * name|source collides with `existingKeys` (already a real item) are skipped.
 */
export function expandMagicVariants(baseItems: Item[], variants: MagicVariant[], existingKeys: Set<string>): Item[] {
  const out: Item[] = [];
  const seen = new Set(existingKeys);
  for (const variant of variants) {
    // A handful of variants are `_copy` chains with no `inherits` of their own — skipped.
    if (!variant.inherits?.source) continue;
    const vEdition = editionOf(variant.inherits.source, variant.edition);
    for (const base of baseItems) {
      if (editionOf(base.source, base.edition) !== vEdition) continue;
      if (!appliesTo(variant, base)) continue;

      const { inherits } = variant;
      let baseName = base.name;
      if (inherits.nameRemove) baseName = baseName.replace(inherits.nameRemove, '');
      const name = `${inherits.namePrefix ?? ''}${baseName}${inherits.nameSuffix ?? ''}`.trim();
      const key = `${name}|${inherits.source}`.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);

      const item: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(base)) if (!DROP_FROM_BASE.includes(k)) item[k] = v;
      for (const [k, v] of Object.entries(inherits)) if (!VARIANT_ONLY.includes(k) && k !== 'entries') item[k] = v;
      item.name = name;
      item.baseItem = `${base.name}|${base.source}`;
      item.variant = variant.name;
      if (inherits.entries) item.entries = templateEntries(inherits.entries, item, base.name);
      out.push(item as Item);
    }
  }
  return out;
}
