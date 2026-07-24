// Import all widgets so they self-register before the engine renders.
import '../../widgets/index';

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCharacterStore } from '../../stores/characterStore';
import { DashboardEngine } from './DashboardEngine';
import { AddWidgetSheet } from './AddWidgetSheet';
import { WidgetConfigSheet } from './WidgetConfigSheet';
import type { WidgetInstance } from '../../domain/widgets/types';
import type { Character } from '../../domain/character/types';
import { classSummary } from '../../domain/character/format';
import type { ResourceTrackerConfig } from '../../widgets/ResourceTrackerWidget';

function buildDefaultWidgets(character: Character): WidgetInstance[] {
  const widgets: WidgetInstance[] = [];
  let order = 0;
  widgets.push({ id: crypto.randomUUID(), type: 'hp-tracker',     config: {}, span: 2, order: order++ });
  widgets.push({ id: crypto.randomUUID(), type: 'ability-scores', config: {}, span: 2, order: order++ });
  for (const resource of character.resources) {
    widgets.push({
      id: crypto.randomUUID(), type: 'resource-tracker',
      config: { resourceId: resource.id } satisfies ResourceTrackerConfig,
      span: 1, order: order++,
    });
  }
  widgets.push({ id: crypto.randomUUID(), type: 'notes', config: {}, span: 2, order: order++ });
  return widgets;
}

/* ── Empty / picker state ─────────────────────────────────────────────────── */

