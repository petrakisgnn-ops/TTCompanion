import type { Entry, SourceTag } from './types';

export interface RawRace {
  name: string;
  source: SourceTag;
  size?: string[];
  speed?: number | { walk?: number; fly?: number; swim?: number; climb?: number };
  entries?: Entry[];
  reprintedAs?: unknown;
  [k: string]: unknown;
}

export interface RawSubrace {
  name?: string;
  source: SourceTag;
  raceName?: string;
  raceSource?: SourceTag;
  size?: string[];
  speed?: number | { walk?: number; fly?: number; swim?: number; climb?: number };
  entries?: Entry[];
  reprintedAs?: unknown;
  _copy?: unknown;
  [k: string]: unknown;
}

export interface RaceOption {
  key: string;
  raceName: string;
  raceSource: SourceTag;
  subraceName?: string;
  subraceSource?: SourceTag;
  /** Display name — subrace name alone if it already reads standalone (e.g. "Drow"), else "Race (Subrace)". */
  name: string;
  /** Source used for edition filtering (subrace's own source when this option is a subrace). */
  source: SourceTag;
  size?: string[];
  speed?: RawRace['speed'];
  entries: Entry[];
  reprintedAs?: unknown;
}

/**
 * Merges races.json's `race` and `subrace` arrays into a flat, selectable list.
 * A race with no subraces yields one option; a race with subraces yields one option
 * per subrace, combining the parent race's traits with the subrace's own.
 *
 * Subrace entries with no `name` (pure reprint/linking metadata, e.g. the unnamed
 * "Human" subrace record used only to attach `_versions`) or a `_copy` merge directive
 * we don't resolve are skipped — they don't represent a distinct pickable choice.
 */
export function buildRaceOptions(races: RawRace[], subraces: RawSubrace[]): RaceOption[] {
  const options: RaceOption[] = [];

  for (const race of races) {
    options.push({
      key: `${race.name}|${race.source}`,
      raceName: race.name,
      raceSource: race.source,
      name: race.name,
      source: race.source,
      size: race.size,
      speed: race.speed,
      entries: race.entries ?? [],
      reprintedAs: race.reprintedAs,
    });
  }

  for (const sub of subraces) {
    if (!sub.name || sub._copy) continue;
    const parent = races.find(r => r.name === sub.raceName && r.source === sub.raceSource);
    if (!parent) continue;

    const combinedEntries = [...(parent.entries ?? []), ...(sub.entries ?? [])];

    options.push({
      key: `${sub.name}|${sub.source}::${parent.name}|${parent.source}`,
      raceName: parent.name,
      raceSource: parent.source,
      subraceName: sub.name,
      subraceSource: sub.source,
      // Subrace names range from standalone proper nouns ("Drow", "Duergar") to bare
      // adjectives meant to pair with the race ("High", "Wood", "Hill") — there's no
      // reliable way to tell those apart, so keep the parent race as separate context
      // (shown alongside `name`, e.g. as a subtitle) rather than guessing how to combine them.
      name: sub.name,
      source: sub.source,
      size: sub.size ?? parent.size,
      speed: sub.speed ?? parent.speed,
      entries: combinedEntries,
      reprintedAs: sub.reprintedAs,
    });
  }

  return options;
}
