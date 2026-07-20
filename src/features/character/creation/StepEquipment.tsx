import { useEffect, useMemo, useRef, useState } from 'react';
import { db } from '../../../data/db';
import type { StoredItem } from '../../../data/db';
import type { WizardData } from './CharacterWizard';
import type { Currency, InventoryItem } from '../../../domain/character/types';
import type { RefId } from '../../../domain/reference/types';
import {
  parseEquipmentGroups, parseGoldAlternative, rollGold,
  type EquipmentAtom, type EquipmentGroup, type GoldFormula,
} from '../../../domain/rules/startingEquipment';

interface StepEquipmentProps {
  data: WizardData;
  patch: (p: Partial<WizardData>) => void;
}

const ZERO_CURRENCY: Currency = { pp: 0, gp: 0, ep: 0, sp: 0, cp: 0 };

const TYPE_LABELS: Record<string, string> = {
  weaponMartial: 'a martial weapon',
  weaponMartialMelee: 'a martial melee weapon',
  weaponSimple: 'a simple weapon',
  weaponSimpleMelee: 'a simple melee weapon',
  instrumentMusical: 'a musical instrument',
  toolArtisan: "an artisan's tool",
  toolGaming: 'a gaming set',
  setGaming: 'a gaming set',
  shield: 'a shield',
  armorLight: 'light armor',
  armorMedium: 'medium armor',
  armorHeavy: 'heavy armor',
  focusSpellcastingArcane: 'an arcane focus',
  focusSpellcastingDruidic: 'a druidic focus',
  focusSpellcastingHoly: 'a holy symbol',
};

function categoryLabel(types: string[]): string {
  return types.map(t => TYPE_LABELS[t] ?? t).join(' or ');
}

function itemMatchesCategory(item: StoredItem, type: string): boolean {
  const rec = item as unknown as { weaponCategory?: string; type?: string; scfType?: string };
  const itemType = rec.type ?? '';
  switch (type) {
    case 'weaponMartial': return rec.weaponCategory === 'martial';
    case 'weaponMartialMelee': return rec.weaponCategory === 'martial' && itemType.startsWith('M');
    case 'weaponSimple':  return rec.weaponCategory === 'simple';
    case 'weaponSimpleMelee': return rec.weaponCategory === 'simple' && itemType.startsWith('M');
    case 'toolArtisan':   return itemType.startsWith('AT');
    case 'instrumentMusical': return itemType.startsWith('INS');
    case 'shield':        return itemType.startsWith('S') && !itemType.startsWith('SCF');
    case 'focusSpellcastingArcane':  return rec.scfType === 'arcane';
    case 'focusSpellcastingDruidic': return rec.scfType === 'druidic';
    case 'focusSpellcastingHoly':    return rec.scfType === 'holy';
    default:              return true; // unrecognized category code — don't filter, let the player search freely
  }
}

function formulaLabel(f: GoldFormula): string {
  return `${f.count}d${f.sides}${f.multiplier > 1 ? ` × ${f.multiplier}` : ''}`;
}

const inputStyle =
  'w-full bg-[var(--color-card-inner)] rounded-lg px-3 py-1.5 text-xs outline-none placeholder:text-[var(--color-faint)]';

