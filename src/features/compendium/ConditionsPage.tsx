import { useEffect, useState } from 'react';
import { ReferenceListPage, type RefEntry } from './ReferenceListPage';

export function ConditionsPage() {
  const [items, setItems] = useState<RefEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/data/conditionsdiseases.json')
      .then(r => r.json())
      .then((data: { condition?: Record<string, unknown>[]; disease?: Record<string, unknown>[]; status?: Record<string, unknown>[] }) => {
        const map = (arr: Record<string, unknown>[] = [], kind: string): RefEntry[] =>
          arr.map(c => ({
            key: `${c.name}|${c.source}|${kind}`,
            name: c.name as string,
            source: c.source as string,
            subtitle: undefined,
            tag: kind,
            tagColor: kind === 'Condition' ? '#5c7ad4' : kind === 'Disease' ? '#b85c5c' : '#6b7280',
            entries: (c.entries as RefEntry['entries']) ?? [],
            ...c,
          }));

        setItems([
          ...map(data.condition, 'Condition'),
          ...map(data.disease, 'Disease'),
          ...map(data.status, 'Status'),
        ]);
        setLoading(false);
      });
  }, []);

  return <ReferenceListPage title="Conditions" icon="sick" items={items} loading={loading} />;
}
