import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNpcStore } from '../../stores/npcStore';
import { useSceneStore } from '../../stores/sceneStore';
import { UNASSIGNED_GROUP_ID } from '../../domain/dm/types';
import type { NpcDefinition } from '../../domain/dm/types';
import { AddNpcSheet } from './AddNpcSheet';

const DISPOSITION_DOT: Record<string, string> = {
  friendly: '#5ec27a', neutral: '#8a93a0', hostile: '#e0556b',
};

function NpcRow({ npc, onOpen }: { npc: NpcDefinition; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 4px', background: 'none', border: 'none', borderBottom: '1px solid var(--color-border)',
        textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit',
      }}
    >
      <span style={{ width: 8, height: 8, borderRadius: 999, background: DISPOSITION_DOT[npc.disposition], flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--color-text-2)' }}>
          {npc.name}{npc.count > 1 ? ` ×${npc.count}` : ''}
        </p>
        {npc.source && <p style={{ fontSize: 11, color: 'var(--color-faint)' }}>based on: {npc.source.name}</p>}
      </div>
      <span className="msym" style={{ fontSize: 18, color: 'var(--color-disabled)' }}>chevron_right</span>
    </button>
  );
}

function GroupCard({
  name, npcs, onDeploy, onRename, onDelete, onAddNpc,
}: {
  name: string; npcs: NpcDefinition[];
  onDeploy: () => void; onRename: (() => void) | null; onDelete: (() => void) | null; onAddNpc: () => void;
}) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 16, overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '13px 14px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}
      >
        <span className="msym" style={{ fontSize: 20, color: '#d08c4a', transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }}>chevron_right</span>
        <span style={{ flex: 1, fontSize: 14.5, fontWeight: 800, color: 'var(--color-text)' }}>{name}</span>
        <span style={{ fontSize: 11.5, color: 'var(--color-faint)' }}>{npcs.length}</span>
      </button>

      {open && (
        <div style={{ padding: '0 14px 14px' }}>
          {npcs.length === 0 ? (
            <p style={{ fontSize: 12.5, color: 'var(--color-faint)', padding: '4px 0 10px' }}>No NPCs yet.</p>
          ) : (
            <div style={{ marginBottom: 10 }}>
              {npcs.map(n => <NpcRow key={n.id} npc={n} onOpen={() => navigate(`/npcs/${n.id}`)} />)}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={onAddNpc} style={smallBtn}>+ NPC</button>
            {npcs.length > 0 && <button onClick={onDeploy} style={{ ...smallBtn, background: '#b87333', color: '#1a1206', border: 'none' }}>Add to Home</button>}
            {onRename && <button onClick={onRename} style={smallBtn}>Rename</button>}
            {onDelete && <button onClick={onDelete} style={{ ...smallBtn, color: '#e0556b' }}>Delete</button>}
          </div>
        </div>
      )}
    </div>
  );
}

const smallBtn: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, padding: '7px 12px', borderRadius: 9,
  background: 'var(--color-raised)', border: '1px solid var(--color-border)',
  color: 'var(--color-text-2)', cursor: 'pointer', fontFamily: 'inherit',
};

export function NpcsPage() {
  const { npcs, groups, loaded, load, createGroup, renameGroup, deleteGroup } = useNpcStore();
  const { deployNpcDefinitions } = useSceneStore();
  const [addSheetGroupId, setAddSheetGroupId] = useState<string | null>(null);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  useEffect(() => { if (!loaded) load(); }, [loaded, load]);

  const npcsFor = (groupId: string) => npcs.filter(n => n.groupId === groupId);

  const handleDeleteGroup = async (id: string) => {
    const hasNpcs = npcsFor(id).length > 0;
    if (!hasNpcs) { await deleteGroup(id, 'deleteContents'); return; }
    const moveToUnassigned = window.confirm(
      'This setting has NPCs in it. Click OK to move them to Unassigned, or Cancel to delete them along with the setting.',
    );
    await deleteGroup(id, moveToUnassigned ? 'moveToUnassigned' : 'deleteContents');
  };

  return (
    <div style={{ padding: '14px 14px 90px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className="msym" style={{ fontSize: 26, color: '#d08c4a' }}>groups</span>
        <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-.01em', flex: 1 }}>NPCs</span>
        <button
          onClick={() => setCreatingGroup(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 13px', borderRadius: 11, background: 'var(--color-raised)', border: '1px solid var(--color-border)', color: 'var(--color-text-2)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          <span className="msym" style={{ fontSize: 16 }}>add</span> Setting
        </button>
      </div>

      {creatingGroup && (
        <div style={{ display: 'flex', gap: 8, background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 14, padding: 10 }}>
          <input
            autoFocus
            placeholder="Setting name — e.g. Goblin village"
            value={newGroupName}
            onChange={e => setNewGroupName(e.target.value)}
            style={{ flex: 1, background: 'var(--color-card-inner)', border: '1px solid var(--color-border)', borderRadius: 9, padding: '8px 11px', fontSize: 13.5, color: 'var(--color-text)', outline: 'none', fontFamily: 'inherit' }}
          />
          <button
            onClick={async () => { if (newGroupName.trim()) await createGroup(newGroupName.trim()); setNewGroupName(''); setCreatingGroup(false); }}
            style={{ padding: '0 14px', borderRadius: 9, background: '#b87333', color: '#1a1206', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Create
          </button>
        </div>
      )}

      {!loaded ? (
        <p style={{ color: 'var(--color-muted)', fontSize: 13 }}>Loading…</p>
      ) : (
        <>
          {groups.map(g => (
            <GroupCard
              key={g.id}
              name={g.name}
              npcs={npcsFor(g.id)}
              onAddNpc={() => setAddSheetGroupId(g.id)}
              onDeploy={() => deployNpcDefinitions(npcsFor(g.id))}
              onRename={() => { const name = window.prompt('Rename setting', g.name); if (name?.trim()) renameGroup(g.id, name.trim()); }}
              onDelete={() => handleDeleteGroup(g.id)}
            />
          ))}
          <GroupCard
            name="Unassigned"
            npcs={npcsFor(UNASSIGNED_GROUP_ID)}
            onAddNpc={() => setAddSheetGroupId(UNASSIGNED_GROUP_ID)}
            onDeploy={() => deployNpcDefinitions(npcsFor(UNASSIGNED_GROUP_ID))}
            onRename={null}
            onDelete={null}
          />
        </>
      )}

      {addSheetGroupId && (
        <AddNpcSheet defaultGroupId={addSheetGroupId} onClose={() => setAddSheetGroupId(null)} />
      )}
    </div>
  );
}
