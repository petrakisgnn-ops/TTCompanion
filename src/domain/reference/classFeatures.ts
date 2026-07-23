import type { Entry } from './types';

/** A `classFeature` record from a class JSON (the full, per-level feature entries). */
export interface RawClassFeature {
  name: string;
  className: string;
  classSource?: string;
  level: number;
  entries?: Entry[];
}

/** A `subclassFeature` record from a class JSON. */
export interface RawSubclassFeature {
  name: string;
  subclassShortName?: string;
  subclassSource: string;
  level: number;
  entries?: Entry[];
}

export interface LeveledFeature {
  name: string;
  level: number;
  entries: Entry[];
}

/**
 * The class features a character has gained by `level`, matched to the class by name and
 * (when the record carries one) source, ordered by the level they're gained. Pure — feed it
 * an already-loaded class JSON's `classFeature` array. Extracted from `useCharacterFeatures`
 * so it can be unit-tested and reconciled against the reference data headlessly.
 */
export function classFeaturesUpTo(
  features: RawClassFeature[] | undefined,
  className: string,
  classSource: string,
  level: number,
): LeveledFeature[] {
  return (features ?? [])
    .filter(f =>
      f.className === className &&
      (!f.classSource || f.classSource === classSource) &&
      f.level <= level,
    )
    .map(f => ({ name: f.name, level: f.level, entries: f.entries ?? [] }))
    .sort((a, b) => a.level - b.level);
}

/** The subclass features gained by `level` for a chosen subclass (matched by shortName + source). */
export function subclassFeaturesUpTo(
  features: RawSubclassFeature[] | undefined,
  subclassShortName: string,
  subclassSource: string,
  level: number,
): LeveledFeature[] {
  return (features ?? [])
    .filter(f =>
      f.subclassShortName === subclassShortName &&
      f.subclassSource === subclassSource &&
      f.level <= level,
    )
    .map(f => ({ name: f.name, level: f.level, entries: f.entries ?? [] }))
    .sort((a, b) => a.level - b.level);
}
