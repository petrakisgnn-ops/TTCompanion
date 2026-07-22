/**
 * Class option-choices (fighting styles, Eldritch Invocations, Metamagic, Battle
 * Master maneuvers, Artificer infusions, ...) — driven by the class/subclass JSONs'
 * `optionalfeatureProgression` rows, whose entries in optionalfeatures.json are
 * matched by `featureType` code (FS:F, EI, MM, MV:B, AI, ...).
 */

export interface OptionalFeatureProgressionRow {
  name: string;
  featureType: string[];
  /** Either a per-level array (index 0 = level 1) or a sparse `{level: count}` map. */
  progression: number[] | Record<string, number>;
}

export interface OptionalFeatureSlotGroup {
  /** Display name of the choice group, e.g. "Eldritch Invocations". */
  name: string;
  featureTypes: string[];
  /** How many the class knows at this level. */
  max: number;
}

function countAt(progression: OptionalFeatureProgressionRow['progression'], level: number): number {
  if (Array.isArray(progression)) {
    const idx = Math.min(Math.max(level, 1), progression.length) - 1;
    return progression[idx] ?? 0;
  }
  let count = 0;
  for (const [at, n] of Object.entries(progression)) {
    const threshold = Number(at);
    if (Number.isFinite(threshold) && level >= threshold && typeof n === 'number') count = Math.max(count, n);
  }
  return count;
}

/** The option groups (with known-counts) a class + chosen subclass offer at a given class level. Groups with 0 slots at this level are omitted. */
export function optionalFeatureSlots(
  classRows: OptionalFeatureProgressionRow[] | undefined,
  subclassRows: OptionalFeatureProgressionRow[] | undefined,
  classLevel: number,
): OptionalFeatureSlotGroup[] {
  const groups: OptionalFeatureSlotGroup[] = [];
  for (const row of [...(classRows ?? []), ...(subclassRows ?? [])]) {
    const max = countAt(row.progression, classLevel);
    if (max > 0) groups.push({ name: row.name, featureTypes: row.featureType, max });
  }
  return groups;
}
