import type { Spell } from '../reference/types';

export interface SpellChoiceQuery {
  levels: number[];
  /** Any one of these classes' lists qualifies (5etools encodes "cleric;wizard" as "either works", not a single class named that). */
  classFilter?: string[];
  schoolFilter?: string[];
}

/**
 * Parses a 5etools `{choose: "..."}` filter string, e.g. "level=1|class=Bard" or
 * "level=1|class=cleric;wizard" or "level=1|school=E;D". Pipe-separated filters,
 * semicolon-separated alternatives within a filter — including `class`, which can list
 * more than one eligible class. Unrecognized filter keys are ignored (the query still
 * resolves on the keys it does understand) — degrades gracefully rather than throwing,
 * same precedent as the `@tag` renderer's unknown-tag handling.
 */
export function parseSpellChoiceQuery(raw: string): SpellChoiceQuery | null {
  const parts = raw.split('|');
  let levels: number[] | null = null;
  let classFilter: string[] | undefined;
  let schoolFilter: string[] | undefined;

  for (const part of parts) {
    const [key, value] = part.split('=');
    if (!key || !value) continue;
    switch (key.trim()) {
      case 'level':
        levels = value.split(';').map(Number).filter(n => !Number.isNaN(n));
        break;
      case 'class':
        classFilter = value.split(';').map(c => c.trim());
        break;
      case 'school':
        schoolFilter = value.split(';').map(s => s.trim());
        break;
    }
  }

  if (!levels || levels.length === 0) return null; // level is the one filter we require
  return { levels, classFilter, schoolFilter };
}

export function matchesSpellChoiceQuery(spell: Pick<Spell, 'level' | 'school'>, query: SpellChoiceQuery): boolean {
  if (!query.levels.includes(spell.level)) return false;
  if (query.schoolFilter && !query.schoolFilter.includes(spell.school)) return false;
  return true;
}
