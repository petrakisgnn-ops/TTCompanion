import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useNpcStore } from '../../stores/npcStore';
import { useSceneStore } from '../../stores/sceneStore';
import { UNASSIGNED_GROUP_ID } from '../../domain/dm/types';
import { renderEntries } from '../../rendering';
import { NpcFullEditor } from './NpcFullEditor';

const DISPOSITION_COLOR: Record<string, string> = {
  friendly: '#5ec27a', neutral: '#8a93a0', hostile: '#e0556b',
};

const actionBtn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6, padding: '9px 13px', borderRadius: 11,
  background: 'var(--color-raised)', border: '1px solid var(--color-border)',
  color: 'var(--color-text-2)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
};

export function NpcDetailPage() {
  const { npcId } = useParams<{ npcId: string }>();
  const navigate = useNavigate();
  const { npcs, groups, loaded, load, updateNpc, deleteNpc, moveNpc } = useNpcStore();
  const { scene, deployNpcDefinitions, setInstanceInitiative } = useSceneStore();
  const [editingFull, setEditingFull] = useState(false);
  const [notes, setNotes] = useState('');
  const [notesLoaded, setNotesLoaded] = useState(false);

  useEffect(() => { if (!loaded) load(); }, [loaded, load]);

  const npc = npcs.find(n => n.id === npcId);

  useEffect(() => {
    if (npc && !notesLoaded) { setNotes(npc.notes); setNotesLoaded(true); }
  }, [npc, notesLoaded]);

  useEffect(() => {
    if (!npc || !notesLoaded || notes === npc.notes) return;
    const t = setTimeout(() => updateNpc(npc.id, n => ({ ...n, notes })), 500);
    return () => clearTimeout(t);
  }, [notes, npc, notesLoaded, updateNpc]);

  if (!loaded) return <div style={{ padding: 20, color: 'var(--color-muted)', fontSize: 13 }}>Loading…</div>;
  if (!npc) return <div style={{ padding: 20, color: 'var(--color-muted)', fontSize: 13 }}>NPC not found.</div>;

  const sb = npc.statBlock;

  const addToCombat = async () => {
    const before = new Set(scene.deployed.map(d => d.id));
    await deployNpcDefinitions([{ ...npc, count: 1 }]);
    const newInstance = useSceneStore.getState().scene.deployed.find(d => !before.has(d.id));
    if (!newInstance) return;
    const raw = window.prompt(`Initiative for ${newInstance.name}?`, '10');
    const value = raw !== null ? Number(raw) : null;
    if (value !== null && !isNaN(value)) await setInstanceInitiative(newInstance.id, value);
  };

  return (
    <div style={{ padding: '14px 14px 90px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <button onClick={() => navigate('/npcs')} style={{ display: 'flex', alignItems: 'center', gap: 4, alignSelf: 'flex-start', background: 'none', border: 'none', color: 'var(--color-muted)', fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit' }}>
        <span className="msym" style={{ fontSize: 18 }}>arrow_back</span> NPCs
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ width: 10, height: 10, borderRadius: 999, background: DISPOSITION_COLOR[npc.disposition], flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 21, fontWeight: 800, color: 'var(--color-text)' }}>{npc.name}</h1>
          <p style={{ fontSize: 12, color: 'var(--color-faint)' }}>
            {npc.race ? `${npc.race} · ` : ''}{npc.disposition}
            {npc.count > 1 && ` · ×${npc.count}`}
          </p>
        </div>
      </div>

      {npc.description && <p style={{ fontSize: 13.5, color: 'var(--color-text-3)', fontStyle: 'italic' }}>{npc.description}</p>}

      {npc.source && (
        <button onClick={() => navigate(`/bestiary/${npc.source!.key}`)} style={{ ...actionBtn, alignSelf: 'flex-start' }}>
          <span className="msym" style={{ fontSize: 16 }}>auto_stories</span> based on: {npc.source.name}
        </button>
      )}

      {/* Stat block */}
      {sb ? (
        <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 14 }}>
            <Stat label="AC" value={String(sb.ac)} />
            <Stat label="HP" value={`${sb.hp.current}/${sb.hp.max}`} />
            <Stat label="Speed" value={sb.speed} />
            {sb.cr && <Stat label="CR" value={sb.cr} />}
          </div>
          {sb.abilityScores && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6 }}>
              {(['str', 'dex', 'con', 'int', 'wis', 'cha'] as const).map(a => (
                <div key={a} style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: 10, color: 'var(--color-faint)', textTransform: 'uppercase' }}>{a}</p>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-2)' }}>{sb.abilityScores![a]}</p>
                </div>
              ))}
            </div>
          )}
          {(sb.saves?.length || sb.skills?.length) && (
            <p style={{ fontSize: 12, color: 'var(--color-text-3)' }}>
              {sb.saves?.length ? <><b>Saves</b> {sb.saves.join(', ')}. </> : null}
              {sb.skills?.length ? <><b>Skills</b> {sb.skills.join(', ')}.</> : null}
            </p>
          )}
          {(sb.senses || sb.languages) && (
            <p style={{ fontSize: 12, color: 'var(--color-text-3)' }}>
              {sb.senses ? <><b>Senses</b> {sb.senses}. </> : null}
              {sb.languages ? <><b>Languages</b> {sb.languages}.</> : null}
            </p>
          )}
          {(sb.traits || sb.actions || sb.reactions) && (
            <div className="text-sm" style={{ color: 'var(--color-text-2)' }}>
              {sb.traits && renderEntries(sb.traits)}
              {sb.actions && <><h3 className="font-semibold mb-1 mt-2">Actions</h3>{renderEntries(sb.actions)}</>}
              {sb.reactions && <><h3 className="font-semibold mb-1 mt-2">Reactions</h3>{renderEntries(sb.reactions)}</>}
            </div>
          )}
        </div>
      ) : (
        <p style={{ fontSize: 12.5, color: 'var(--color-faint)' }}>No combat stats yet.</p>
      )}

      {/* Notes */}
      <div>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>Notes</p>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="What they know, secrets, voice reminders…"
          rows={4}
          style={{ width: '100%', background: 'var(--color-card-inner)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 10, fontSize: 13, color: 'var(--color-text)', outline: 'none', fontFamily: 'inherit', resize: 'vertical' }}
        />
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <button style={actionBtn} onClick={() => setEditingFull(true)}>
          <span className="msym" style={{ fontSize: 16 }}>edit</span> {sb ? 'Edit stat block' : 'Expand to full stat block'}
        </button>
        <button style={actionBtn} onClick={() => deployNpcDefinitions([{ ...npc, count: 1 }])}>
          <span className="msym" style={{ fontSize: 16 }}>person_add</span> Add to scene
        </button>
        {scene.combatActive && (
          <button style={actionBtn} onClick={addToCombat}>
            <span className="msym" style={{ fontSize: 16 }}>swords</span> Add to combat
          </button>
        )}
        <select
          value={npc.groupId}
          onChange={e => moveNpc(npc.id, e.target.value)}
          style={{ ...actionBtn, appearance: 'auto' } as React.CSSProperties}
        >
          <option value={UNASSIGNED_GROUP_ID}>Unassigned</option>
          {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <button
          style={{ ...actionBtn, color: '#e0556b' }}
          onClick={async () => { if (window.confirm(`Delete ${npc.name}?`)) { await deleteNpc(npc.id); navigate('/npcs'); } }}
        >
          <span className="msym" style={{ fontSize: 16 }}>delete</span> Delete
        </button>
      </div>

      {editingFull && (
        <NpcFullEditor
          npc={npc}
          onSave={async (updated) => { await updateNpc(npc.id, () => updated); setEditingFull(false); }}
          onClose={() => setEditingFull(false)}
        />
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p style={{ fontSize: 10, color: 'var(--color-faint)', textTransform: 'uppercase' }}>{label}</p>
      <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)' }}>{value}</p>
    </div>
  );
}
