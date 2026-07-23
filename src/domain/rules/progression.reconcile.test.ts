import { describe, expect, it } from 'vitest';
import { rewardSnapshot, type RewardSnapshot } from './progression';
import { CLASSES } from './classData';
import { loadClassJson, pickClassEntry } from './__fixtures__/classJson';
import { extractClassTable, UNMODELED_COLUMNS } from './__fixtures__/classTable';

const ALL_CLASSES = CLASSES.map(c => c.name);

// Reference-JSON column → app value.
const RESOURCE_COLUMNS: Record<string, string> = {
  'Rages': 'rage',
  'Ki Points': 'ki',
  'Sorcery Points': 'sorcery-points',
};
const VALUE_COLUMNS: Record<string, (s: RewardSnapshot) => number | null> = {
  'Cantrips Known': s => s.cantripsKnown,
  'Spells Known': s => s.spellsKnown,
  'Spell Slots': s => s.pactSlots?.count ?? null, // Warlock pact slot count
  'Slot Level': s => s.pactSlots?.level ?? null,  // Warlock pact slot level
};
// Optional-feature counts — reconciled against optionalFeatureSlots in progression.features.test.ts,
// not against rewardSnapshot (which doesn't carry them), so skipped here.
const DEFERRED_COLUMNS = new Set(['Invocations Known', 'Infusions Known']);

/** Trailing zeros in a spell-progression row are "no slots of that level" — the app's slot
 * array is the non-zero prefix (slot levels are always contiguous from 1st). */
function trimTrailingZeros(row: number[]): number[] {
  let end = row.length;
  while (end > 0 && row[end - 1] === 0) end--;
  return row.slice(0, end);
}

describe('class-table reconciliation (app tables ↔ reference JSON)', () => {
  it.each(ALL_CLASSES)('%s: spell-slot matrix matches', cls => {
    const { spellSlots } = extractClassTable(pickClassEntry(loadClassJson(cls)).classTableGroups);
    if (!spellSlots) return; // non-caster or pact caster (reconciled via columns)
    for (let level = 1; level <= 20; level++) {
      expect(rewardSnapshot(cls, level).spellSlots, `${cls} slots @${level}`)
        .toEqual(trimTrailingZeros(spellSlots[level - 1]));
    }
  });

  it.each(ALL_CLASSES)('%s: numeric columns match', cls => {
    const { columns } = extractClassTable(pickClassEntry(loadClassJson(cls)).classTableGroups);
    for (const [label, values] of Object.entries(columns)) {
      if (DEFERRED_COLUMNS.has(label) || UNMODELED_COLUMNS.has(label)) continue;

      const resourceId = RESOURCE_COLUMNS[label];
      const valueGet = VALUE_COLUMNS[label];

      for (let level = 1; level <= 20; level++) {
        const cell = values[level - 1]; // number | null
        const snap = rewardSnapshot(cls, level);
        const where = `${cls} · ${label} @${level}`;

        if (resourceId) {
          const appVal = snap.resources[resourceId];
          if (cell === null) {
            // "Unlimited" sentinel (Barbarian rage @20) → the app omits the pool entirely.
            expect(appVal, `${where} should be untracked`).toBeUndefined();
          } else {
            // Resource absent at a level == 0 uses of it.
            expect(appVal ?? 0, where).toBe(cell);
          }
        } else if (valueGet) {
          expect(valueGet(snap), where).toBe(cell);
        }
      }
    }
  });

  // The safety net: no class-table column may slip through untested. Every column the data
  // exposes must be reconciled, explicitly deferred, or on the unmodeled skip-allowlist.
  it.each(ALL_CLASSES)('%s: every column is accounted for', cls => {
    const { columns, nonNumericColumns } = extractClassTable(
      pickClassEntry(loadClassJson(cls)).classTableGroups,
    );
    const isHandled = (label: string) =>
      label in RESOURCE_COLUMNS || label in VALUE_COLUMNS ||
      DEFERRED_COLUMNS.has(label) || UNMODELED_COLUMNS.has(label);

    for (const label of Object.keys(columns)) {
      expect(isHandled(label), `unrecognized column "${label}" in ${cls}`).toBe(true);
    }
    for (const label of nonNumericColumns) {
      expect(
        UNMODELED_COLUMNS.has(label) || DEFERRED_COLUMNS.has(label),
        `unrecognized non-numeric column "${label}" in ${cls}`,
      ).toBe(true);
    }
  });
});
