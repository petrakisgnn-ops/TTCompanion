import { useEffect, useState } from 'react';
import { db } from '../../../data/db';
import { refKey } from '../../../domain/reference/types';
import { renderEntries } from '../../../rendering';
import { resolveItemMasteries, type ItemMastery } from '../../compendium/itemMasteryCache';
import type { Character } from '../../../domain/character/types';

interface Row { weapon: string; mastery: ItemMastery | null }

/** Shows a 2024 character's mastered weapons and what each weapon's Mastery property does. */
export function WeaponMasterySection({ character }: { character: Character }) {
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    if (character.masteredWeapons.length === 0) { setRows([]); return; }
    let cancelled = false;
    (async () => {
      const items = await db.items.bulkGet(character.masteredWeapons.map(refKey));
      const masteryRefs = items.map(i => {
        const m = i?.mastery;
        return Array.isArray(m) && m.length > 0 ? String(m[0]) : null;
      });
      const defs = await resolveItemMasteries(masteryRefs.filter((r): r is string => !!r));
      const byName = new Map(defs.map(d => [d.name.toLowerCase(), d]));
      const built = character.masteredWeapons.map((w, i) => {
        const name = masteryRefs[i]?.split('|')[0] ?? '';
        return { weapon: w.name, mastery: name ? byName.get(name.toLowerCase()) ?? null : null };
      });
      if (!cancelled) setRows(built);
    })();
    return () => { cancelled = true; };
  }, [character.masteredWeapons]);

  if (character.masteredWeapons.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wide">Weapon Mastery</h3>
      <div className="space-y-2">
        {rows.map(r => (
          <div key={r.weapon} className="bg-[var(--color-card)] rounded-xl px-4 py-2.5">
            <p className="text-sm font-semibold">
              {r.weapon}
              {r.mastery && <span className="text-amber-400"> — {r.mastery.name}</span>}
            </p>
            {r.mastery?.entries && (
              <div className="text-xs text-[var(--color-text-2)] leading-relaxed mt-0.5">
                {renderEntries(r.mastery.entries)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
