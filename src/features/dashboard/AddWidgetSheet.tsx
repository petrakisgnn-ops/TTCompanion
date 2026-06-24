import { getAllWidgets } from '../../widgets/registry';
import type { Character } from '../../domain/character/types';
import type { WidgetInstance } from '../../domain/widgets/types';
import type { ResourceTrackerConfig } from '../../widgets/ResourceTrackerWidget';

interface AddWidgetSheetProps {
  character: Character;
  existingWidgets: WidgetInstance[];
  onAdd: (instance: WidgetInstance) => void;
  onClose: () => void;
}

export function AddWidgetSheet({
  character,
  existingWidgets,
  onAdd,
  onClose,
}: AddWidgetSheetProps) {
  // resource-tracker can appear multiple times (one per resource), others are singletons
  const existingTypes = new Set(existingWidgets.map(w => w.type));
  const allWidgets = getAllWidgets().filter(
    reg => reg.typeId === 'resource-tracker' || !existingTypes.has(reg.typeId),
  );

  const makeInstance = (typeId: string): WidgetInstance | null => {
    const reg = allWidgets.find(w => w.typeId === typeId);
    if (!reg) return null;

    let config = reg.defaultConfig;

    if (typeId === 'resource-tracker') {
      const usedIds = existingWidgets
        .filter(w => w.type === 'resource-tracker')
        .map(w => (w.config as ResourceTrackerConfig).resourceId);
      const available = character.resources.find(r => !usedIds.includes(r.id));
      if (!available) return null;
      config = { resourceId: available.id } satisfies ResourceTrackerConfig;
    }

    return {
      id: crypto.randomUUID(),
      type: typeId,
      config,
      span: reg.defaultSpan,
      order: existingWidgets.length,
    };
  };

  const availableResourceCount = character.resources.filter(r => {
    const used = existingWidgets
      .filter(w => w.type === 'resource-tracker')
      .map(w => (w.config as ResourceTrackerConfig).resourceId);
    return !used.includes(r.id);
  }).length;

  return (
    <>
      {/* Backdrop */}
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', zIndex: 30 }}
        onClick={onClose}
      />

      {/* Sheet */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40,
        background: 'var(--color-card)',
        border: '1px solid var(--color-border)',
        borderBottom: 'none',
        borderRadius: '20px 20px 0 0',
        maxHeight: '75vh',
        display: 'flex', flexDirection: 'column',
        animation: 'sheetUp .22s ease',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '14px 16px', borderBottom: '1px solid var(--color-border)',
          flexShrink: 0,
        }}>
          <span className="msym" style={{ fontSize: 22, color: '#d08c4a' }}>add_box</span>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--color-text)', flex: 1 }}>Add Widget</h2>
          <button
            onClick={onClose}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 32, height: 32, borderRadius: 10,
              background: 'var(--color-raised)', border: '1px solid var(--color-border)',
              color: 'var(--color-muted)', cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            <span className="msym" style={{ fontSize: 18 }}>close</span>
          </button>
        </div>

        {/* Widget list */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '8px 0 32px' }}>
          {allWidgets.map(reg => {
            const isResourceTracker = reg.typeId === 'resource-tracker';
            const disabled = isResourceTracker && availableResourceCount === 0;
            const icon = reg.icon ?? 'widgets';

            return (
              <button
                key={reg.typeId}
                disabled={disabled}
                onClick={() => {
                  const instance = makeInstance(reg.typeId);
                  if (instance) { onAdd(instance); onClose(); }
                }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 13,
                  padding: '12px 16px', textAlign: 'left',
                  background: 'none', border: 'none',
                  borderBottom: '1px solid var(--color-border)',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  opacity: disabled ? 0.4 : 1,
                  fontFamily: 'inherit',
                }}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: 11, flexShrink: 0,
                  background: 'rgba(184,115,51,.12)',
                  border: '1px solid rgba(184,115,51,.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span className="msym" style={{ fontSize: 20, color: '#d08c4a' }}>{icon}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-2)' }}>{reg.label}</p>
                  {isResourceTracker && (
                    <p style={{ fontSize: 11, color: 'var(--color-faint)', marginTop: 2 }}>
                      {disabled
                        ? 'All resources already on dashboard'
                        : `${availableResourceCount} resource${availableResourceCount !== 1 ? 's' : ''} available`}
                    </p>
                  )}
                </div>
                <span className="msym" style={{ fontSize: 22, color: 'var(--color-disabled)' }}>add_circle</span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
