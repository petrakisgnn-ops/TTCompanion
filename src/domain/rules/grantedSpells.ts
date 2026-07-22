import type { RefId, SourceTag } from '../reference/types';
import { parseSpellChoiceQuery, type SpellChoiceQuery } from './spellChoiceQuery';

export interface GrantSource {
  name: string;
  source: SourceTag;
  additionalSpells?: unknown[];
  /**
   * Level to gate this source's grants by, when it isn't the character's total level —
   * subclass grants (domain/oath/circle spells) unlock by *class* level, so the caller
   * passes that class's level here.
   */
  levelOverride?: number;
}

interface GrantMeta {
  grantedBy: string;
  /**
   * True for innate/known grants (e.g. a race's innate cantrip, a feat's fixed spell) —
   * these are cast without a class spell slot, so they're available regardless of the
   * character's own spellcasting progression. False for "expanded spell list" grants
   * (e.g. a Strixhaven background), which only add spells to what the character can
   * learn/prepare *through* their class — still gated by the character's max spell level.
   */
  innate: boolean;
  /** Set when the grant is usable only N times per rest (a `daily`/`rest` wrapper in the source data) — absent means permanently available, no resource to track. */
  dailyUses?: number;
  resetOn?: 'longRest' | 'shortRest';
  /**
   * Set on a `fixed` grant when it's one of several mutually-exclusive named variants
   * of the same item — Strixhaven Initiate's "Lorehold 1/2/3" cantrip pairs, Circle of
   * the Land's per-terrain spell lists, Magic Initiate's per-class blocks. The app has
   * no record of which variant the player actually took, so auto-adding every fixed
   * spell across the group would over-grant (all 3 Strixhaven cantrips instead of 2,
   * every Land terrain's spells at once). These must stay manual (tap-to-add).
   */
  ambiguousVariant?: boolean;
  /**
   * Set on a fixed grant from a subclass's `prepared` block (Cleric domain spells,
   * Paladin oath spells, ...): always prepared for free, does NOT count against the
   * class's prepared-spell cap, cast using normal spell slots.
   */
  alwaysPrepared?: boolean;
}

export type GrantedSpellOption =
  | (GrantMeta & { kind: 'fixed'; spellRef: RefId })
  | (GrantMeta & { kind: 'choice'; query: SpellChoiceQuery; count: number });

interface RawFixedLeaf { kind: 'fixed'; raw: string; dailyUses?: number; resetOn?: 'longRest' | 'shortRest' }
interface RawChoiceLeaf { kind: 'choice'; query: string; count: number; dailyUses?: number; resetOn?: 'longRest' | 'shortRest' }
type RawLeaf = RawFixedLeaf | RawChoiceLeaf;

/**
 * Recursively walks an additionalSpells subtree, collecting every spell grant it finds —
 * a fixed spell-name string, or a `{choose: "level=1|class=Bard"}` query (optionally with
 * a `count`, e.g. Magic Initiate's 2 cantrips). A `daily`/`rest` wrapper anywhere in the
 * tree (`{"daily": {"1": [...]}}` = N/long rest, `{"rest": {"1": [...]}}` = N/short rest —
 * the wrapper can nest under either a `known` or `innate` block, at varying depth) marks
 * every leaf found underneath it with that per-rest use count; leaves outside any such
 * wrapper are permanently available, no resource to track.
 */
function collectLeaves(node: unknown, ctx: { dailyUses?: number; resetOn?: 'longRest' | 'shortRest' }): RawLeaf[] {
  if (typeof node === 'string') return [{ kind: 'fixed', raw: node, ...ctx }];
  if (Array.isArray(node)) return node.flatMap(n => collectLeaves(n, ctx));
  if (!node || typeof node !== 'object') return [];

  const obj = node as Record<string, unknown>;
  if ('choose' in obj) {
    const query = obj.choose;
    if (typeof query !== 'string') return [];
    const count = typeof obj.count === 'number' ? obj.count : 1;
    return [{ kind: 'choice', query, count, ...ctx }];
  }
  // `{all: "level=0|class=Wizard"}` (Eldritch Knight / Arcane Trickster expanded
  // blocks) declares "the whole filtered list is available" — that's their spell-list
  // definition, handled by SUBCLASS_CASTERS' spellList instead; the filter string must
  // not be mistaken for a spell name.
  if ('all' in obj) return [];

  const out: RawLeaf[] = [];
  for (const [key, value] of Object.entries(obj)) {
    if (key === 'daily' || key === 'rest') {
      const resetOn = key === 'daily' ? 'longRest' : 'shortRest';
      for (const [countKey, listVal] of Object.entries(value as Record<string, unknown>)) {
        // Counts are sometimes suffixed "e" (each spell in the list gets its own N uses,
        // vs a shared pool) — parseInt stops at the first non-digit, so "1e" -> 1. This app
        // always tracks per-spell independently (see plan note), so the distinction doesn't
        // need separate handling here.
        const n = parseInt(countKey, 10);
        if (!Number.isNaN(n)) out.push(...collectLeaves(listVal, { dailyUses: n, resetOn }));
      }
    } else {
      out.push(...collectLeaves(value, ctx));
    }
  }
  return out;
}