function NoDashboard() {
  const navigate = useNavigate();
  const { characters, loaded, load, setActive } = useCharacterStore();
  useEffect(() => { if (!loaded) load(); }, [loaded, load]);

  if (!loaded) return <div style={{ padding: 20, color: 'var(--color-muted)', fontSize: 13 }}>Loading…</div>;

  if (characters.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '64px 24px', textAlign: 'center' }}>
        <span className="msym" style={{ fontSize: 48, color: 'var(--color-disabled)' }}>person_off</span>
        <p style={{ color: 'var(--color-muted)', fontSize: 14, lineHeight: 1.5 }}>Create a character first to use the dashboard.</p>
        <button
          onClick={() => navigate('/characters/new')}
          style={{
            background: '#b87333', color: '#1a1206', fontWeight: 700, fontSize: 14,
            padding: '12px 28px', borderRadius: 14, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          New Character
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '14px 0 80px' }}>
      <div style={{ padding: '0 14px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-muted)' }}>Choose a character</span>
        <span style={{ fontSize: 11, color: 'var(--color-faint)' }}>Their dashboard will load here.</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {characters.map(c => (
          <button
            key={c.id}
            onClick={() => setActive(c.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 16px', textAlign: 'left', background: 'none', border: 'none',
              cursor: 'pointer', fontFamily: 'inherit',
              borderBottom: '1px solid var(--color-border)',
            }}
          >
            <div style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: 'linear-gradient(135deg,#b87333,#6b3a1f)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: 15, color: '#fff',
            }}>
              {c.name[0]?.toUpperCase()}
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>{c.name}</p>
              <p style={{ fontSize: 11, color: 'var(--color-muted)' }}>
                {c.race.name} · {classSummary(c.classes)}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Main page ────────────────────────────────────────────────────────────── */

export function DashboardPage() {
  const { characters, loaded, load, activeId, mutate, setActive } = useCharacterStore();
  const [editMode, setEditMode] = useState(false);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [configuringId, setConfiguringId] = useState<string | null>(null);

  useEffect(() => { if (!loaded) load(); }, [loaded, load]);

  const character = characters.find(c => c.id === activeId) ?? null;

  useEffect(() => {
    if (!character || character.dashboard.widgets.length > 0) return;
    const defaults = buildDefaultWidgets(character);
    mutate(character.id, c => ({ ...c, dashboard: { widgets: defaults } }));
  }, [character?.id, character?.dashboard.widgets.length]);

  if (!loaded) return <div style={{ padding: 20, color: 'var(--color-muted)', fontSize: 13 }}>Loading…</div>;
  if (!character) return <NoDashboard />;

  const widgets = character.dashboard.widgets;

  const handleReorder = (updated: WidgetInstance[]) => {
    mutate(character.id, c => ({ ...c, dashboard: { widgets: updated } }));
  };
  const handleRemove = (id: string) => {
    mutate(character.id, c => ({
      ...c, dashboard: { widgets: c.dashboard.widgets.filter(w => w.id !== id) },
    }));
  };
  const handleSaveConfig = (widgetId: string, config: unknown) => {
    mutate(character.id, c => ({
      ...c, dashboard: {
        widgets: c.dashboard.widgets.map(w => w.id === widgetId ? { ...w, config } : w),
      },
    }));
  };
  const handleAdd = (instance: WidgetInstance) => {
    mutate(character.id, c => ({
      ...c, dashboard: { widgets: [...c.dashboard.widgets, instance] },
    }));
  };

  return (
    <>
      {/* Toolbar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'var(--color-app)',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 12px',
      }}>
        {/* Character chip — tap to switch */}
        <button
          onClick={() => setActive(null)}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', gap: 7, minWidth: 0,
            background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
          }}
        >
          <div style={{
            width: 26, height: 26, borderRadius: 7, flexShrink: 0,
            background: 'linear-gradient(135deg,#b87333,#6b3a1f)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: 12, color: '#fff',
          }}>
            {character.name[0]?.toUpperCase()}
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {character.name}
          </span>
          <span className="msym" style={{ fontSize: 17, color: 'var(--color-disabled)', flexShrink: 0 }}>swap_horiz</span>
        </button>
        <button
          onClick={() => setShowAddSheet(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '7px 13px', borderRadius: 11,
            background: 'var(--color-raised)', border: '1px solid var(--color-border)',
            color: 'var(--color-text-2)', fontSize: 12.5, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          <span className="msym" style={{ fontSize: 16 }}>add</span>
          Widget
        </button>
        <button
          onClick={() => setEditMode(e => !e)}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '7px 13px', borderRadius: 11,
            background: editMode ? '#b87333' : 'var(--color-raised)',
            border: `1px solid ${editMode ? '#b87333' : 'var(--color-border)'}`,
            color: editMode ? '#1a1206' : 'var(--color-text-2)',
            fontSize: 12.5, fontWeight: editMode ? 800 : 600,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          <span className="msym" style={{ fontSize: 16 }}>{editMode ? 'check' : 'tune'}</span>
          {editMode ? 'Done' : 'Edit'}
        </button>
      </div>

      {/* Edit mode banner */}
      {editMode && (
        <div style={{
          background: 'rgba(184,115,51,.12)',
          borderBottom: '1px solid rgba(184,115,51,.25)',
          padding: '8px 14px',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span className="msym" style={{ fontSize: 18, color: '#d08c4a' }}>drag_indicator</span>
          <span style={{ fontSize: 12, color: '#d08c4a', fontWeight: 600 }}>
            Drag widgets to reorder · tap ⋮ to remove
          </span>
        </div>
      )}

      {widgets.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '48px 20px', textAlign: 'center' }}>
          <span className="msym" style={{ fontSize: 44, color: 'var(--color-disabled)' }}>widgets</span>
          <p style={{ color: 'var(--color-muted)', fontSize: 13 }}>No widgets yet.</p>
          <button onClick={() => setShowAddSheet(true)} style={{ color: '#d08c4a', fontSize: 13, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
            Add your first widget
          </button>
        </div>
      ) : (
        <DashboardEngine
          instances={widgets}
          character={character}
          editMode={editMode}
          onReorder={handleReorder}
          onRemove={handleRemove}
          onConfigure={setConfiguringId}
        />
      )}

      {showAddSheet && (
        <AddWidgetSheet
          character={character}
          existingWidgets={widgets}
          onAdd={handleAdd}
          onClose={() => setShowAddSheet(false)}
        />
      )}

      {configuringId && (() => {
        const inst = widgets.find(w => w.id === configuringId);
        return inst ? (
          <WidgetConfigSheet
            instance={inst}
            character={character}
            onSave={handleSaveConfig}
            onClose={() => setConfiguringId(null)}
          />
        ) : null;
      })()}
    </>
  );
}
