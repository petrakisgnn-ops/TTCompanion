import { useEffect, useMemo, useState } from 'react';
import { db } from '../../../data/db';
import type { StoredItem } from '../../../data/db';
import { Sheet } from '../../../ui/Sheet';
import { useCharacterStore } from '../../../stores/characterStore';
import type { Character } from '../../../domain/character/types';
import {
  blankCustomItem, customItemToItem, type CustomItem, type CustomItemKind,
} from '../../../domain/character/customItems';
import { weaponAttack } from '../../../domain/rules/attacks';
import { proficiencyBonus, totalLevel } from '../../../domain/rules';
import { matchesEdition } from '../../../domain/rules/edition';

interface CustomItemSheetProps {
  character: Character;
  /** The item to edit; omit to create a new one. */
  item?: CustomItem;
  /** Prefills the name of a new item (e.g. from an inventory search that found nothing). */
  initialName?: string;
  onClose: () => void;
}

const KINDS: { key: CustomItemKind; label: string }[] = [
  { key: 'weapon', label: 'Weapon' },
  { key: 'armor', label: 'Armor' },
  { key: 'shield', label: 'Shield' },
  { key: 'other', label: 'Other' },
];

const RARITIES = ['none', 'common', 'uncommon', 'rare', 'very rare', 'legendary', 'artifact'];

const DAMAGE_TYPES: { code: string; label: string }[] = [
  { code: '', label: 'From base item' },
  { code: 'B', label: 'Bludgeoning' }, { code: 'P', label: 'Piercing' }, { code: 'S', label: 'Slashing' },
  { code: 'A', label: 'Acid' }, { code: 'C', label: 'Cold' }, { code: 'F', label: 'Fire' }, { code: 'O', label: 'Force' },
  { code: 'L', label: 'Lightning' }, { code: 'N', label: 'Necrotic' }, { code: 'I', label: 'Poison' },
  { code: 'Y', label: 'Psychic' }, { code: 'R', label: 'Radiant' }, { code: 'T', label: 'Thunder' },
];

const typeCode = (t: unknown) => (typeof t === 'string' ? t.split('|')[0] : '');

/** Which reference items can serve as the base for each kind. */
function baseMatchesKind(item: StoredItem, kind: CustomItemKind): boolean {
  const code = typeCode(item.type);
  switch (kind) {
    case 'weapon': return !!item.weaponCategory && !item.bonusWeapon && (item.rarity ?? 'none') === 'none';
    case 'armor': return ['LA', 'MA', 'HA'].includes(code) && (item.rarity ?? 'none') === 'none';
    case 'shield': return code === 'S' && (item.rarity ?? 'none') === 'none';
    default: return false;
  }
}

const inputCls = 'w-full bg-[var(--color-raised)] rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-[var(--color-gold-lt)] placeholder:text-[var(--color-faint)]';
const labelCls = 'block text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wide mb-1';

function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex-1 bg-[var(--color-raised)] rounded-xl p-2">
      <p className="text-[11px] text-[var(--color-faint)] text-center mb-1">{label}</p>
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => onChange(value - 1)}
          className="w-11 h-11 rounded-lg bg-[var(--color-card)] text-lg font-bold"
          aria-label={`Decrease ${label}`}
        >−</button>
        <span className="font-bold text-lg w-10 text-center">{value >= 0 ? `+${value}` : value}</span>
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          className="w-11 h-11 rounded-lg bg-[var(--color-card)] text-lg font-bold"
          aria-label={`Increase ${label}`}
        >+</button>
      </div>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
      className={`flex-1 min-h-[44px] rounded-xl px-3 text-sm font-medium transition-colors ${
        checked ? 'bg-amber-500 text-slate-900' : 'bg-[var(--color-raised)] text-[var(--color-text-2)]'
      }`}
    >
      {label}
    </button>
  );
}

/**
 * Create / edit a player-made item — name, base weapon or armor, magic attack & damage
 * bonuses, extra damage, AC bonus, rarity, attunement, and a description. New items are
 * added to the inventory on save. Shows a live attack preview for weapons.
 */