/** Debounced search scoped to a category filter — lets the player pick the concrete item for a "choose a martial weapon"-style grant. */
function CategoryPicker({ types, onPick }: { types: string[]; onPick: (ref: RefId) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<StoredItem[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const all = await db.items.orderBy('name').toArray();
      const inCategory = all.filter(it => types.some(t => itemMatchesCategory(it, t)));
      const q = query.toLowerCase();
      setResults((q ? inCategory.filter(it => it.name.toLowerCase().includes(q)) : inCategory).slice(0, 12));
    }, 200);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [query, types]);

  return (
    <div className="space-y-1.5 mt-1">
      <p className="text-xs text-[var(--color-faint)]">Choose {categoryLabel(types)}:</p>
      <input
        placeholder="Search…"
        value={query}
        onChange={e => setQuery(e.target.value)}
        className={inputStyle}
      />
      {results.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {results.map(it => (
            <button
              key={it._key}
              onClick={() => onPick({ name: it.name, source: it.source })}
              className="text-xs px-2 py-1 rounded-lg bg-[var(--color-raised)] hover:bg-amber-500/20 text-[var(--color-text-2)]"
            >
              {it.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface AtomRowProps {
  atom: EquipmentAtom;
  pick: RefId | undefined;
  onPickCategory: (ref: RefId) => void;
  itemInfo: Map<string, RefId>;
}

function AtomRow({ atom, pick, onPickCategory, itemInfo }: AtomRowProps) {
  if (atom.kind === 'item') {
    const ref = itemInfo.get(atom.key);
    const label = atom.displayName ?? ref?.name ?? atom.key.split('|')[0];
    return <p className="text-sm text-[var(--color-text-2)]">{label}{atom.quantity > 1 ? ` ×${atom.quantity}` : ''}</p>;
  }
  if (atom.kind === 'currency') {
    return <p className="text-sm text-amber-500 font-semibold">{atom.cp / 100} gp</p>;
  }
  if (atom.kind === 'special') {
    return <p className="text-sm text-[var(--color-text-2)]">{atom.label}{atom.quantity > 1 ? ` ×${atom.quantity}` : ''}</p>;
  }
  // category
  if (pick) {
    return (
      <p className="text-sm text-[var(--color-text-2)]">
        {pick.name}
        <button onClick={() => onPickCategory(pick)} className="ml-2 text-xs text-amber-500 underline">change</button>
      </p>
    );
  }
  return <CategoryPicker types={atom.types} onPick={onPickCategory} />;
}

interface GroupCardProps {
  groupKey: string;
  group: EquipmentGroup;
  selectedIndex: number;
  onSelectOption: (index: number) => void;
  categoryPicks: Record<string, RefId>;
  onPickCategory: (atomKey: string, ref: RefId) => void;
  itemInfo: Map<string, RefId>;
}

function GroupCard({ groupKey, group, selectedIndex, onSelectOption, categoryPicks, onPickCategory, itemInfo }: GroupCardProps) {
  const idx = group.options.length > 1 ? selectedIndex : 0;
  const atoms = group.options[idx] ?? [];

  return (
    <div className="bg-[var(--color-card)] rounded-xl p-3 space-y-2">
      {group.options.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {group.options.map((_, i) => (
            <button
              key={i}
              onClick={() => onSelectOption(i)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                i === idx ? 'bg-amber-500 text-slate-900' : 'bg-[var(--color-raised)] text-[var(--color-text-2)] hover:bg-[var(--color-card-inner)]'
              }`}
            >
              Option {String.fromCharCode(65 + i)}
            </button>
          ))}
        </div>
      )}
      <div className="space-y-1">
        {atoms.map((atom, i) => (
          <AtomRow
            key={i}
            atom={atom}
            pick={categoryPicks[`${groupKey}-${i}`]}
            onPickCategory={ref => onPickCategory(`${groupKey}-${i}`, ref)}
            itemInfo={itemInfo}
          />
        ))}
      </div>
    </div>
  );
}

export function StepEquipment({ data, patch }: StepEquipmentProps) {
  const [bgGroups, setBgGroups] = useState<EquipmentGroup[]>([]);
  const [classGroups, setClassGroups] = useState<EquipmentGroup[]>([]);
  const [goldFormula, setGoldFormula] = useState<GoldFormula | null>(null);
  const [useGold, setUseGold] = useState(false);
  const [rolledGoldCp, setRolledGoldCp] = useState<number | null>(null);
  const [selections, setSelections] = useState<Record<string, number>>({});
  const [categoryPicks, setCategoryPicks] = useState<Record<string, RefId>>({});
  const [itemInfo, setItemInfo] = useState<Map<string, RefId>>(new Map());

  // Background starting equipment (the plain array-of-groups shape)
  useEffect(() => {
    if (!data.backgroundRef) { setBgGroups([]); return; }
    fetch(`${import.meta.env.BASE_URL}data/backgrounds.json`)
      .then(r => r.json())
      .then((json: { background: { name: string; source: string; startingEquipment?: unknown }[] }) => {
        const bg = json.background.find(
          b => b.name === data.backgroundRef!.name && b.source === data.backgroundRef!.source,
        );
        setBgGroups(parseEquipmentGroups(bg?.startingEquipment));
      });
  }, [data.backgroundRef?.name, data.backgroundRef?.source]);

  // Class starting equipment (wrapped in { defaultData, goldAlternative })
  useEffect(() => {
    if (!data.classRef) { setClassGroups([]); setGoldFormula(null); return; }
    const slug = data.classRef.name.toLowerCase();
    fetch(`${import.meta.env.BASE_URL}data/class/class-${slug}.json`)
      .then(r => r.json())
      .then((json: { class: { name: string; source: string; startingEquipment?: { defaultData?: unknown; goldAlternative?: string } }[] }) => {
        const cls = json.class.find(
          c => c.name === data.classRef!.name && c.source === data.classRef!.source,
        );
        setClassGroups(parseEquipmentGroups(cls?.startingEquipment?.defaultData));
        setGoldFormula(parseGoldAlternative(cls?.startingEquipment?.goldAlternative));
      })
      .catch(() => { setClassGroups([]); setGoldFormula(null); });
  }, [data.classRef?.name, data.classRef?.source]);

  // Resolve every referenced item key -> real {name, source}, once per equipment-set change
  useEffect(() => {
    const keys = new Set<string>();
    for (const g of [...bgGroups, ...classGroups]) {
      for (const opt of g.options) {
        for (const atom of opt) if (atom.kind === 'item') keys.add(atom.key);
      }
    }
    if (keys.size === 0) { setItemInfo(new Map()); return; }
    const keysArr = [...keys];
    db.items.bulkGet(keysArr).then(items => {
      const map = new Map<string, RefId>();
      items.forEach((it, i) => { if (it) map.set(keysArr[i], { name: it.name, source: it.source }); });
      setItemInfo(map);
    });
  }, [bgGroups, classGroups]);

  const sourcedGroups = useMemo(() => {
    const list: { key: string; group: EquipmentGroup }[] = [];
    bgGroups.forEach((g, i) => list.push({ key: `bg-${i}`, group: g }));
    if (!useGold) classGroups.forEach((g, i) => list.push({ key: `cls-${i}`, group: g }));
    return list;
  }, [bgGroups, classGroups, useGold]);

  const resolved = useMemo(() => {
    const items: InventoryItem[] = [];
    const specials: string[] = [];
    let cp = 0;

    for (const { key, group } of sourcedGroups) {
      const idx = group.options.length > 1 ? (selections[key] ?? 0) : 0;
      const atoms = group.options[idx] ?? [];
      atoms.forEach((atom, i) => {
        if (atom.kind === 'item') {
          const ref = itemInfo.get(atom.key);
          if (ref) items.push({ itemRef: ref, quantity: atom.quantity, equipped: false });
          else specials.push(`${atom.displayName ?? atom.key.split('|')[0]}${atom.quantity > 1 ? ` ×${atom.quantity}` : ''}`);
        } else if (atom.kind === 'currency') {
          cp += atom.cp;
        } else if (atom.kind === 'special') {
          specials.push(`${atom.label}${atom.quantity > 1 ? ` ×${atom.quantity}` : ''}`);
        } else {
          const pick = categoryPicks[`${key}-${i}`];
          if (pick) items.push({ itemRef: pick, quantity: atom.quantity, equipped: false });
          else specials.push(`(choose) ${categoryLabel(atom.types)}`);
        }
      });
    }

    if (useGold && goldFormula) cp += rolledGoldCp ?? 0;

    return {
      inventory: items,
      currency: { ...ZERO_CURRENCY, gp: Math.floor(cp / 100), cp: cp % 100 },
      notes: specials.join('\n'),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourcedGroups, selections, categoryPicks, itemInfo, useGold, goldFormula, rolledGoldCp]);

  useEffect(() => {
    patch({
      resolvedInventory: resolved.inventory,
      resolvedCurrency: resolved.currency,
      equipmentNotes: resolved.notes,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolved]);

  const toggleGold = () => {
    if (!goldFormula) return;
    const next = !useGold;
    setUseGold(next);
    if (next && rolledGoldCp === null) setRolledGoldCp(rollGold(goldFormula));
  };

  const isEmpty = resolved.inventory.length === 0 && !resolved.notes && resolved.currency.gp === 0 && resolved.currency.cp === 0;

  return (
    <div className="px-4 pb-6 space-y-5 pt-3">
      <h2 className="text-base font-semibold">Starting Equipment</h2>

      {bgGroups.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wide font-semibold text-[var(--color-faint)]">
            From {data.backgroundRef?.name}
          </p>
          {bgGroups.map((g, i) => (
            <GroupCard
              key={`bg-${i}`}
              groupKey={`bg-${i}`}
              group={g}
              selectedIndex={selections[`bg-${i}`] ?? 0}
              onSelectOption={idx => setSelections(s => ({ ...s, [`bg-${i}`]: idx }))}
              categoryPicks={categoryPicks}
              onPickCategory={(atomKey, ref) => setCategoryPicks(c => ({ ...c, [atomKey]: ref }))}
              itemInfo={itemInfo}
            />
          ))}
        </div>
      )}

      {goldFormula && (
        <button
          onClick={toggleGold}
          className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
            useGold ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-[var(--color-card)] text-[var(--color-text-2)]'
          }`}
        >
          {useGold ? '✓ Using starting gold instead of class equipment' : 'Take starting gold instead of class equipment'}
        </button>
      )}

      {useGold && goldFormula ? (
        <div className="bg-[var(--color-card)] rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-base font-bold text-amber-500">{(rolledGoldCp ?? 0) / 100} gp</p>
            <p className="text-xs text-[var(--color-faint)]">Rolled {formulaLabel(goldFormula)}</p>
          </div>
          <button
            onClick={() => setRolledGoldCp(rollGold(goldFormula))}
            className="text-xs text-amber-500 font-semibold"
          >
            🎲 Reroll
          </button>
        </div>
      ) : classGroups.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wide font-semibold text-[var(--color-faint)]">
            From {data.classRef?.name}
          </p>
          {classGroups.map((g, i) => (
            <GroupCard
              key={`cls-${i}`}
              groupKey={`cls-${i}`}
              group={g}
              selectedIndex={selections[`cls-${i}`] ?? 0}
              onSelectOption={idx => setSelections(s => ({ ...s, [`cls-${i}`]: idx }))}
              categoryPicks={categoryPicks}
              onPickCategory={(atomKey, ref) => setCategoryPicks(c => ({ ...c, [atomKey]: ref }))}
              itemInfo={itemInfo}
            />
          ))}
        </div>
      )}

      <div className="bg-[var(--color-card)] rounded-xl p-4 space-y-1.5">
        <h3 className="text-sm font-semibold text-[var(--color-muted)] uppercase tracking-wide">You'll start with</h3>
        {isEmpty ? (
          <p className="text-xs text-[var(--color-faint)]">Nothing yet — make your choices above.</p>
        ) : (
          <>
            {resolved.inventory.length > 0 && (
              <p className="text-sm text-[var(--color-text-2)]">
                {resolved.inventory.map(i => `${i.itemRef.name}${i.quantity > 1 ? ` ×${i.quantity}` : ''}`).join(', ')}
              </p>
            )}
            {resolved.notes && (
              <p className="text-sm text-[var(--color-text-2)]">{resolved.notes.split('\n').join(', ')}</p>
            )}
            {(resolved.currency.gp > 0 || resolved.currency.cp > 0) && (
              <p className="text-sm font-semibold text-amber-500">
                {resolved.currency.gp} gp{resolved.currency.cp > 0 ? ` ${resolved.currency.cp} cp` : ''}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