/**
 * `known`/`innate` blocks are keyed by the character level the grant unlocks at
 * ("3", "5", or "_" for "always") — e.g. a Drow's innate faerie fire only unlocks at
 * character level 3. Only descend into keys the character has actually reached.
 */
function collectLevelGated(node: unknown, characterLevel: number): RawLeaf[] {
  if (!node || typeof node !== 'object' || Array.isArray(node)) return collectLeaves(node, {});
  const out: RawLeaf[] = [];
  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    if (key === '_' || (Number.isFinite(Number(key)) && Number(key) <= characterLevel)) {
      out.push(...collectLeaves(value, {}));
    }
  }
  return out;
}

/** Parses "name[|source][#c]" into a RefId, defaulting an omitted source to the granting item's own. */
function parseSpellRef(raw: string, defaultSource: SourceTag): RefId {
  const withoutTag = raw.split('#')[0];
  const [name, source] = withoutTag.split('|');
  return { name: name.trim(), source: (source ?? defaultSource).toUpperCase() };
}

/**
 * Resolves the spell grants offered by a character's race, subrace, background, feats,
 * and subclasses (domain/oath/circle/patron spells) — both fixed spells and
 * choice-driven ones (`{choose: ...}`, e.g. Magic Initiate). Choice options aren't
 * resolved to an actual spell here — that's a player decision made through a picker
 * UI — this only describes *what* can be chosen.
 */
