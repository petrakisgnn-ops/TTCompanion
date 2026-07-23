import { useNavigate } from 'react-router-dom';
import { useSessionStore } from '../../stores/sessionStore';

/**
 * Compact lobby summary for the DM home. Renders only when this device is hosting a lobby, so
 * joined players surface right where the DM runs the session. Tap to open the full Session screen.
 */
export function DmLobbyBanner() {
  const navigate = useNavigate();
  const { lobby, role } = useSessionStore();
  if (!lobby || role !== 'dm') return null;

  return (
    <button
      onClick={() => navigate('/session')}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left',
        background: 'var(--color-card)', border: '1px solid var(--color-border-accent)',
        borderRadius: 13, padding: '10px 12px', cursor: 'pointer', fontFamily: 'inherit',
      }}
    >
      <span className="msym" style={{ fontSize: 22, color: 'var(--color-gold-lt)' }}>groups</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>
          Lobby <span style={{ fontFamily: "'Spline Sans Mono', monospace", letterSpacing: '.1em', color: 'var(--color-gold-lt)' }}>{lobby.code}</span>
        </p>
        <p style={{ fontSize: 11.5, color: 'var(--color-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {lobby.players.length === 0
            ? 'Waiting for players…'
            : lobby.players.map(p => p.character?.name ?? p.name).join(', ')}
        </p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, color: 'var(--color-muted)' }}>
        <span className="msym" style={{ fontSize: 16 }}>person</span>
        <span style={{ fontSize: 13, fontWeight: 700 }}>{lobby.players.length}</span>
      </div>
    </button>
  );
}
