import type { Entry, SourceTag } from './types';

export interface RawRace {
  name: string;
  source: SourceTag;
  size?: string[];
  speed?: number | { walk?: number; fly?: number; swim?: number; climb?: number };
  entries?: Entry[];
  reprintedAs?: unknown;
  ability?: unknown;
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
  ability?: unknown;
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
  /** Raw `ability` block from the race record (Human-quirk-resolved — see buildRaceOptions). */
  raceAbility?: unknown;
  /** Raw `ability` block from the subrace record, if this option is a subrace. */
  subraceAbility?: unknown;
  /** Raw `feats` grant (2024 species Origin-feat choice, e.g. Human's `anyFromCategory`). */
  feats?: unknown;
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
    // Some races (notably Human|PHB, whose +1-to-all-abilities bonus lives here) split
    // their `ability` data onto an unnamed linking subrace record rather than the race
    // record itself. Fall back to that record's `ability` when the race's own is absent.
    const linkedAbility = race.ability ?? subraces.find(
      s => !s.name && s.raceName === race.name && s.raceSource === race.source,
    )?.ability;

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
      raceAbility: linkedAbility,
      feats: race.feats,
    });
  }

  for (const sub of subraces) {
    if (!sub.name || sub._copy) continue;
    const parent = races.find(r => r.name === sub.raceName && r.source === sub.raceSource);
    if (!parent) continue;

    const combinedEntries = [...(parent.entries ?? []), ...(sub.entries ?? [])];
    // Only inherit the race's own direct `ability` block here (e.g. Elf's +2 Dex,
    // which High/Wood Elf/Drow genuinely stack on top of). The "unnamed linking
    // subrace" fallback used above is Human-specific and represents the *no-subrace-
    // chosen* bonus — it must NOT leak into named subraces like "Variant", "Keldon",
    // or the Eberron dragonmarks, which are complete replacement packages (e.g.
    // Variant Human's choose-2 ASI replaces the +1-to-all entirely; it doesn't stack
    // with it).
    const parentAbility = parent.ability;

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
      raceAbility: parentAbility,
      subraceAbility: sub.ability,
      feats: sub.feats ?? parent.feats,
    });
  }

  return options;
}
