import { useEffect, useState } from 'react';
import { extractFeatures, type FeatureEntry } from '../../domain/reference/features';
import {
  classFeaturesUpTo, subclassFeaturesUpTo,
  type RawClassFeature, type RawSubclassFeature,
} from '../../domain/reference/classFeatures';
import { buildRaceOptions, type RawRace, type RawSubrace } from '../../domain/reference/races';
import type { Character } from '../../domain/character/types';

interface BgEntry {
  name: string;
  source: string;
  entries?: FeatureEntry['entries'];
}

interface RawSubclass {
  name: string;
  shortName: string;
  source: string;
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
  const [classSections, setClassSections] = useState<FeatureGroup[]>([]);

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

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const sections: FeatureGroup[] = [];
      for (const cl of character.classes) {
        try {
          const res = await fetch(`${import.meta.env.BASE_URL}data/class/class-${cl.classRef.name.toLowerCase()}.json`);
          const json: {
            classFeature?: RawClassFeature[];
            subclass?: RawSubclass[];
            subclassFeature?: RawSubclassFeature[];
          } = await res.json();

          const toRow = (f: { name: string; level: number; entries: FeatureRow['entries'] }): FeatureRow =>
            ({ title: f.name, entries: f.entries, level: f.level, badge: `Lvl ${f.level}` });

          const classFeats = classFeaturesUpTo(
            json.classFeature, cl.classRef.name, cl.classRef.source, cl.level,
          ).map(toRow);

          let subclassFeats: FeatureRow[] = [];
          if (cl.subclass) {
            const sub = (json.subclass ?? []).find(
              s => s.name === cl.subclass!.name && s.source === cl.subclass!.source,
            );
            if (sub) {
              subclassFeats = subclassFeaturesUpTo(
                json.subclassFeature, sub.shortName, sub.source, cl.level,
              ).map(toRow);
            }
          }

          const features = [...classFeats, ...subclassFeats].sort((a, b) => (a.level ?? 0) - (b.level ?? 0));
          sections.push({ title: cl.classRef.name, features });
        } catch {
          // skip a class whose file fails to load — other sections still render
        }
      }
      if (!cancelled) setClassSections(sections);
    })();

    return () => { cancelled = true; };
  }, [character.classes]);

  return [
    { title: 'Race', features: raceFeatures },
    { title: 'Background', features: bgFeatures },
    ...classSections,
  ];
}
