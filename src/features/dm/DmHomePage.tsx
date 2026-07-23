import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DndContext, closestCenter, MouseSensor, TouchSensor, useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useCharacterStore } from '../../stores/characterStore';
import { useSceneStore } from '../../stores/sceneStore';
import { pcToCombatant, npcToCombatant, sortByInitiative } from '../../domain/dm/combatant';
import type { CombatantView } from '../../domain/dm/combatant';
import { UNASSIGNED_GROUP_ID } from '../../domain/dm/types';
import { CONDITIONS } from '../../domain/rules/conditions';
import { RosterRow } from './RosterRow';
import { CombatBar } from './CombatBar';
import { AddNpcSheet } from './AddNpcSheet';
import { SessionNotesPanel } from './SessionNotesPanel';
import { DmLobbyBanner } from '../session/DmLobbyBanner';
import { Sheet } from '../../ui/Sheet';

type RowProps = Omit<React.ComponentProps<typeof RosterRow>, 'view' | 'dragHandle'>;

function SortableRosterRow({ view, ...rest }: { view: CombatantView } & RowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: view.id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}>
      <RosterRow
        view={view}
        {...rest}
        dragHandle={
          <button
            {...attributes}
            {...listeners}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 20, flexShrink: 0, color: 'var(--color-disabled)', background: 'none', border: 'none', cursor: 'grab', touchAction: 'none' }}
          >
            <span className="msym" style={{ fontSize: 18 }}>drag_indicator</span>
          </button>
        }
      />
    </div>
  );
}