export function resolveGrantedSpells(
  sources: {
    race?: GrantSource | null;
    subrace?: GrantSource | null;
    background?: GrantSource | null;
    feats?: GrantSource[];
    /** Subclass entries from the class JSONs — pass each with `levelOverride` set to that class's level. */
    subclasses?: GrantSource[];
  },
  characterLevel: number,
): GrantedSpellOption[] {
  const items: GrantSource[] = [
    ...(sources.race ? [sources.race] : []),
    ...(sources.subrace ? [sources.subrace] : []),
    ...(sources.background ? [sources.background] : []),
    ...(sources.feats ?? []),
    ...(sources.subclasses ?? []),
  ];

  // A single feat can bundle grants for several mutually-exclusive variants (e.g.
  // "Strixhaven Initiate" lists cantrip pairs for all five Strixhaven colleges in one
  // file, each block named "Lorehold 1", "Prismari 1", ...). Scope to the block whose
  // name matches the character's actual background; blocks with no name always apply.
  const variantKeyword = sources.background?.name.split(' ')[0].toLowerCase();
  const hasVariantBlock = (blocks: unknown[]): boolean =>
    !!variantKeyword && blocks.some(b =>
      typeof (b as { name?: unknown } | null)?.name === 'string' &&
      (b as { name: string }).name.toLowerCase().startsWith(variantKeyword),
    );

  const seen = new Set<string>();
  const options: GrantedSpellOption[] = [];

  const addLeaf = (
    leaf: RawLeaf, item: GrantSource, grantedBy: string, innate: boolean,
    dedupGroupKey: string | undefined, ambiguousVariant: boolean,
    alwaysPrepared = false,
  ) => {
    if (leaf.kind === 'fixed') {
      const spellRef = parseSpellRef(leaf.raw, item.source);
      const key = `fixed|${spellRef.name}|${spellRef.source}`.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      options.push({
        kind: 'fixed', spellRef, grantedBy, innate, dailyUses: leaf.dailyUses, resetOn: leaf.resetOn,
        ambiguousVariant: ambiguousVariant || undefined,
        alwaysPrepared: alwaysPrepared || undefined,
      });
      return;
    }
    const query = parseSpellChoiceQuery(leaf.query);
    if (!query) return; // couldn't parse (no usable level filter) — degrade gracefully
    // Dedupe identical choices within the same variant group — Strixhaven Initiate's
    // "Lorehold 1/2/3" all offer the byte-identical 1st-level spell choice; without this
    // they'd resolve as 3 independent choices (and 3 independent 1/long-rest trackers).
    const key = `choice|${item.name}|${dedupGroupKey ?? grantedBy}|${leaf.query}|${leaf.count}|${leaf.dailyUses ?? ''}|${leaf.resetOn ?? ''}`.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    options.push({ kind: 'choice', query, count: leaf.count, grantedBy, innate, dailyUses: leaf.dailyUses, resetOn: leaf.resetOn });
  };

  for (const item of items) {
    const blocks = item.additionalSpells ?? [];
    // Only narrow to the background-matching block when this item actually *has* one —
    // e.g. Strixhaven Initiate's blocks are named after colleges, so a Lorehold
    // background narrows it down. Magic Initiate's blocks are named after *classes*
    // ("Bard Spells", "Cleric Spells", ...), which never match a background name, so
    // narrowing must not apply there — all of its variants stay visible instead (see
    // the grantedBy comment below for why: there's nowhere else to record which one
    // was actually chosen).
    const narrowToVariant = hasVariantBlock(blocks);
    const survives = (name: unknown): boolean =>
      !(narrowToVariant && typeof name === 'string' && !name.toLowerCase().startsWith(variantKeyword!));

    // Count the surviving *named* blocks: two or more named blocks in one item means
    // they're mutually-exclusive variants (Strixhaven's cantrip pairs, Magic Initiate's
    // per-class lists, Circle of the Land's per-terrain lists) — the app doesn't record
    // which one the player took, so their fixed grants must stay manual.
    let namedBlockCount = 0;
    for (const b of blocks) {
      if (!b || typeof b !== 'object') continue;
      const name = (b as Record<string, unknown>).name;
      if (typeof name === 'string' && survives(name)) namedBlockCount++;
    }

    // Subclass grants unlock by class level, not total character level.
    const gateLevel = item.levelOverride ?? characterLevel;

    for (const block of blocks) {
      if (!block || typeof block !== 'object') continue;
      const { known, innate, expanded, prepared, name: blockName } = block as Record<string, unknown>;
      if (!survives(blockName)) continue;
      // Label each named variant distinctly so they don't collide under one grantedBy key.
      const grantedBy = typeof blockName === 'string' ? `${item.name} (${blockName})` : item.name;
      // Digit-stripped group ("Lorehold 1/2/3" -> "Lorehold") keys the dedup of
      // byte-identical choices repeated across sibling variants.
      const group = typeof blockName === 'string' ? blockName.replace(/\s*\d+$/, '') : undefined;
      const ambiguousVariant = typeof blockName === 'string' && namedBlockCount > 1;
      for (const leaf of collectLevelGated(known, gateLevel)) addLeaf(leaf, item, grantedBy, true, group, ambiguousVariant);
      for (const leaf of collectLevelGated(innate, gateLevel)) addLeaf(leaf, item, grantedBy, true, group, ambiguousVariant);
      // `prepared` (subclass domain/oath spells): always-prepared for free, cast with
      // normal slots — innate=false semantics don't apply, but they ARE automatic.
      for (const leaf of collectLevelGated(prepared, gateLevel)) addLeaf(leaf, item, grantedBy, true, group, ambiguousVariant, true);
      for (const leaf of collectLeaves(expanded, {})) addLeaf(leaf, item, grantedBy, false, group, ambiguousVariant);
    }
  }

  return options;
}

/**
 * The fixed spells of a source's `expanded` blocks (a Warlock patron's expanded spell
 * list) as plain refs — used to union them into the class-list Learn/Prepare browser
 * pool, since expanded spells are *choices offered through the class list*, not
 * automatic grants.
 */
export function resolveExpandedSpellRefs(source: GrantSource): RefId[] {
  const refs: RefId[] = [];
  for (const block of source.additionalSpells ?? []) {
    if (!block || typeof block !== 'object') continue;
    const { expanded } = block as Record<string, unknown>;
    for (const leaf of collectLeaves(expanded, {})) {
      if (leaf.kind === 'fixed') refs.push(parseSpellRef(leaf.raw, source.source));
    }
  }
  return refs;
}
