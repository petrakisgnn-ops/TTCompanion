interface CombatBarProps {
  round: number;
  onNextTurn: () => void;
  onAddEnemy: () => void;
  onEndCombat: () => void;
}

export function CombatBar({ round, onNextTurn, onAddEnemy, onEndCombat }: CombatBarProps) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      background: 'var(--color-card)', border: '1px solid var(--color-border-accent)',
      borderRadius: 14, padding: '10px 12px',
    }}>
      <div>
        <p style={{ fontSize: 10, color: 'var(--color-faint)', textTransform: 'uppercase', letterSpacing: '.04em' }}>Round</p>
        <p style={{ fontSize: 18, fontWeight: 800, color: '#d08c4a', lineHeight: 1 }}>{round}</p>
      </div>
      <button onClick={onAddEnemy} style={{ ...btn, background: 'var(--color-raised)', color: 'var(--color-text-2)' }}>
        <span className="msym" style={{ fontSize: 16 }}>add</span> Enemy
      </button>
      <button onClick={onNextTurn} style={{ ...btn, flex: 1, background: '#b87333', color: '#1a1206', fontWeight: 800 }}>
        Next Turn <span className="msym" style={{ fontSize: 16 }}>arrow_forward</span>
      </button>
      <button onClick={onEndCombat} style={{ ...btn, background: 'none', color: '#e0556b', border: 'none', padding: '9px 6px' }}>
        End
      </button>
    </div>
  );
}

const btn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 5, padding: '9px 13px', borderRadius: 11,
  border: '1px solid var(--color-border)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
};
