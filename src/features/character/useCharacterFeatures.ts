import { useEffect, useState } from 'react';
import { extractFeatures, type FeatureEntry } from '../../domain/reference/features';
import { buildClassFeatures, type BuiltClassFeatures, type FeatureChoice } from '../../domain/reference/classFeatures';
import { fetchClassJson } from './grantSourcesCache';
import { buildRaceOptions, type RawRace, type RawSubrace } from '../../domain/reference/races';
import type { Character, ClassLevel } from '../../domain/character/types';

interface BgEntry {
  name: string;
  source: string;
  entries?: FeatureEntry['entries'];
}

export interface FeatureRow extends FeatureEntry {
  badge?: string;
  level?: number;
}

export interface FeatureGroup {
  title: string;
  features: FeatureRow[];
}

/**
 * Stable identity for a feature within a character, used to remember which ones the player hid from
 * the home widget. Group title + feature name + level disambiguates repeats like "Ability Score
 * Improvement" that recur at several levels of the same class.
 */
export function featureKey(groupTitle: string, feature: FeatureRow): string {
  return `${groupTitle}|${feature.title}|${feature.level ?? ''}`;
}

/** Fetches and groups a character's race, background, and per-class (+subclass) features, gated to the levels they've actually reached. */
export function useCharacterFeatures(character: Character): FeatureGroup[] {
  const [raceFeatures, setRaceFeatures] = useState<FeatureRow[]>([]);
  const [bgFeatures, setBgFeatures] = useState<FeatureRow[]>([]);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/races.json`)
      .then(r => r.json())
      .then((json: { race: RawRace[]; subrace: RawSubrace[] }) => {
        const options = buildRaceOptions(json.race, json.subrace);
        const match = character.subrace
          ? options.find(o => o.subraceName === character.subrace!.name && o.subraceSource === character.subrace!.source)
          : options.find(o => !o.subraceName && o.raceName === character.race.name && o.raceSource === character.race.source);
        const title = character.subrace ? `${character.subrace.name} (${character.race.name})` : character.race.name;
        setRaceFeatures(match ? extractFeatures(match.entries, title) : []);
      });
  }, [character.race, character.subrace]);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/backgrounds.json`)
      .then(r => r.json())
      .then((json: { background: BgEntry[] }) => {
        const match = json.background.find(
          b => b.name === character.background.name && b.source === character.background.source,
        );
        setBgFeatures(match ? extractFeatures(match.entries ?? [], match.name) : []);
      });
  }, [character.background]);

  const built = useBuiltClassFeatures(character.classes, character.featureChoices);
  const classSections: FeatureGroup[] = built.map(({ cl, result }) => ({
    title: cl.classRef.name,
    features: result.features.map(f => ({
      title: f.name,
      entries: f.entries,
      level: f.level,
      badge: f.optional ? `Lvl ${f.level} · Optional` : `Lvl ${f.level}`,
    })),
  }));

  return [
    { title: 'Race', features: raceFeatures },
    { title: 'Background', features: bgFeatures },
    ...classSections,
  ];
}

interface BuiltForClass {
  cl: ClassLevel;
  result: BuiltClassFeatures;
}

/**
 * Resolves each class's (and chosen subclass's) features + feature choices from the class
 * JSON. Shared by the features list and the Feature Choices picker so both agree.
 */
export function useBuiltClassFeatures(
  classes: ClassLevel[],
  featureChoices: Record<string, string[]> | undefined,
): BuiltForClass[] {
  const [built, setBuilt] = useState<BuiltForClass[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const out: BuiltForClass[] = [];
      for (const cl of classes) {
        const json = await fetchClassJson(cl.classRef.name);
        out.push({
          cl,
          result: buildClassFeatures(json, {
            className: cl.classRef.name,
            classSource: cl.classRef.source,
            subclass: cl.subclass,
            level: cl.level,
            choices: featureChoices,
          }),
        });
      }
      if (!cancelled) setBuilt(out);
    })();
    return () => { cancelled = true; };
  }, [classes, featureChoices]);

  return built;
}

/** Every "choose one of these features" point a character has reached, across all classes. */
export function useFeatureChoices(
  classes: ClassLevel[],
  featureChoices: Record<string, string[]> | undefined,
): FeatureChoice[] {
  return useBuiltClassFeatures(classes, featureChoices).flatMap(b => b.result.choices);
}