export function CustomItemSheet({ character, item, initialName, onClose }: CustomItemSheetProps) {
  const { saveCustomItem, removeCustomItem } = useCharacterStore();
  const [draft, setDraft] = useState<CustomItem>(
    () => item ?? { ...blankCustomItem(crypto.randomUUID()), name: initialName ?? '' },
  );
  const [bases, setBases] = useState<StoredItem[]>([]);
  const [baseQuery, setBaseQuery] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const set = <K extends keyof CustomItem>(k: K, v: CustomItem[K]) => setDraft(d => ({ ...d, [k]: v }));

  // All reference items, once — filtered client-side to valid bases for the chosen kind.
  useEffect(() => {
    void db.items.orderBy('name').toArray().then(setBases);
  }, []);

  const base = useMemo(
    () => (draft.baseItem
      ? bases.find(b => b.name === draft.baseItem!.name && b.source === draft.baseItem!.source) ?? null
      : null),
    [bases, draft.baseItem],
  );

  const baseResults = useMemo(() => {
    if (draft.kind === 'other') return [];
    const q = baseQuery.trim().toLowerCase();
    return bases
      .filter(b => baseMatchesKind(b, draft.kind) && matchesEdition(b.source, b.reprintedAs, character.edition))
      .filter(b => !q || b.name.toLowerCase().includes(q))
      .slice(0, q ? 12 : 8);
  }, [bases, baseQuery, draft.kind, character.edition]);

  const nameTaken = (character.customItems ?? []).some(
    c => c.id !== draft.id && c.name.trim().toLowerCase() === draft.name.trim().toLowerCase(),
  );
  const canSave = draft.name.trim().length > 0 && !nameTaken;

  const preview = draft.kind === 'weapon'
    ? weaponAttack(customItemToItem(draft, base), character.abilityScores, proficiencyBonus(totalLevel(character.classes)))
    : null;

  const save = async () => {
    if (!canSave) return;
    await saveCustomItem(character.id, { ...draft, name: draft.name.trim() }, !item);
    onClose();
  };

  const changeKind = (kind: CustomItemKind) => setDraft(d => ({ ...d, kind, baseItem: undefined }));

  return (
    <Sheet icon="construction" title={item ? 'Edit Item' : 'Create Item'} onClose={onClose} maxHeight="92vh">
      <div className="space-y-4">
        {/* Name */}
        <div>
          <label className={labelCls} htmlFor="ci-name">Name</label>
          <input
            id="ci-name"
            value={draft.name}
            onChange={e => set('name', e.target.value)}
            placeholder="e.g. Mace of Warning"
            className={inputCls}
            autoFocus={!item}
          />
          {nameTaken && <p className="text-xs text-red-400 mt-1">You already have a custom item with this name.</p>}
        </div>

        {/* Kind */}
        <div>
          <span className={labelCls}>Type</span>
          <div className="grid grid-cols-4 gap-1.5">
            {KINDS.map(k => (
              <button
                key={k.key}
                type="button"
                onClick={() => changeKind(k.key)}
                className={`min-h-[44px] rounded-xl text-sm font-medium ${
                  draft.kind === k.key ? 'bg-amber-500 text-slate-900' : 'bg-[var(--color-raised)] text-[var(--color-text-2)]'
                }`}
              >
                {k.label}
              </button>
            ))}
          </div>
        </div>

        {/* Base item */}
        {draft.kind !== 'other' && (
          <div>
            <span className={labelCls}>Based on</span>
            {draft.baseItem ? (
              <div className="flex items-center justify-between bg-[var(--color-raised)] rounded-xl px-3 min-h-[44px]">
                <span className="text-sm">
                  {draft.baseItem.name}
                  {typeof base?.dmg1 === 'string' ? <span className="text-[var(--color-faint)]"> · {base.dmg1}</span> : null}
                  {typeof base?.ac === 'number' ? <span className="text-[var(--color-faint)]"> · AC {base.ac}</span> : null}
                </span>
                <button type="button" onClick={() => set('baseItem', undefined)} className="text-xs text-amber-500 px-2 min-h-[44px]">
                  Change
                </button>
              </div>
            ) : (
              <>
                <input
                  type="search"
                  value={baseQuery}
                  onChange={e => setBaseQuery(e.target.value)}
                  placeholder={draft.kind === 'weapon' ? 'Search weapons (e.g. mace)…' : 'Search armor…'}
                  className={inputCls}
                />
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {baseResults.map(b => (
                    <button
                      key={b._key}
                      type="button"
                      onClick={() => { set('baseItem', { name: b.name, source: b.source }); setBaseQuery(''); }}
                      className="px-3 min-h-[36px] rounded-lg bg-[var(--color-raised)] text-xs text-[var(--color-text-2)] hover:bg-[var(--color-card-inner)]"
                    >
                      {b.name}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-[var(--color-faint)] mt-1.5">
                  Optional — the base supplies damage dice, properties and armor class.
                </p>
              </>
            )}
          </div>
        )}

        {/* Weapon stats */}
        {draft.kind === 'weapon' && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Stepper label="Attack bonus" value={draft.attackBonus} onChange={n => set('attackBonus', n)} />
              <Stepper label="Damage bonus" value={draft.damageBonus} onChange={n => set('damageBonus', n)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelCls} htmlFor="ci-dice">Damage dice</label>
                <input
                  id="ci-dice"
                  value={draft.damageDice ?? ''}
                  onChange={e => set('damageDice', e.target.value || undefined)}
                  placeholder={typeof base?.dmg1 === 'string' ? base.dmg1 : '1d6'}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls} htmlFor="ci-type">Damage type</label>
                <select
                  id="ci-type"
                  value={draft.damageType ?? ''}
                  onChange={e => set('damageType', e.target.value || undefined)}
                  className={inputCls}
                >
                  {DAMAGE_TYPES.map(t => <option key={t.code} value={t.code}>{t.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className={labelCls} htmlFor="ci-extra">Extra damage on hit</label>
              <input
                id="ci-extra"
                value={draft.extraDamage ?? ''}
                onChange={e => set('extraDamage', e.target.value || undefined)}
                placeholder="e.g. 1d6 radiant"
                className={inputCls}
              />
            </div>
            <div className="flex gap-2">
              <Toggle label="Finesse" checked={draft.finesse} onChange={v => set('finesse', v)} />
              {!draft.baseItem && <Toggle label="Ranged" checked={draft.ranged} onChange={v => set('ranged', v)} />}
            </div>
            {preview && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2 text-sm">
                <span className="text-[var(--color-faint)]">Attack: </span>
                <span className="font-bold text-amber-400">{preview.attackBonus >= 0 ? `+${preview.attackBonus}` : preview.attackBonus}</span>
                <span className="text-[var(--color-faint)]"> · Damage: </span>
                <span className="font-semibold">{preview.damage} {preview.damageType}</span>
                {preview.extraDamage && <span> + {preview.extraDamage}</span>}
              </div>
            )}
          </div>
        )}

        {/* Defensive stats */}
        <div className="flex gap-2">
          {(draft.kind === 'armor' || draft.kind === 'shield') && !draft.baseItem && (
            <div className="flex-1">
              <label className={labelCls} htmlFor="ci-ac">{draft.kind === 'shield' ? 'Shield AC' : 'Base AC'}</label>
              <input
                id="ci-ac"
                type="number"
                inputMode="numeric"
                value={draft.baseAc ?? ''}
                onChange={e => set('baseAc', e.target.value === '' ? undefined : Number(e.target.value))}
                placeholder={draft.kind === 'shield' ? '2' : '14'}
                className={inputCls}
              />
            </div>
          )}
          <Stepper label="AC bonus" value={draft.acBonus} onChange={n => set('acBonus', n)} />
        </div>

        {/* Rarity / attunement / weight */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelCls} htmlFor="ci-rarity">Rarity</label>
            <select id="ci-rarity" value={draft.rarity} onChange={e => set('rarity', e.target.value)} className={inputCls}>
              {RARITIES.map(r => <option key={r} value={r}>{r === 'none' ? 'None' : r.replace(/^\w/, c => c.toUpperCase())}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="ci-weight">Weight (lb.)</label>
            <input
              id="ci-weight"
              type="number"
              inputMode="decimal"
              value={draft.weight ?? ''}
              onChange={e => set('weight', e.target.value === '' ? undefined : Number(e.target.value))}
              placeholder={typeof base?.weight === 'number' ? String(base.weight) : '—'}
              className={inputCls}
            />
          </div>
        </div>
        <div className="flex">
          <Toggle label="Requires attunement" checked={draft.requiresAttunement} onChange={v => set('requiresAttunement', v)} />
        </div>

        {/* Description */}
        <div>
          <label className={labelCls} htmlFor="ci-desc">Description</label>
          <textarea
            id="ci-desc"
            value={draft.description}
            onChange={e => set('description', e.target.value)}
            rows={5}
            placeholder="What the item does. Leave a blank line between paragraphs."
            className={`${inputCls} resize-y`}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          {item && (
            confirmDelete ? (
              <button
                type="button"
                onClick={() => { void removeCustomItem(character.id, item.id).then(onClose); }}
                className="min-h-[44px] px-4 rounded-xl bg-red-500/20 text-red-300 text-sm font-semibold"
              >
                Confirm delete
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="min-h-[44px] px-4 rounded-xl bg-[var(--color-raised)] text-red-400 text-sm font-semibold"
              >
                Delete
              </button>
            )
          )}
          <button
            type="button"
            onClick={() => { void save(); }}
            disabled={!canSave}
            className="flex-1 min-h-[44px] rounded-xl bg-amber-500 text-slate-900 text-sm font-semibold disabled:opacity-40"
          >
            {item ? 'Save changes' : 'Create & add to inventory'}
          </button>
        </div>
      </div>
    </Sheet>
  );
}
