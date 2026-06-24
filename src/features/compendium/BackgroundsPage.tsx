import { useEffect, useMemo, useState } from 'react';
import { ReferenceListPage, type RefEntry } from './ReferenceListPage';
import { useSettingsStore } from '../../stores/settingsStore';
import { matchesEdition } from '../../domain/rules/edition';

export function BackgroundsPage() {
  const { edition } = useSettingsStore();
  const [allItems, setAllItems] = useState<RefEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/data/backgrounds.json')
      .then(r => r.json())
      .then((data: { background: Record<string, unknown>[] }) => {
        const entries: RefEntry[] = data.background.map(b => {
          const skills = b.skillProficiencies as { [k: string]: boolean }[] | undefined;
          const skillNames = skills
            ? Object.keys(skills[0] ?? {}).map(s => s.charAt(0).toUpperCase() + s.slice(1))
            : [];
          return {
            key: `${b.name}|${b.source}`,
            name: b.name as string,
            source: b.source as string,
            subtitle: skillNames.length > 0 ? `Skills: ${skillNames.join(', ')}` : undefined,
            tag: b.source as string,
            entries: (b.entries as RefEntry['entries']) ?? [],
            ...b,
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

  return <ReferenceListPage title="Backgrounds" icon="psychology" items={items} loading={loading} />;
}
