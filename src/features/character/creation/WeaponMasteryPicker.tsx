import { useEffect, useMemo, useState } from 'react';
import { db } from '../../../data/db';
import { weaponMasteryCount } from '../../../domain/rules/classData';
import { useSettingsStore } from '../../../stores/settingsStore';
import type { WizardData } from './CharacterWizard';

interface Props {
  data: WizardData;
  patch: (p: Partial<WizardData>) => void;
}

interface WeaponOption { name: string; source: string; mastery: string }

/**
 * 2024 Weapon Mastery — a martial chooses N weapons (Barbarian/Fighter/Paladin/Ranger/Rogue)
 * whose Mastery property they can use. Only renders when the class/level/edition grants any.
 */
export function WeaponMasteryPicker({ data, patch }: Props) {
  const edition = useSettingsStore(s => s.edition);
  const [weapons, setWeapons] = useState<WeaponOption[]>([]);
  const [query, setQuery] = useState('');

  const count = data.classRef ? weaponMasteryCount(data.classRef.name, data.level, edition) : 0;

  useEffect(() => {
    if (count === 0) { setWeapons([]); return; }
    let cancelled = false;
    db.items.toArray().then(items => {
      if (cancelled) return;
      const opts = items
        .filter(i => Array.isArray(i.mastery) && i.mastery.length > 0)
        .map(i => ({ name: i.name, source: i.source, mastery: String((i.mastery as string[])[0]).split('|')[0] }))
        .sort((a, b) => a.name.localeCompare(b.name));
      setWeapons(opts);
    });
    return () => { cancelled = true; };
  }, [count]);

  const chosen = data.masteredWeapons;
  const remaining = count - chosen.length;
  const isChosen = (o: WeaponOption) => chosen.some(w => w.name === o.name && w.source === o.source);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? weapons.filter(w => w.name.toLowerCase().includes(q) || w.mastery.toLowerCase().includes(q)) : weapons;
  }, [weapons, query]);

  if (count === 0) return null;

  const toggle = (o: WeaponOption) => {
    if (isChosen(o)) {
      patch({ masteredWeapons: chosen.filter(w => !(w.name === o.name && w.source === o.source)) });
      return;
    }
    if (remaining <= 0) return;
    patch({ masteredWeapons: [...chosen, { name: o.name, source: o.source }] });
  };

  return (
    <div className="space-y-2">
      <h2 className="text-base font-semibold">Weapon Mastery</h2>
      <p className="text-xs text-[var(--color-faint)]">
        Choose {count} weapon{count !== 1 ? 's' : ''} whose Mastery property you can use
        {remaining > 0 ? ` (${remaining} remaining)` : ' — all chosen'}.
      </p>
      <input
        type="search"
        placeholder="Search weapons…"
        value={query}
        onChange={e => setQuery(e.target.value)}
        className="w-full bg-[var(--color-card)] rounded-lg px-3 py-2 text-sm outline-none placeholder:text-[var(--color-faint)] focus:ring-1 focus:ring-[var(--color-gold-lt)]"
      />
      <div className="max-h-64 overflow-y-auto rounded-xl bg-[var(--color-card)] divide-y divide-[var(--color-border)]">
        {filtered.map(o => {
          const picked = isChosen(o);
          const atMax = !picked && remaining <= 0;
          return (
            <button
              key={`${o.name}|${o.source}`}
              onClick={() => toggle(o)}
              disabled={atMax}
              className={`w-full flex items-center justify-between px-3 py-2 text-left transition-colors ${
                picked ? 'bg-amber-500/15' : atMax ? 'opacity-40 cursor-not-allowed' : 'hover:bg-white/5'
              }`}
            >
              <span className={`text-sm ${picked ? 'text-amber-400 font-medium' : ''}`}>{o.name}</span>
              <span className="text-xs text-[var(--color-faint)] ml-2 shrink-0">{o.mastery}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
