import { useEffect, useMemo, useState } from 'react';
import { ReferenceListPage, type RefEntry } from './ReferenceListPage';
import { useSettingsStore } from '../../stores/settingsStore';
import { matchesEdition } from '../../domain/rules/edition';

const SIZE_LABEL: Record<string, string> = { M: 'Medium', S: 'Small', V: 'Varies' };

export function RacesPage() {
  const { edition } = useSettingsStore();
  const [allItems, setAllItems] = useState<RefEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/data/races.json')
      .then(r => r.json())
      .then((data: { race: Record<string, unknown>[] }) => {
        const entries: RefEntry[] = data.race.map(r => {
          const speed = r.speed as { walk?: number; fly?: number; swim?: number; climb?: number } | number | undefined;
          const speedParts: string[] = [];
          if (typeof speed === 'number') speedParts.push(`${speed} ft.`);
          else if (speed) {
            if (speed.walk) speedParts.push(`${speed.walk} ft.`);
            if (speed.fly) speedParts.push(`fly ${speed.fly} ft.`);
            if (speed.swim) speedParts.push(`swim ${speed.swim} ft.`);
            if (speed.climb) speedParts.push(`climb ${speed.climb} ft.`);
          }
          const sizes = (r.size as string[] | undefined) ?? [];
          const sizeStr = sizes.map(s => SIZE_LABEL[s] ?? s).join('/');

          return {
            key: `${r.name}|${r.source}`,
            name: r.name as string,
            source: r.source as string,
            subtitle: [sizeStr, speedParts.join(', ')].filter(Boolean).join(' · '),
            tag: r.source as string,
            entries: (r.entries as RefEntry['entries']) ?? [],
            ...r,
          };
        });
        setAllItems(entries);
        setLoading(false);
      });
  }, []);

  const items = useMemo(
    () => allItems.filter(i => matchesEdition(i.source, i.reprintedAs, edition)),
    [allItems, edition],
  );

  return <ReferenceListPage title="Races" icon="person" items={items} loading={loading} />;
}
