import { useEffect, useMemo, useState } from 'react';
import { ReferenceListPage, type RefEntry } from './ReferenceListPage';
import { useSettingsStore } from '../../stores/settingsStore';
import { matchesEdition } from '../../domain/rules/edition';
import type { Entry } from '../../domain/reference/types';

const CLASS_FILES = [
  'artificer','barbarian','bard','cleric','druid',
  'fighter','monk','paladin','ranger','rogue','sorcerer','warlock','wizard',
];

interface RawSubclass {
  name: string;
  shortName?: string;
  source: string;
  className: string;
  classSource: string;
  reprintedAs?: unknown;
}

interface RawSubclassFeature {
  name: string;
  className: string;
  classSource: string;
  subclassShortName?: string;
  subclassSource: string;
  level: number;
  entries?: unknown[];
}

interface ClassData {
  subclass?: RawSubclass[];
  subclassFeature?: RawSubclassFeature[];
}

export function SubclassesPage() {
  const { edition } = useSettingsStore();
  const [allData, setAllData] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all(
      CLASS_FILES.map(name =>
        fetch(`${import.meta.env.BASE_URL}data/class/class-${name}.json`)
          .then(r => r.json() as Promise<ClassData>)
          .catch(() => null),
      ),
    ).then(results => {
      setAllData(results.filter((d): d is ClassData => d !== null));
      setLoading(false);
    });
  }, []);

  const items = useMemo<RefEntry[]>(() => {
    const entries: RefEntry[] = [];
    // The raw data lists most subclasses twice (a PHB "classic" entry and its XPHB 2024
    // reprint sharing a display name); filter to the active edition and dedupe by name+source,
    // the same way StepClass and RacesPage already do.
    const seen = new Set<string>();

    for (const data of allData) {
      const features = data.subclassFeature ?? [];

      for (const sub of data.subclass ?? []) {
        if (!matchesEdition(sub.source, sub.reprintedAs, edition)) continue;
        const dedupeKey = `${sub.name}|${sub.source}`.toLowerCase();
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);

        // Collect this subclass's features, ordered by the level they're gained.
        const featureEntries = features
          .filter(f =>
            f.className === sub.className && f.classSource === sub.classSource &&
            f.subclassShortName === sub.shortName && f.subclassSource === sub.source)
          .sort((a, b) => a.level - b.level)
          .map(f => ({
            type: 'entries' as const,
            name: `Level ${f.level}: ${f.name}`,
            entries: (f.entries as unknown[]) ?? [],
          }));

        entries.push({
          key: `${sub.name}|${sub.source}::${sub.className}`,
          name: sub.name,
          source: sub.source,
          subtitle: sub.className,
          // Lets "cleric" (etc.) in the search box surface all of that class's subclasses.
          searchAlias: sub.className,
          tag: sub.source,
          entries: featureEntries as Entry[],
        });
      }
    }

    // Group by class (subtitle) then subclass name so the list reads class-by-class.
    return entries.sort((a, b) =>
      (a.subtitle ?? '').localeCompare(b.subtitle ?? '') || a.name.localeCompare(b.name));
  }, [allData, edition]);

  return <ReferenceListPage title="Subclasses" icon="school" items={items} loading={loading} />;
}
