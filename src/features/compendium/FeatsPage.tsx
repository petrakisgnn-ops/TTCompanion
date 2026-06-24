import { useEffect, useMemo, useState } from 'react';
import { ReferenceListPage, type RefEntry } from './ReferenceListPage';
import { useSettingsStore } from '../../stores/settingsStore';
import { matchesEdition } from '../../domain/rules/edition';

function prereqString(prerequisite: unknown): string | undefined {
  if (!prerequisite) return undefined;
  const prereqs = prerequisite as Array<Record<string, unknown>>;
  if (!prereqs.length) return undefined;
  const parts: string[] = [];
  const p = prereqs[0];
  if (p.level) {
    const lvl = p.level as { level?: number; class?: { name?: string } };
    parts.push(lvl.class?.name ? `${lvl.class.name} ${lvl.level}` : `Level ${lvl.level}`);
  }
  if (p.ability) {
    const ab = p.ability as { str?: number; dex?: number; con?: number; int?: number; wis?: number; cha?: number }[];
    const abStr = ab.flatMap(a => Object.entries(a).map(([k, v]) => `${k.toUpperCase()} ${v}`)).join(' or ');
    parts.push(abStr);
  }
  if (p.race) {
    const races = p.race as { name: string }[];
    parts.push(races.map(r => r.name).join(' or '));
  }
  if (p.spellcasting) parts.push('Spellcasting');
  if (p.campaign) parts.push((p.campaign as string[]).join('/'));
  return parts.length > 0 ? parts.join(', ') : undefined;
}

export function FeatsPage() {
  const { edition } = useSettingsStore();
  const [allItems, setAllItems] = useState<RefEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/data/feats.json')
      .then(r => r.json())
      .then((data: { feat: Record<string, unknown>[] }) => {
        const entries: RefEntry[] = data.feat.map(f => {
          const pre = prereqString(f.prerequisite);
          return {
            key: `${f.name}|${f.source}`,
            name: f.name as string,
            source: f.source as string,
            subtitle: pre ? `Prerequisite: ${pre}` : undefined,
            tag: (f.category as string | undefined) ?? f.source as string,
            entries: (f.entries as RefEntry['entries']) ?? [],
            ...f,
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

  return <ReferenceListPage title="Feats" icon="military_tech" items={items} loading={loading} />;
}
