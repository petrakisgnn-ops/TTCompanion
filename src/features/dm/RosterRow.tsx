import type { CombatantView } from '../../domain/dm/combatant';

const DISPOSITION_COLOR: Record<string, string> = {
  friendly: '#5ec27a', neutral: '#8a93a0', hostile: '#e0556b',
};

function hpColor(current: number, max: number): string {
  if (max <= 0) return 'var(--color-muted)';
  const pct = current / max;
  return pct > 0.5 ? '#5ec27a' : pct > 0.25 ? '#e0c34a' : '#e0556b';
}

interface RosterRowProps {
  view: CombatantView;
  combatMode: boolean;
  isCurrentTurn?: boolean;
  onHpDelta?: (delta: number) => void;
  onSetInitiative?: (value: number) => void;
  onToggleCondition?: (name: string) => void;
  onAddCondition?: () => void;
  onTap?: () => void;
  dragHandle?: React.ReactNode;
}

export function RosterRow({
  view, combatMode, isCurrentTurn, onHpDelta, onSetInitiative, onToggleCondition, onAddCondition, onTap, dragHandle,
}: RosterRowProps) {
  const pct = view.hp.max > 0 ? Math.max(0, Math.min(100, (view.hp.current / view.hp.max) * 100)) : 0;
  const color = hpColor(view.hp.current, view.hp.max);

  return (
    <div style={{
      background: 'var(--color-card)',
      border: isCurrentTurn ? '1px solid #b87333' : '1px solid var(--color-border)',
      boxShadow: isCurrentTurn ? '0 0 0 1px rgba(184,115,51,.4)' : 'none',
      borderRadius: 14, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        {dragHandle}

        {combatMode && (
          onSetInitiative ? (
            <input
              type="number"
              value={view.initiative ?? ''}
              onChange={e => onSetInitiative(Number(e.target.value) || 0)}
              style={{ width: 34, background: 'var(--color-card-inner)', border: '1px solid var(--color-border)', borderRadius: 8, textAlign: 'center', fontSize: 13, fontWeight: 700, color: 'var(--color-text)', padding: '4px 0', outline: 'none', fontFamily: 'inherit' }}
            />
          ) : (
            <span style={{ width: 34, textAlign: 'center', fontSize: 13, fontWeight: 700, color: 'var(--color-text-2)' }}>
              {view.initiative ?? '—'}
            </span>
          )
        )}

        {view.disposition && (
          <span style={{ width: 8, height: 8, borderRadius: 999, background: DISPOSITION_COLOR[view.disposition], flexShrink: 0 }} />
        )}

        <button
          onClick={onTap}
          disabled={!onTap}
          style={{ flex: 1, minWidth: 0, textAlign: 'left', background: 'none', border: 'none', cursor: onTap ? 'pointer' : 'default', fontFamily: 'inherit', padding: 0 }}
        >
          <p style={{ fontSize: 13.5, fontWeight: 700, color: isCurrentTurn ? '#d08c4a' : 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {view.name}
          </p>
          {view.subtitle && <p style={{ fontSize: 11, color: 'var(--color-faint)' }}>{view.subtitle}</p>}
        </button>

        {!combatMode && view.kind === 'pc' && view.passivePerception !== null && (
          <div style={{ textAlign: 'center', flexShrink: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-2)' }}>{view.passivePerception}</p>
            <p style={{ fontSize: 9, color: 'var(--color-faint)' }}>PP</p>
          </div>
        )}

        <div style={{ textAlign: 'center', flexShrink: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-2)' }}>{view.ac}</p>
          <p style={{ fontSize: 9, color: 'var(--color-faint)' }}>AC</p>
        </div>

        {view.editable && onHpDelta ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            <button onClick={() => onHpDelta(-1)} style={hpBtn}>−</button>
            <span style={{ fontSize: 13, fontWeight: 700, width: 44, textAlign: 'center', color: 'var(--color-text)' }}>
              {view.hp.current}/{view.hp.max}
            </span>
            <button onClick={() => onHpDelta(1)} style={hpBtn}>+</button>
          </div>
        ) : (
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', flexShrink: 0 }}>
            {view.hp.current}<span style={{ color: 'var(--color-faint)', fontWeight: 500 }}>/{view.hp.max}</span>
          </span>
        )}
      </div>

      <div style={{ height: 4, background: 'var(--color-card-inner)', borderRadius: 999, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 999 }} />
      </div>

      {(view.conditions.length > 0 || (combatMode && onAddCondition)) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {view.conditions.map(c => (
            <button
              key={c}
              disabled={!onToggleCondition}
              onClick={() => onToggleCondition?.(c)}
              style={{ fontSize: 10.5, padding: '2px 8px', borderRadius: 999, background: 'rgba(167,139,250,.15)', color: '#a78bfa', border: 'none', cursor: onToggleCondition ? 'pointer' : 'default', fontFamily: 'inherit' }}
            >
              {c}{onToggleCondition ? ' ✕' : ''}
            </button>
          ))}
          {combatMode && onAddCondition && (
            <button onClick={onAddCondition} style={{ fontSize: 10.5, padding: '2px 8px', borderRadius: 999, background: 'var(--color-raised)', color: 'var(--color-muted)', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
              + Condition
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const hpBtn: React.CSSProperties = {
  width: 22, height: 22, borderRadius: 6, background: 'var(--color-raised)', border: 'none',
  color: 'var(--color-text-2)', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', lineHeight: 1,
};
