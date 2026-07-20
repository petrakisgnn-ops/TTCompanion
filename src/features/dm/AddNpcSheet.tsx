import { useEffect, useRef, useState } from 'react';
import { db } from '../../data/db';
import type { StoredMonster } from '../../data/db';
import { crStr } from '../../domain/reference/types';
import { npcStatBlockFromMonster } from '../../domain/dm/statBlockFromMonster';
import type { Disposition, NpcDefinition } from '../../domain/dm/types';
import { UNASSIGNED_GROUP_ID } from '../../domain/dm/types';
import { useNpcStore } from '../../stores/npcStore';
import { useSceneStore } from '../../stores/sceneStore';
import { useCharacterStore } from '../../stores/characterStore';
import { totalLevel } from '../../domain/rules';
import { computeDifficulty, DIFFICULTY_LABELS } from '../../domain/dm/xpBudget';
import { Sheet } from '../../ui/Sheet';
import { NameGeneratorButton } from './NameGeneratorButton';

type Tab = 'compendium' | 'custom';

const DISPOSITIONS: { value: Disposition; label: string; color: string }[] = [
  { value: 'friendly', label: 'Friendly', color: '#5ec27a' },
  { value: 'neutral',  label: 'Neutral',  color: '#8a93a0' },
  { value: 'hostile',  label: 'Hostile',  color: '#e0556b' },
];

const RACE_SUGGESTIONS = ['Human', 'Elf', 'Dwarf', 'Halfling', 'Gnome', 'Half-Orc', 'Tiefling', 'Dragonborn', 'Goblin', 'Orc'];

const inputStyle: React.CSSProperties = {
  flex: 1, background: 'var(--color-card-inner)', border: '1px solid var(--color-border)',
  borderRadius: 10, padding: '9px 12px', fontSize: 14, color: 'var(--color-text)',
  outline: 'none', fontFamily: 'inherit',
};

const label: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase',
  letterSpacing: '.04em', marginBottom: 6, display: 'block',
};

interface AddNpcSheetProps {
  defaultGroupId: string;
  /** Home's "+ Add NPC" and combat's "Add enemy" deploy immediately after creation. */
  deployToScene?: boolean;
  onClose: () => void;
  onCreated?: (def: NpcDefinition, deployedInstanceIds: string[]) => void;
}

