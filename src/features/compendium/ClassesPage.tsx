import { useEffect, useMemo, useState } from 'react';
import { ReferenceListPage, type RefEntry } from './ReferenceListPage';
import { useSettingsStore } from '../../stores/settingsStore';
import type { Entry } from '../../domain/reference/types';

const CLASS_FILES = [
  'artificer','barbarian','bard','cleric','druid',
  'fighter','monk','paladin','ranger','rogue','sorcerer','warlock','wizard',
];

interface ClassRaw {
  name: string;
  source: string;
  edition?: string;
  hd?: { faces?: number };
  spellcastingAbility?: string;
  proficiency?: string[];
  [k: string]: unknown;
}

interface ClassData {
  class: ClassRaw[];
  subclass?: Record<string, unknown>[];
  classFeature?: Record<string, unknown>[];
}

export function ClassesPage() {
  const { edition } = useSettingsStore();
  const [allData, setAllData] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all(
      CLASS_FILES.map(name =>
        fetch(`/data/class/class-${name}.json`)
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

    for (const data of allData) {
      if (!data.class?.length) continue;

      // Pick the class entry matching the current edition; fall back to first.
      const target = edition === '5.5e'
        ? (data.class.find(c => c.edition === 'one') ?? data.class.find(c => c.edition !== 'classic') ?? data.class[0])
        : (data.class.find(c => c.edition === 'classic' || !c.edition) ?? data.class[0]);

      const cls = target;
      const className = cls.name;
      const hd = cls.hd?.faces;
      const ability = cls.spellcastingAbility;
      const proficiencies = cls.proficiency ?? [];
      const subclasses = (data.subclass ?? [])
        .map(s => s.name as string)
        .filter((v, idx, arr) => arr.indexOf(v) === idx)
        .slice(0, 8);

      const subtitle = [
        hd ? `d${hd} Hit Die` : null,
        ability ? `${ability.toUpperCase()} spellcasting` : null,
        proficiencies.length ? proficiencies.join(', ') : null,
      ].filter(Boolean).join(' · ');

      const featureEntries = (data.classFeature ?? []).map(f => ({
        type: 'entries' as const,
        name: `Level ${f.level as number}: ${f.name as string}`,
        entries: (f.entries as unknown[]) ?? [],
      }));

      entries.push({
        ...cls,
        key: `${className}|${cls.source}`,
        name: className,
        subtitle,
        tag: hd ? `d${hd}` : undefined,
        subclasses,
        entries: featureEntries as Entry[],
      });
    }

    return entries.sort((a, b) => a.name.localeCompare(b.name));
  }, [allData, edition]);

  return <ReferenceListPage title="Classes" icon="school" items={items} loading={loading} />;
}
