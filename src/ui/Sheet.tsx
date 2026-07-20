import type { ReactNode } from 'react';

interface SheetProps {
  icon: string;
  title: string;
  onClose: () => void;
  children: ReactNode;
  maxHeight?: string;
}

/** Shared bottom-sheet chrome (backdrop + slide-up panel + header) used across DM mode. */
export function Sheet({ icon, title, onClose, children, maxHeight = '85vh' }: SheetProps) {
  return (
    <>
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', zIndex: 30 }}
        onClick={onClose}
      />
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40,
        background: 'var(--color-card)',
        border: '1px solid var(--color-border)',
        borderBottom: 'none',
        borderRadius: '20px 20px 0 0',
        maxHeight,
        display: 'flex', flexDirection: 'column',
        animation: 'sheetUp .22s ease',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '14px 16px', borderBottom: '1px solid var(--color-border)',
          flexShrink: 0,
        }}>
          <span className="msym" style={{ fontSize: 22, color: '#d08c4a' }}>{icon}</span>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--color-text)', flex: 1 }}>{title}</h2>
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
        <div style={{ overflowY: 'auto', flex: 1, padding: '12px 16px 32px' }}>
          {children}
        </div>
      </div>
    </>
  );
}
