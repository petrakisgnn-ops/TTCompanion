import { useState, useRef, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  rectSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { getWidget } from '../../widgets/registry';
import type { WidgetInstance } from '../../domain/widgets/types';
import type { Character } from '../../domain/character/types';

/* ── Widget context menu ─────────────────────────────────────────────────── */

interface MenuProps {
  onConfigure?: () => void;
  onRemove: () => void;
  onClose: () => void;
}

function WidgetMenu({ onConfigure, onRemove, onClose }: MenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      style={{
        position: 'absolute', top: 36, right: 8, zIndex: 40,
        background: 'var(--color-raised)',
        border: '1px solid rgba(255,255,255,.1)',
        borderRadius: 12, overflow: 'hidden',
        minWidth: 140,
        boxShadow: '0 8px 24px rgba(0,0,0,.5)',
        animation: 'popIn .12s ease',
      }}
    >
      {onConfigure && (
        <button onClick={() => { onConfigure(); onClose(); }} style={menuItem}>
          <span className="msym" style={{ fontSize: 17, color: '#d08c4a' }}>settings</span>
          Configure
        </button>
      )}
      <button onClick={() => { onRemove(); onClose(); }} style={{ ...menuItem, color: '#e0556b' }}>
        <span className="msym" style={{ fontSize: 17, color: '#e0556b' }}>delete</span>
        Remove
      </button>
    </div>
  );
}

const menuItem: React.CSSProperties = {
  width: '100%', display: 'flex', alignItems: 'center', gap: 9,
  padding: '11px 14px', background: 'none', border: 'none',
  cursor: 'pointer', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 600,
  color: 'var(--color-text-2)', textAlign: 'left',
};

/* ── Single sortable widget card ─────────────────────────────────────────── */

interface SortableWidgetProps {
  instance: WidgetInstance;
  character: Character;
  editMode: boolean;
  onRemove: (id: string) => void;
  onConfigure: (id: string) => void;
}

function SortableWidget({ instance, character, editMode, onRemove, onConfigure }: SortableWidgetProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: instance.id });

  const reg = getWidget(instance.type);
  if (!reg) return null;

  const WidgetComponent = reg.component;
  const icon = reg.icon ?? 'widgets';
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.45 : 1,
        gridColumn: instance.span === 2 ? 'span 2' : 'span 1',
        position: 'relative',
      }}
    >
      {/* Card */}
      <div style={{
        background: 'var(--color-card)',
        border: '1px solid var(--color-border)',
        borderRadius: 18,
        overflow: 'hidden',
      }}>
        {/* Header row */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 9,
          padding: editMode ? '10px 10px 10px 13px' : '11px 12px 0 13px',
        }}>
          {editMode && (
            <button
              {...attributes}
              {...listeners}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--color-disabled)', width: 28, height: 28, borderRadius: 7,
                background: 'none', border: 'none', cursor: 'grab', touchAction: 'none',
              }}
              aria-label="Drag to reorder"
            >
              <span className="msym" style={{ fontSize: 20 }}>drag_indicator</span>
            </button>
          )}

          {/* Icon + title */}
          <span className="msym" style={{ fontSize: 18, color: '#b87333', flexShrink: 0 }}>{icon}</span>
          <span style={{
            flex: 1, fontSize: 10.5, fontWeight: 800, letterSpacing: '.07em',
            textTransform: 'uppercase', color: 'var(--color-muted)',
          }}>
            {reg.label}
          </span>

          {/* Menu button */}
          <button
            onClick={() => setMenuOpen(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--color-disabled)', width: 28, height: 28, borderRadius: 7,
              background: 'none', border: 'none', cursor: 'pointer',
            }}
            aria-label="Widget options"
          >
            <span className="msym" style={{ fontSize: 20 }}>more_vert</span>
          </button>
        </div>

        {/* Widget body */}
        <WidgetComponent instance={instance} character={character} />
      </div>

      {/* Context menu */}
      {menuOpen && (
        <WidgetMenu
          onConfigure={reg.hasConfig ? () => onConfigure(instance.id) : undefined}
          onRemove={() => onRemove(instance.id)}
          onClose={() => setMenuOpen(false)}
        />
      )}
    </div>
  );
}

/* ── Engine ──────────────────────────────────────────────────────────────── */

interface DashboardEngineProps {
  instances: WidgetInstance[];
  character: Character;
  editMode: boolean;
  onReorder: (instances: WidgetInstance[]) => void;
  onRemove: (id: string) => void;
  onConfigure: (id: string) => void;
}

export function DashboardEngine({
  instances,
  character,
  editMode,
  onReorder,
  onRemove,
  onConfigure,
}: DashboardEngineProps) {
  const sorted = [...instances].sort((a, b) => a.order - b.order);

  const sensors = useSensors(
    useSensor(MouseSensor),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = sorted.findIndex(w => w.id === active.id);
    const newIdx = sorted.findIndex(w => w.id === over.id);
    const reordered = arrayMove(sorted, oldIdx, newIdx).map(
      (w, i): WidgetInstance => ({ ...w, order: i }),
    );
    onReorder(reordered);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={sorted.map(w => w.id)} strategy={rectSortingStrategy}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 11,
          padding: 14,
        }}>
          {sorted.map(instance => (
            <SortableWidget
              key={instance.id}
              instance={instance}
              character={character}
              editMode={editMode}
              onRemove={onRemove}
              onConfigure={onConfigure}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
