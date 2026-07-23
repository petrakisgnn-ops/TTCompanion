/** The rules edition a character or piece of content follows. `5e` = 2014 PHB, `5.5e` = 2024 PHB. */
export type Edition = '5e' | '5.5e';

/** Sources that belong to the 2024 (5.5e / One D&D) core rules. */
const SOURCES_2024 = new Set(['XPHB', 'XDMG', 'XMM']);

/**
 * Returns true if an entry should be shown for the given edition.
 *
 * 5e:   show everything EXCEPT 2024-source content.
 * 5.5e: show 2024-source content; for classic-source content, hide it only
 *        when it has been reprinted in a 2024 source (reprintedAs contains a
 *        2024 key like "Fireball|XPHB").  Content that was never reprinted
 *        (e.g. XGE / TCE exclusives) stays visible in both modes.
 */
export function matchesEdition(
  source: string,
  reprintedAs: unknown,
  edition: Edition,
): boolean {
  const is2024 = SOURCES_2024.has(source);

  if (edition === '5e') {
    return !is2024;
  }

  // 5.5e mode
  if (is2024) return true;

  // Classic source: hide only if reprinted in a 2024 source. Entries are usually
  // plain "Name|SOURCE" strings, but some (e.g. Eberron dragonmark subraces
  // reprinted as feats) are `{uid, tag}` objects instead — only strings count here.
  const reprints: unknown[] = Array.isArray(reprintedAs) ? reprintedAs : [];
  const hasXphbReprint = reprints.some(r =>
    typeof r === 'string' && [...SOURCES_2024].some(s => r.toUpperCase().includes(s)),
  );
  return !hasXphbReprint;
}
