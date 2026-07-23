import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../../data/db';
import type { StoredItem } from '../../data/db';
import { renderEntries } from '../../rendering';
import { resolveItemMasteries, type ItemMastery } from './itemMasteryCache';

const RARITY_COLOR: Record<string, string> = {
  none: 'text-slate-400',
  common: 'text-slate-300',
  uncommon: 'text-emerald-400',
  rare: 'text-sky-400',
  'very rare': 'text-purple-400',
  legendary: 'text-amber-400',
  artifact: 'text-red-400',
};

const DMG_TYPE: Record<string, string> = {
  S: 'Slashing', P: 'Piercing', B: 'Bludgeoning',
  F: 'Fire', C: 'Cold', L: 'Lightning', A: 'Acid',
  N: 'Necrotic', R: 'Radiant', T: 'Thunder', Po: 'Poison',
  Ps: 'Psychic', Fo: 'Force',
};

const PROPERTY: Record<string, string> = {
  '2H': 'Two-Handed', F: 'Finesse', H: 'Heavy', L: 'Light',
  R: 'Reach', T: 'Thrown', V: 'Versatile', A: 'Ammunition',
  LD: 'Loading', S: 'Special', RLD: 'Reload',
};

function formatValue(cp: number | undefined): string | null {
  if (cp == null) return null;
  if (cp >= 1000) return `${(cp / 100).toFixed(cp % 100 === 0 ? 0 : 1)} gp`;
  if (cp >= 100) return `${Math.floor(cp / 100)} gp`;
  if (cp >= 10) return `${Math.floor(cp / 10)} sp`;
  return `${cp} cp`;
}

interface MetaRowProps { label: string; value: string }
function MetaRow({ label, value }: MetaRowProps) {
  return (
    <div className="flex gap-3 text-sm">
      <span className="text-slate-400 w-28 shrink-0">{label}</span>
      <span>{value}</span>
    </div>
  );
}

export function ItemDetailPage() {
  const { key } = useParams<{ key: string }>();
  const navigate = useNavigate();
  const [item, setItem] = useState<StoredItem | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [masteries, setMasteries] = useState<ItemMastery[]>([]);

  useEffect(() => {
    if (!key) return;
    db.items.get(decodeURIComponent(key)).then(i => {
      if (i) setItem(i);
      else setNotFound(true);
    });
  }, [key]);

  // Resolve a weapon's mastery property (2024) — e.g. "Sap|XPHB" → what Sap does.
  useEffect(() => {
    const refs = item?.mastery as string[] | undefined;
    if (!refs || refs.length === 0) { setMasteries([]); return; }
    let cancelled = false;
    resolveItemMasteries(refs).then(m => { if (!cancelled) setMasteries(m); });
    return () => { cancelled = true; };
  }, [item]);

  if (notFound) {
    return (
      <div className="p-4 text-slate-400 text-sm">
        Item not found.{' '}
        <button onClick={() => navigate(-1)} className="text-amber-400 underline">Go back</button>
      </div>
    );
  }

  if (!item) {
    return <div className="p-4 text-slate-400 text-sm animate-pulse">Loading…</div>;
  }

  const rarity = item.rarity && item.rarity !== 'none' ? item.rarity : null;
  const rarityColor = rarity ? (RARITY_COLOR[rarity] ?? 'text-slate-400') : 'text-slate-400';
  const rarityLabel = rarity
    ? rarity.charAt(0).toUpperCase() + rarity.slice(1)
    : 'No rarity';

  const attune = item.reqAttune;
  const attuneLabel =
    attune === true ? 'Requires attunement'
    : typeof attune === 'string' ? `Requires attunement ${attune}`
    : null;

  const dmg1 = item.dmg1 as string | undefined;
  const dmgType = item.dmgType as string | undefined;
  const properties = item.property as string[] | undefined;
  const weight = item.weight as number | undefined;
  const value = item.value as number | undefined;
  const ac = item.ac as number | undefined;
  // Weapon mastery names come straight from the refs (["Sap|XPHB"] → "Sap"); descriptions load async.
  const masteryNames = (item.mastery as string[] | undefined)?.map(r => r.split('|')[0]);

  return (
    <div className="p-4 max-w-xl mx-auto">
      <button
        onClick={() => navigate(-1)}
        className="text-slate-400 text-sm mb-3 flex items-center gap-1 hover:text-slate-200"
      >
        ← Items
      </button>

      <h1 className="text-2xl font-bold tracking-tight">{item.name}</h1>

      <div className="flex items-center gap-2 mt-1 mb-4 flex-wrap">
        <span className={`text-sm font-semibold ${rarityColor}`}>{rarityLabel}</span>
        {item.wondrous && (
          <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">
            Wondrous
          </span>
        )}
        {attuneLabel && (
          <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">
            {attuneLabel}
          </span>
        )}
        <span className="text-xs text-slate-600">{item.source}</span>
      </div>

      {/* Stats */}
      {(dmg1 || ac != null || weight != null || value != null) && (
        <section className="space-y-1.5 border-y border-white/10 py-3 mb-4">
          {dmg1 && (
            <MetaRow
              label="Damage"
              value={`${dmg1}${dmgType ? ` ${DMG_TYPE[dmgType] ?? dmgType}` : ''}`}
            />
          )}
          {ac != null && <MetaRow label="Armor Class" value={`${ac}${item.type === 'S' ? ' (shield bonus)' : ''}`} />}
          {properties && properties.length > 0 && (
            <MetaRow
              label="Properties"
              value={properties.map(p => PROPERTY[p] ?? p).join(', ')}
            />
          )}
          {masteryNames && masteryNames.length > 0 && <MetaRow label="Mastery" value={masteryNames.join(', ')} />}
          {weight != null && <MetaRow label="Weight" value={`${weight} lb.`} />}
          {value != null && formatValue(value) && <MetaRow label="Value" value={formatValue(value)!} />}
        </section>
      )}

      {/* Weapon mastery (2024) — what the mastery property does */}
      {masteries.length > 0 && (
        <section className="border border-amber-500/20 bg-amber-500/5 rounded-xl p-3 mb-4">
          <h2 className="text-sm font-semibold text-amber-400 mb-1.5">Weapon Mastery</h2>
          <div className="space-y-2">
            {masteries.map(m => (
              <div key={`${m.name}|${m.source}`}>
                <p className="text-sm font-semibold">{m.name}</p>
                {m.entries && (
                  <div className="text-sm leading-relaxed text-slate-300">{renderEntries(m.entries)}</div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Description */}
      {item.entries && (
        <section className="text-sm leading-relaxed space-y-1">
          {renderEntries(item.entries)}
        </section>
      )}
    </div>
  );
}