export function DmHomePage() {
  const navigate = useNavigate();
  const { characters, loaded: charsLoaded, load: loadChars } = useCharacterStore();
  const {
    scene, loaded: sceneLoaded, load: loadScene,
    clearScene, updateInstanceHp, toggleInstanceCondition,
    setPcInitiative, setInstanceInitiative,
    startCombat, endCombat, nextTurn, reorder,
  } = useSceneStore();

  const [showAddNpc, setShowAddNpc] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [conditionPickerFor, setConditionPickerFor] = useState<string | null>(null);

  useEffect(() => { if (!charsLoaded) loadChars(); }, [charsLoaded, loadChars]);
  useEffect(() => { if (!sceneLoaded) loadScene(); }, [sceneLoaded, loadScene]);

  const pcViews = useMemo(
    () => characters.map(c => pcToCombatant(c, scene.pcMeta[c.id])),
    [characters, scene.pcMeta],
  );
  const npcViews = useMemo(() => scene.deployed.map(npcToCombatant), [scene.deployed]);
  const allViews = [...pcViews, ...npcViews];
  const viewById = new Map(allViews.map(v => [v.id, v]));

  const sensors = useSensors(
    useSensor(MouseSensor),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  if (!charsLoaded || !sceneLoaded) {
    return <div style={{ padding: 20, color: 'var(--color-muted)', fontSize: 13 }}>Loading…</div>;
  }

  const handleStartCombat = () => startCombat(sortByInitiative(allViews).map(v => v.id));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = scene.turnOrder.indexOf(String(active.id));
    const newIdx = scene.turnOrder.indexOf(String(over.id));
    if (oldIdx === -1 || newIdx === -1) return;
    reorder(arrayMove(scene.turnOrder, oldIdx, newIdx));
  };

  const rowProps = (view: CombatantView): RowProps => ({
    combatMode: scene.combatActive,
    isCurrentTurn: scene.currentTurnId === view.id,
    onHpDelta: view.editable ? (delta: number) => updateInstanceHp(view.id, delta) : undefined,
    onSetInitiative: scene.combatActive
      ? (value: number) => (view.kind === 'pc' ? setPcInitiative(view.id, value) : setInstanceInitiative(view.id, value))
      : undefined,
    onToggleCondition: view.editable ? (name: string) => toggleInstanceCondition(view.id, name, null) : undefined,
    onAddCondition: view.editable ? () => setConditionPickerFor(view.id) : undefined,
    onTap: view.kind === 'npc'
      ? () => {
          const instance = scene.deployed.find(d => d.id === view.id);
          if (instance?.source) navigate(`/bestiary/${instance.source.key}`);
          else if (instance) navigate(`/npcs/${instance.npcDefId}`);
        }
      : undefined,
  });

  return (
    <div style={{ padding: '14px 14px 90px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className="msym" style={{ fontSize: 26, color: '#d08c4a' }}>castle</span>
        <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-.01em', flex: 1 }}>Session</span>
        <button onClick={() => setShowNotes(true)} style={iconBtn}>
          <span className="msym" style={{ fontSize: 18 }}>edit_note</span>
        </button>
      </div>

      <DmLobbyBanner />

      <div style={{ display: 'flex', gap: 4, background: 'var(--color-card-inner)', border: '1px solid var(--color-border)', borderRadius: 13, padding: 4 }}>
        <button onClick={() => scene.combatActive && endCombat()} style={segBtn(!scene.combatActive)}>Explore</button>
        <button onClick={() => !scene.combatActive && handleStartCombat()} style={segBtn(scene.combatActive)}>Combat</button>
      </div>

      {scene.combatActive && (
        <CombatBar round={scene.round} onNextTurn={nextTurn} onAddEnemy={() => setShowAddNpc(true)} onEndCombat={endCombat} />
      )}

      {allViews.length === 0 ? (
        <p style={{ fontSize: 12.5, color: 'var(--color-faint)', textAlign: 'center', padding: '32px 0' }}>
          No one here yet. Create characters or add an NPC to populate the scene.
        </p>
      ) : scene.combatActive ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={scene.turnOrder} strategy={verticalListSortingStrategy}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {scene.turnOrder.map(id => {
                const view = viewById.get(id);
                return view ? <SortableRosterRow key={id} view={view} {...rowProps(view)} /> : null;
              })}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {allViews.map(view => <RosterRow key={view.id} view={view} {...rowProps(view)} />)}
        </div>
      )}

      {!scene.combatActive && (
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowAddNpc(true)} style={{ ...actionBtn, flex: 1, justifyContent: 'center' }}>
            <span className="msym" style={{ fontSize: 17 }}>person_add</span> Add NPC
          </button>
          {npcViews.length > 0 && (
            <button
              onClick={() => { if (window.confirm('Remove all NPCs from the scene?')) clearScene(); }}
              style={{ ...actionBtn, color: '#e0556b' }}
            >
              <span className="msym" style={{ fontSize: 17 }}>clear_all</span> Clear scene
            </button>
          )}
        </div>
      )}

      {showAddNpc && (
        <AddNpcSheet defaultGroupId={UNASSIGNED_GROUP_ID} deployToScene onClose={() => setShowAddNpc(false)} />
      )}
      {showNotes && <SessionNotesPanel onClose={() => setShowNotes(false)} />}

      {conditionPickerFor && (
        <Sheet icon="sick" title="Add Condition" onClose={() => setConditionPickerFor(null)}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {CONDITIONS.filter(c => !viewById.get(conditionPickerFor)?.conditions.includes(c)).map(c => (
              <button
                key={c}
                onClick={() => {
                  const raw = window.prompt('Expires at end of round? (blank = no expiry)');
                  const parsed = raw && raw.trim() ? Number(raw) : NaN;
                  toggleInstanceCondition(conditionPickerFor, c, isNaN(parsed) ? null : parsed);
                  setConditionPickerFor(null);
                }}
                style={{ fontSize: 12.5, padding: '7px 12px', borderRadius: 10, background: 'var(--color-raised)', border: '1px solid var(--color-border)', color: 'var(--color-text-2)', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                {c}
              </button>
            ))}
          </div>
        </Sheet>
      )}
    </div>
  );
}

const iconBtn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: 36, height: 36, borderRadius: 11, background: 'var(--color-raised)',
  border: '1px solid var(--color-border)', color: 'var(--color-text-2)', cursor: 'pointer', flexShrink: 0,
};

const actionBtn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', borderRadius: 12,
  background: 'var(--color-raised)', border: '1px solid var(--color-border)',
  color: 'var(--color-text-2)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
};

function segBtn(active: boolean): React.CSSProperties {
  return {
    flex: 1, padding: '9px 0', borderRadius: 10, fontSize: 13, fontWeight: 700,
    background: active ? '#b87333' : 'transparent',
    color: active ? '#1a1206' : 'var(--color-muted)',
    border: 'none', cursor: 'pointer', fontFamily: 'inherit',
  };
}