export function AddNpcSheet({ defaultGroupId, deployToScene, onClose, onCreated }: AddNpcSheetProps) {
  const { groups, loaded: npcLoaded, load: loadNpcs, createNpc } = useNpcStore();
  const { scene, deployNpcDefinitions } = useSceneStore();
  const { characters, loaded: charsLoaded, load: loadChars } = useCharacterStore();
  const [tab, setTab] = useState<Tab>('compendium');
  const [groupId, setGroupId] = useState(defaultGroupId);
  const [disposition, setDisposition] = useState<Disposition>('hostile');
  const [count, setCount] = useState(1);

  useEffect(() => { if (!npcLoaded) loadNpcs(); }, [npcLoaded, loadNpcs]);
  useEffect(() => { if (!charsLoaded) loadChars(); }, [charsLoaded, loadChars]);

  // ── Compendium path ──────────────────────────────────────────────────────
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<StoredMonster[]>([]);
  const [selected, setSelected] = useState<StoredMonster | null>(null);
  const [compName, setCompName] = useState('');
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (searchRef.current) clearTimeout(searchRef.current);
    if (!query.trim() || selected) { setResults([]); return; }
    searchRef.current = setTimeout(async () => {
      const q = query.toLowerCase();
      const all = await db.monsters.orderBy('name').toArray();
      setResults(all.filter(m => m.name.toLowerCase().includes(q)).slice(0, 20));
    }, 200);
    return () => { if (searchRef.current) clearTimeout(searchRef.current); };
  }, [query, selected]);

  // ── Custom quick-create path ─────────────────────────────────────────────
  const [customName, setCustomName] = useState('');
  const [race, setRace] = useState('');
  const [description, setDescription] = useState('');
  const [showCombatStats, setShowCombatStats] = useState(false);
  const [quickAc, setQuickAc] = useState('');
  const [quickHp, setQuickHp] = useState('');
  const [quickAttack, setQuickAttack] = useState('');

  const submit = async () => {
    let def: NpcDefinition;

    if (tab === 'compendium') {
      if (!selected) return;
      def = {
        id: crypto.randomUUID(),
        name: compName.trim() || selected.name,
        disposition,
        description: '',
        notes: '',
        groupId,
        count,
        source: { key: selected._key, name: selected.name },
        statBlock: npcStatBlockFromMonster(selected),
      };
    } else {
      if (!customName.trim()) return;
      const acProvided = quickAc.trim() !== '';
      const hpProvided = quickHp.trim() !== '';
      const hasQuickStats = acProvided || hpProvided || !!quickAttack.trim();
      const hp = hpProvided ? Number(quickHp) : 10;
      def = {
        id: crypto.randomUUID(),
        name: customName.trim(),
        race: race.trim() || undefined,
        disposition,
        description: description.trim(),
        notes: '',
        groupId,
        count,
        source: null,
        statBlock: hasQuickStats ? {
          ac: acProvided ? Number(quickAc) : 10,
          hp: { current: hp, max: hp },
          speed: '30 ft.',
          actions: quickAttack.trim() ? [quickAttack.trim()] : undefined,
        } : null,
      };
    }

    await createNpc(def);
    let newIds: string[] = [];
    if (deployToScene) {
      const before = new Set(scene.deployed.map(d => d.id));
      await deployNpcDefinitions([def]);
      newIds = useSceneStore.getState().scene.deployed.filter(d => !before.has(d.id)).map(d => d.id);
    }
    onCreated?.(def, newIds);
    onClose();
  };

  const canSubmit = tab === 'compendium' ? !!selected : !!customName.trim();

  return (
    <Sheet icon="person_add" title="Add NPC" onClose={onClose}>
      {/* Source tabs */}
      <div style={{ display: 'flex', gap: 4, background: 'var(--color-card-inner)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 4, marginBottom: 14 }}>
        {(['compendium', 'custom'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1, padding: '8px 0', borderRadius: 9, fontSize: 12.5, fontWeight: 700,
              background: tab === t ? '#b87333' : 'transparent',
              color: tab === t ? '#1a1206' : 'var(--color-muted)',
              border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            {t === 'compendium' ? 'From Compendium' : 'Custom'}
          </button>
        ))}
      </div>

      {tab === 'compendium' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {!selected ? (
            <div style={{ position: 'relative' }}>
              <input
                type="search"
                placeholder="Search bestiary…"
                value={query}
                onChange={e => setQuery(e.target.value)}
                style={{ ...inputStyle, width: '100%' }}
              />
              {results.length > 0 && (
                <div style={{ marginTop: 6, background: 'var(--color-card-inner)', border: '1px solid var(--color-border)', borderRadius: 12, overflow: 'hidden', maxHeight: 260, overflowY: 'auto' }}>
                  {results.map(m => (
                    <button
                      key={m._key}
                      onClick={() => { setSelected(m); setCompName(m.name); setQuery(''); setResults([]); }}
                      style={{ width: '100%', display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: 'none', border: 'none', borderBottom: '1px solid var(--color-border)', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      <span style={{ fontSize: 13.5, color: 'var(--color-text-2)' }}>{m.name}</span>
                      <span style={{ fontSize: 11.5, color: 'var(--color-faint)' }}>CR {crStr(m.cr)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div style={{ background: 'var(--color-card-inner)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>{selected.name}</p>
                <p style={{ fontSize: 11.5, color: 'var(--color-faint)' }}>CR {crStr(selected.cr)} · based on: {selected.name}</p>
              </div>
              <button onClick={() => setSelected(null)} style={{ fontSize: 12, color: '#e0556b', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Change</button>
            </div>
          )}

          {selected && (
            <>
              <div>
                <label style={label}>Name</label>
                <input value={compName} onChange={e => setCompName(e.target.value)} style={{ ...inputStyle, width: '100%' }} />
              </div>
              {charsLoaded && characters.length > 0 && (() => {
                const { budget, adjustedXp, difficultyIndex } = computeDifficulty(
                  characters.map(c => totalLevel(c.classes)),
                  [{ cr: selected.cr, count }],
                );
                return (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--color-card-inner)', borderRadius: 10, padding: '8px 12px' }}>
                    <span style={{ fontSize: 11.5, color: 'var(--color-faint)' }}>
                      {adjustedXp.toLocaleString()} XP vs party budget {budget[1].toLocaleString()}–{budget[3].toLocaleString()}
                    </span>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: difficultyIndex >= 2 ? '#e0556b' : difficultyIndex >= 0 ? '#e0c34a' : '#5ec27a' }}>
                      {difficultyIndex >= 0 ? DIFFICULTY_LABELS[difficultyIndex] : 'Trivial'}
                    </span>
                  </div>
                );
              })()}
            </>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={label}>Name</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={customName} onChange={e => setCustomName(e.target.value)} placeholder="Name" style={inputStyle} />
              <NameGeneratorButton race={race} onGenerate={setCustomName} />
            </div>
          </div>
          <div>
            <label style={label}>Race</label>
            <input value={race} onChange={e => setRace(e.target.value)} placeholder="e.g. Human" style={{ ...inputStyle, width: '100%' }} />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              {RACE_SUGGESTIONS.map(r => (
                <button key={r} onClick={() => setRace(r)} style={{ fontSize: 11.5, padding: '4px 9px', borderRadius: 999, background: 'var(--color-raised)', border: '1px solid var(--color-border)', color: 'var(--color-muted)', cursor: 'pointer', fontFamily: 'inherit' }}>
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={label}>Description / personality note</label>
            <input value={description} onChange={e => setDescription(e.target.value)} placeholder="One line — voice, quirk, what they want…" style={{ ...inputStyle, width: '100%' }} />
          </div>
          <button
            onClick={() => setShowCombatStats(v => !v)}
            style={{ fontSize: 12.5, color: '#d08c4a', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}
          >
            {showCombatStats ? '− Hide combat stats' : '+ Quick combat stats (optional)'}
          </button>
          {showCombatStats && (
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <label style={label}>AC</label>
                <input type="number" value={quickAc} onChange={e => setQuickAc(e.target.value)} style={{ ...inputStyle, width: '100%' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={label}>HP</label>
                <input type="number" value={quickHp} onChange={e => setQuickHp(e.target.value)} style={{ ...inputStyle, width: '100%' }} />
              </div>
              <div style={{ flex: 2 }}>
                <label style={label}>Attack</label>
                <input value={quickAttack} onChange={e => setQuickAttack(e.target.value)} placeholder="Bite +4, 1d6+2" style={{ ...inputStyle, width: '100%' }} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Shared fields */}
      <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label style={label}>Disposition</label>
          <div style={{ display: 'flex', gap: 6 }}>
            {DISPOSITIONS.map(d => (
              <button
                key={d.value}
                onClick={() => setDisposition(d.value)}
                style={{
                  flex: 1, padding: '8px 0', borderRadius: 9, fontSize: 12.5, fontWeight: 700,
                  background: disposition === d.value ? d.color : 'var(--color-raised)',
                  color: disposition === d.value ? '#1a1206' : 'var(--color-muted)',
                  border: '1px solid var(--color-border)', cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={label}>Count</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={() => setCount(c => Math.max(1, c - 1))} style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--color-raised)', border: '1px solid var(--color-border)', color: 'var(--color-text-2)', cursor: 'pointer' }}>−</button>
              <span style={{ fontWeight: 700, width: 24, textAlign: 'center' }}>{count}</span>
              <button onClick={() => setCount(c => c + 1)} style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--color-raised)', border: '1px solid var(--color-border)', color: 'var(--color-text-2)', cursor: 'pointer' }}>+</button>
            </div>
          </div>
          {!deployToScene && (
            <div style={{ flex: 2 }}>
              <label style={label}>Setting</label>
              <select value={groupId} onChange={e => setGroupId(e.target.value)} style={{ ...inputStyle, width: '100%' }}>
                <option value={UNASSIGNED_GROUP_ID}>Unassigned</option>
                {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>

      <button
        onClick={submit}
        disabled={!canSubmit}
        style={{
          marginTop: 18, width: '100%', padding: '13px 0', borderRadius: 13, border: 'none',
          background: canSubmit ? '#b87333' : 'var(--color-disabled)',
          color: canSubmit ? '#1a1206' : 'var(--color-faint)',
          fontWeight: 800, fontSize: 14.5, cursor: canSubmit ? 'pointer' : 'not-allowed', fontFamily: 'inherit',
        }}
      >
        {deployToScene ? 'Add to Scene' : 'Save NPC'}
      </button>
    </Sheet>
  );
}
