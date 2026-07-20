import type { Entry } from '../reference/types';

/**
 * NPC traits/actions/reactions are authored as free text (blank-line-separated
 * blocks, optionally "Name: body") and converted to Entry[] so they render
 * through the same @tag engine the compendium uses — no mechanical attack
 * builder, matching the app's bookkeeping-tool philosophy.
 */
export function entriesToText(entries?: Entry[]): string {
  if (!entries) return '';
  return entries
    .map(e => {
      if (typeof e === 'string') return e;
      const name = e.name ? `${e.name}: ` : '';
      const body = (e.entries ?? []).map(x => (typeof x === 'string' ? x : '')).join(' ');
      return `${name}${body}`;
    })
    .join('\n\n');
}

export function textToEntries(text: string): Entry[] | undefined {
  const blocks = text.split(/\n\s*\n/).map(b => b.trim()).filter(Boolean);
  if (blocks.length === 0) return undefined;
  return blocks.map((block): Entry => {
    const m = block.match(/^([^:\n]{1,60}):\s*([\s\S]*)$/);
    if (m) return { type: 'entries', name: m[1].trim(), entries: [m[2].trim()] };
    return block;
  });
}
