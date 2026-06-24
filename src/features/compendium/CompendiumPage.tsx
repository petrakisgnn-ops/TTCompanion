import { useNavigate } from 'react-router-dom';
import { useData } from '../../app/DataContext';
import { db } from '../../data/db';
import { useEffect, useState } from 'react';

interface Section {
  icon: string;
  label: string;
  path: string;
  count: number | null;
}

async function countJson(url: string, ...keys: string[]): Promise<number> {
  const data: Record<string, unknown[]> = await fetch(url).then(r => r.json());
  return keys.reduce((sum, k) => sum + (data[k]?.length ?? 0), 0);
}

export function CompendiumPage() {
  const navigate = useNavigate();
  const { ready } = useData();
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!ready) return;
    Promise.all([
      db.spells.count(),
      db.monsters.count(),
      db.items.count(),
      countJson('/data/races.json', 'race'),
      countJson('/data/backgrounds.json', 'background'),
      countJson('/data/feats.json', 'feat'),
      countJson('/data/conditionsdiseases.json', 'condition', 'disease', 'status'),
      // classes: count the class files we know about
      Promise.resolve(13),
    ]).then(([spells, monsters, items, races, backgrounds, feats, conditions, classes]) => {
      setCounts({ spells, monsters, items, races, backgrounds, feats, conditions, classes });
    });
  }, [ready]);

  const sections: Section[] = [
    { icon: 'auto_stories',  label: 'Spells',       path: '/spells',      count: counts.spells      ?? null },
    { icon: 'cruelty_free',  label: 'Bestiary',     path: '/bestiary',    count: counts.monsters    ?? null },
    { icon: 'diamond',       label: 'Items',        path: '/items',       count: counts.items       ?? null },
    { icon: 'person',        label: 'Races',        path: '/races',       count: counts.races       ?? null },
    { icon: 'school',        label: 'Classes',      path: '/classes',     count: counts.classes     ?? null },
    { icon: 'psychology',    label: 'Backgrounds',  path: '/backgrounds', count: counts.backgrounds ?? null },
    { icon: 'military_tech', label: 'Feats',        path: '/feats',       count: counts.feats       ?? null },
    { icon: 'sick',          label: 'Conditions',   path: '/conditions',  count: counts.conditions  ?? null },
  ];

  return (
    <div style={{ padding: '16px 14px 90px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <span className="msym" style={{ fontSize: 26, color: '#d08c4a' }}>auto_stories</span>
        <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-.01em' }}>Compendium</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11 }}>
        {sections.map(s => (
          <button
            key={s.path}
            onClick={() => navigate(s.path)}
            style={{
              display: 'flex', flexDirection: 'column', gap: 10,
              alignItems: 'flex-start', textAlign: 'left',
              background: 'var(--color-card)', border: '1px solid var(--color-border)',
              borderRadius: 15, padding: '15px 14px',
              cursor: 'pointer', transition: 'border-color .15s',
            }}
          >
            <span className="msym" style={{ fontSize: 26, color: '#d08c4a' }}>{s.icon}</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>{s.label}</span>
              <span style={{ fontSize: 11, color: 'var(--color-muted)', fontFamily: "'Spline Sans Mono', monospace" }}>
                {s.count !== null ? `${s.count.toLocaleString()} entries` : '…'}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
