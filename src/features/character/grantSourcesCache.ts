import type { GrantSource } from '../../domain/rules/grantedSpells';
import type { RefId, Entry } from '../../domain/reference/types';
import type { OptionalFeatureProgressionRow } from '../../domain/rules/optionalFeatures';
import { findClassEntry, resolveClassJsonCopies, subclassOptions, subclassReprintFor, type ClassJson } from '../../domain/reference/classFeatures';

/** Race/subrace records carry a bit more than spell grants — walk speed lives here too. */
export interface RaceEntry extends GrantSource {
  speed?: unknown;
  raceName?: string;
  raceSource?: string;
}

export interface GrantSources {
  races: RaceEntry[];
  subraces: RaceEntry[];
  backgrounds: GrantSource[];
  feats: GrantSource[];
}

let cached: Promise<GrantSources> | null = null;

export interface SubclassEntry extends GrantSource {
  className?: string;
  shortName?: string;
  optionalfeatureProgression?: OptionalFeatureProgressionRow[];
}

const classJsonCache = new Map<string, Promise<ClassJson>>();

/**
 * One class's JSON (memoized), with same-file `_copy` records resolved — every consumer of
 * class features/subclasses should go through this so they all see the same data.
 */
export function fetchClassJson(className: string): Promise<ClassJson> {
  const key = className.toLowerCase();
  if (!classJsonCache.has(key)) {
    classJsonCache.set(key, (async () => {
      try {
        const res = await fetch(`${import.meta.env.BASE_URL}data/class/class-${key}.json`);
        if (!res.ok) return {};
        return resolveClassJsonCopies(await res.json() as ClassJson);
      } catch { return {}; }
    })());
  }
  return classJsonCache.get(key)!;
}

/** Fetches one class's JSON (memoized) and returns its subclass entries — used to resolve subclass spell grants (domain/oath/patron/circle). */
export function fetchClassSubclasses(className: string): Promise<SubclassEntry[]> {
  return fetchClassJson(className).then(j => (j.subclass ?? []) as SubclassEntry[]);
}

/** The class's own option-choice progression rows (Fighting Style, Invocations, ...) plus the chosen subclass's (Maneuvers, Arcane Shots, ...). */
export async function fetchOptionalFeatureRows(
  className: string,
  subclass?: RefId,
  classSource = 'PHB',
): Promise<{ classRows: OptionalFeatureProgressionRow[]; subclassRows: OptionalFeatureProgressionRow[] }> {
  const json = await fetchClassJson(className);
  // The file carries both the 2014 and 2024 class — use the character's version (2024 Warlock
  // gets invocations at level 1, 2014 at level 2).
  const cls = findClassEntry(json, className, classSource);
  const classRows = (cls?.optionalfeatureProgression ?? []) as OptionalFeatureProgressionRow[];
  const subs = (json.subclass ?? []) as SubclassEntry[];
  let subclassRows: OptionalFeatureProgressionRow[] = [];
  if (subclass) {
    const withRows = subs.filter(s => s.optionalfeatureProgression);
    const match =
      withRows.find(s => s.name === subclass.name && s.source === subclass.source) ??
      withRows.find(s => s.name === subclass.name);
    subclassRows = match?.optionalfeatureProgression ?? [];
  }
  return { classRows, subclassRows };
}

export interface OptionalFeatureEntry {
  name: string;
  source: string;
  featureType?: string[];
  prerequisite?: unknown[];
  reprintedAs?: unknown;
  entries?: Entry[];
}

let optionalFeaturesCached: Promise<OptionalFeatureEntry[]> | null = null;

/** optionalfeatures.json (fighting styles, invocations, metamagic, maneuvers, ...), fetched once. */
export function fetchOptionalFeatures(): Promise<OptionalFeatureEntry[]> {
  if (!optionalFeaturesCached) {
    optionalFeaturesCached = (async () => {
      const res = await fetch(`${import.meta.env.BASE_URL}data/optionalfeatures.json`);
      const json: { optionalfeature?: OptionalFeatureEntry[] } = await res.json();
      return json.optionalfeature ?? [];
    })();
  }
  return optionalFeaturesCached;
}

/**
 * Builds spell-grant sources for each of a character's chosen subclasses (domain/oath/
 * circle/patron spells), each gated by that class's own level via `levelOverride`.
 * The raw data lists a subclass several times (reprint stubs, `_copy` entries without
 * their own additionalSpells) — prefer an exact name+source match that actually carries
 * grants, then fall back to any same-named entry that does.
 */
export async function fetchSubclassGrantSources(
  classes: { classRef: RefId; level: number; subclass?: RefId }[],
): Promise<GrantSource[]> {
  const out: GrantSource[] = [];
  for (const cl of classes) {
    if (!cl.subclass) continue;
    const subs = await fetchClassSubclasses(cl.classRef.name);
    const withSpells = subs.filter(s => s.additionalSpells);
    const classSource = cl.classRef.source;
    const match =
      // The entry for this class version first (the 2024 class re-lists classic subclasses).
      withSpells.find(s => s.name === cl.subclass!.name && s.source === cl.subclass!.source &&
        ((s as { classSource?: string }).classSource ?? 'PHB') === classSource) ??
      withSpells.find(s => s.name === cl.subclass!.name && s.source === cl.subclass!.source) ??
      withSpells.find(s => s.name === cl.subclass!.name);
    if (match) {
      out.push({ name: match.name, source: match.source, additionalSpells: match.additionalSpells, levelOverride: cl.level });
    }
  }
  return out;
}

/** Fetches races/backgrounds/feats.json once and reuses the same promise for every caller — this reference data never changes at runtime. */
export function fetchGrantSources(): Promise<GrantSources> {
  if (!cached) {
    cached = (async () => {
      const [racesRes, bgRes, featRes] = await Promise.all([
        fetch(`${import.meta.env.BASE_URL}data/races.json`),
        fetch(`${import.meta.env.BASE_URL}data/backgrounds.json`),
        fetch(`${import.meta.env.BASE_URL}data/feats.json`),
      ]);
      const racesJson: { race: RaceEntry[]; subrace: RaceEntry[] } = await racesRes.json();
      const bgJson: { background: GrantSource[] } = await bgRes.json();
      const featJson: { feat: GrantSource[] } = await featRes.json();
      return {
        races: racesJson.race,
        subraces: racesJson.subrace,
        backgrounds: bgJson.background,
        feats: featJson.feat,
      };
    })();
  }
  return cached;
}

/** The subclasses a class version offers for an edition (reprinted classics hidden in 2024 — see subclassOptions). */
export async function fetchSubclassOptions(className: string, classSource: string, edition: '5e' | '5.5e'): Promise<RefId[]> {
  return subclassOptions(await fetchClassJson(className), classSource, edition);
}

/**
 * For a 2024 character, swaps any classic subclass that was reprinted for the 2024 class
 * (Life Domain PHB → XPHB, …) for its reprint, so features and domain spells follow the 2024
 * rules. Returns the updated classes, or null when nothing changed.
 */
export async function upgradeReprintedSubclasses(
  classes: { classRef: RefId; level: number; subclass?: RefId }[],
): Promise<{ classRef: RefId; level: number; subclass?: RefId }[] | null> {
  let changed = false;
  const out = [];
  for (const cl of classes) {
    if (!cl.subclass) { out.push(cl); continue; }
    const reprint = subclassReprintFor(await fetchClassJson(cl.classRef.name), cl.subclass, cl.classRef.source);
    if (reprint) { changed = true; out.push({ ...cl, subclass: reprint }); } else out.push(cl);
  }
  return changed ? out : null;
}
