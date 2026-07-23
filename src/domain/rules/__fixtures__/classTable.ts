/**
 * Turns a class entry's `classTableGroups` into per-level numeric columns the reconciliation
 * suite can compare against the app's tables. Test-only (paired with classJson.ts).
 */
import type { RawTableGroup } from './classJson';

/** Strips 5etools `{@tag Label|...}` markup down to its display label. */
export function parseLabel(raw: string): string {
  return raw.replace(/\{@\w+\s+([^|}]+)[^}]*\}/, '$1').trim();
}

/**
 * Parses one table cell to a plain number, or null when it isn't one:
 *  - number → itself
 *  - "2" (numeric string) → 2
 *  - "{@filter 3rd|...}" / "5th" (ordinal, e.g. Warlock Slot Level) → 3 / 5
 *  - "Unlimited" and other sentinels → null
 *  - {type:'bonus'|'dice'|'bonusSpeed', …} (Rage Damage, Martial Arts, Unarmored Movement) → null
 */
export function parseCell(cell: unknown): number | null {
  if (typeof cell === 'number') return cell;
  if (typeof cell === 'string') {
    const s = parseLabel(cell);
    if (/^\d+$/.test(s)) return Number(s);
    const ord = /^(\d+)(?:st|nd|rd|th)$/.exec(s);
    if (ord) return Number(ord[1]);
    return null;
  }
  return null;
}

export interface ExtractedClassTable {
  /** label → 20 per-level values; null cells (e.g. Barbarian "Unlimited" rages) are preserved. */
  columns: Record<string, (number | null)[]>;
  /** Columns whose every cell is non-numeric (dice/bonus/speed) — nothing to reconcile. */
  nonNumericColumns: string[];
  /** The Spell-Slots-per-level matrix (20 × 9) from a rowsSpellProgression group, or null. */
  spellSlots: number[][] | null;
}

/** Extracts numeric columns + the spell-slot matrix from a class entry's table groups. */
export function extractClassTable(tableGroups: RawTableGroup[] | undefined): ExtractedClassTable {
  const columns: Record<string, (number | null)[]> = {};
  const nonNumericColumns: string[] = [];
  let spellSlots: number[][] | null = null;

  for (const group of tableGroups ?? []) {
    if (group.rowsSpellProgression) {
      spellSlots = group.rowsSpellProgression;
      continue;
    }
    const labels = (group.colLabels ?? []).map(parseLabel);
    const rows = group.rows ?? [];
    labels.forEach((label, col) => {
      const values = rows.map(row => parseCell(row[col]));
      if (values.every(v => v === null)) nonNumericColumns.push(label);
      else columns[label] = values;
    });
  }

  return { columns, nonNumericColumns, spellSlots };
}

/**
 * Class-table columns the app deliberately does not model (no field on Character) — the
 * reconciliation suite skips these instead of asserting on them. Anything a class table
 * exposes that is neither reconciled nor listed here must fail the suite, so new data can't
 * slip through untested. Grow this list (with justification) as Phase 3 triages each class.
 */
export const UNMODELED_COLUMNS: ReadonlySet<string> = new Set([
  'Rage Damage',          // Barbarian — not tracked
  'Martial Arts',         // Monk — die size, not tracked
  'Unarmored Movement',   // Monk — bonus speed, not tracked
  'Sneak Attack',         // Rogue — dice, not tracked
  'Infused Items',        // Artificer — max active infusions (attunement), not tracked
]);
