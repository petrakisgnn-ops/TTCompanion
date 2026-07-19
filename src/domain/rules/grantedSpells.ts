import type { RefId, SourceTag } from '../reference/types';

export interface GrantSource {
  name: string;
  source: SourceTag;
  additionalSpells?: unknown[];
}

export interface GrantedSpellOption {
  spellRef: RefId;
  grantedBy: string;
  /**
   * True for innate/known grants (e.g. a race's innate cantrip, a feat's fixed spell) —
   * these are cast without a class spell slot, so they're available regardless of the
   * character's own spellcasting progression. False for "expanded spell list" grants
   * (e.g. a Strixhaven background), which only add spells to what the character can
   * learn/prepare *through* their class — still gated by the character's max spell level.
   */
  innate: boolean;
}

/**
 * Recursively pulls plain spell-name strings out of an additionalSpells subtree,
 * skipping the object/array wrappers ("daily", "ritual", per-day counts) that don't
 * matter for whether the spell is grantable.
 *
 * Some grants list a `{"choose": "level=1|class=cleric;wizard"}` query instead of a
 * fixed spell — that's a rules query, not a spell list, and resolving it generically
 * is out of scope, so any such node (and everything under it) is skipped.
 */
function collectSpellStrings(node: unknown): string[] {
  if (typeof node === 'string') return [node];
  if (Array.isArray(node)) return node.flatMap(collectSpellStrings);
  if (node && typeof node === 'object') {
    if ('choose' in (node as Record<string, unknown>)) return [];
    return Object.values(node as Record<string, unknown>).flatMap(collectSpellStrings);
  }
  return [];
}

/**
 * `known`/`innate` blocks are keyed by the character level the grant unlocks at
 * ("3", "5", or "_" for "always") — e.g. a Drow's innate faerie fire only unlocks at
 * character level 3. Only descend into keys the character has actually reached.
 */
function collectLevelGated(node: unknown, characterLevel: number): string[] {
  if (!node || typeof node !== 'object' || Array.isArray(node)) return collectSpellStrings(node);
  const out: string[] = [];
  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    if (key === '_' || (Number.isFinite(Number(key)) && Number(key) <= characterLevel)) {
      out.push(...collectSpellStrings(value));
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
 * Resolves the fixed spell grants (cantrips/spells you actually gain) offered by a
 * character's race, subrace, background, and feats. Choice-driven grants (the
 * `{choose: ...}` query shape) are intentionally excluded — see collectSpellStrings.
 */
export function resolveGrantedSpells(
  sources: {
    race?: GrantSource | null;
    subrace?: GrantSource | null;
    background?: GrantSource | null;
    feats?: GrantSource[];
  },
  characterLevel: number,
): GrantedSpellOption[] {
  const items: GrantSource[] = [
    ...(sources.race ? [sources.race] : []),
    ...(sources.subrace ? [sources.subrace] : []),
    ...(sources.background ? [sources.background] : []),
    ...(sources.feats ?? []),
  ];

  // A single feat can bundle grants for several mutually-exclusive variants (e.g.
  // "Strixhaven Initiate" lists cantrip pairs for all five Strixhaven colleges in one
  // file, each block named "Lorehold 1", "Prismari 1", ...). Scope to the block whose
  // name matches the character's actual background; blocks with no name always apply.
  const variantKeyword = sources.background?.name.split(' ')[0].toLowerCase();

  const seen = new Set<string>();
  const options: GrantedSpellOption[] = [];

  const add = (raw: string, item: GrantSource, innate: boolean) => {
    const spellRef = parseSpellRef(raw, item.source);
    const key = `${spellRef.name}|${spellRef.source}`.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    options.push({ spellRef, grantedBy: item.name, innate });
  };

  for (const item of items) {
    for (const block of item.additionalSpells ?? []) {
      if (!block || typeof block !== 'object') continue;
      const { known, innate, expanded, name: blockName } = block as Record<string, unknown>;
      if (
        typeof blockName === 'string' && variantKeyword &&
        !blockName.toLowerCase().startsWith(variantKeyword)
      ) continue;
      for (const raw of collectLevelGated(known, characterLevel)) add(raw, item, true);
      for (const raw of collectLevelGated(innate, characterLevel)) add(raw, item, true);
      for (const raw of collectSpellStrings(expanded)) add(raw, item, false);
    }
  }

  return options;
}
