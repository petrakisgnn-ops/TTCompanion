import { useEffect, useMemo, useState } from 'react';
import { ReferenceListPage, type RefEntry } from './ReferenceListPage';
import { useSettingsStore } from '../../stores/settingsStore';
import { matchesEdition } from '../../domain/rules/edition';
import { buildRaceOptions, type RawRace, type RawSubrace } from '../../domain/reference/races';

const SIZE_LABEL: Record<string, string> = { M: 'Medium', S: 'Small', V: 'Varies' };

export function RacesPage() {
  const { edition } = useSettingsStore();
  const [allItems, setAllItems] = useState<RefEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/races.json`)
      .then(r => r.json())
      .then((data: { race: RawRace[]; subrace: RawSubrace[] }) => {
        const options = buildRaceOptions(data.race, data.subrace);
        const entries: RefEntry[] = options.map(opt => {
          const speed = opt.speed;
          const speedParts: string[] = [];
          if (typeof speed === 'number') speedParts.push(`${speed} ft.`);
          else if (speed) {
            if (speed.walk) speedParts.push(`${speed.walk} ft.`);
            if (speed.fly) speedParts.push(`fly ${speed.fly} ft.`);
            if (speed.swim) speedParts.push(`swim ${speed.swim} ft.`);
            if (speed.climb) speedParts.push(`climb ${speed.climb} ft.`);
          }
          const sizes = opt.size ?? [];
          const sizeStr = sizes.map(s => SIZE_LABEL[s] ?? s).join('/');
          const subtitle = [
            opt.subraceName ? opt.raceName : null,
            sizeStr,
            speedParts.join(', '),
          ].filter(Boolean).join(' · ');

          return {
            key: opt.key,
            name: opt.name,
            source: opt.source,
            subtitle,
            tag: opt.source,
            entries: opt.entries,
            reprintedAs: opt.reprintedAs,
            searchAlias: opt.subraceName ? opt.raceName : undefined,
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
