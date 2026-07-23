import { useState } from 'react';
import { useSessionStore } from '../../stores/sessionStore';
import { useModeStore } from '../../stores/modeStore';
import { useCharacterStore } from '../../stores/characterStore';
import { snapshotOf } from '../../domain/session/snapshot';

export function SessionPage() {
  const { mode } = useModeStore();
  const { lobby, role, myUid, busy, error, createLobby, joinLobby, leave, close } = useSessionStore();
  const { characters, activeId } = useCharacterStore();
  const activeCharacter = characters.find(c => c.id === activeId) ?? characters[0];

  const [dmName, setDmName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [playerName, setPlayerName] = useState('');

  // ── In a lobby ──────────────────────────────────────────────────────────────
  if (lobby && role) {
    return (
      <div style={{ padding: '16px 14px 90px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <Header />
        <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 18, textAlign: 'center' }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--color-muted)' }}>Lobby Code</p>
          <p style={{ fontSize: 40, fontWeight: 800, letterSpacing: '.12em', color: 'var(--color-gold-lt)', fontFamily: "'Spline Sans Mono', monospace", margin: '6px 0 2px' }}>{lobby.code}</p>
          <p style={{ fontSize: 12, color: 'var(--color-faint)' }}>
            {role === 'dm' ? 'Share this code with your players' : `In ${lobby.dmName}'s lobby`}
          </p>
        </div>

        <div>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--color-muted)', paddingLeft: 2, marginBottom: 8 }}>
            Players ({lobby.players.length})
          </p>
          {lobby.players.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--color-faint)', padding: '20px 0', textAlign: 'center' }}>
              Waiting for players to join…
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {lobby.players.map(p => (
                <div key={p.uid} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '11px 13px' }}>
                  <div style={{ width: 38, height: 38, borderRadius: 11, flexShrink: 0, background: 'linear-gradient(135deg,var(--color-gold),var(--color-gold-hover))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'var(--color-gold-on)' }}>
                    {(p.character?.name ?? p.name)[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>
                      {p.character?.name ?? p.name}
                      {p.uid === myUid && <span style={{ fontSize: 11, color: 'var(--color-faint)', marginLeft: 6 }}>(you)</span>}
                    </p>
                    {p.character && (
                      <p style={{ fontSize: 11.5, color: 'var(--color-muted)', marginTop: 1 }}>
                        {p.character.race} · {p.character.classes} · AC {p.character.ac} · {p.character.hp.current}/{p.character.hp.max} HP
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={() => (role === 'dm' ? close() : leave())}
          style={{ marginTop: 4, padding: '12px', borderRadius: 12, border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-bad)', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
        >
          {role === 'dm' ? 'Close Lobby' : 'Leave Lobby'}
        </button>
      </div>
    );
  }

  // ── Idle: create (DM) or join (player) ────────────────────────────────────────
  return (
    <div style={{ padding: '16px 14px 90px', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <Header />

      {mode === 'dm' ? (
        <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-2)' }}>Create a lobby</p>
          <p style={{ fontSize: 12.5, color: 'var(--color-faint)', lineHeight: 1.4 }}>
            Start a session and share the 5-digit code. Players who join appear here and on your home.
          </p>
          <input
            value={dmName}
            onChange={e => setDmName(e.target.value)}
            placeholder="Your name (optional)"
            style={inputStyle}
          />
          <button onClick={() => createLobby(dmName)} disabled={busy} style={primaryBtn(busy)}>
            {busy ? 'Creating…' : 'Create Lobby'}
          </button>
        </div>
      ) : (
        <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-2)' }}>Join a lobby</p>
          <input
            value={joinCode}
            onChange={e => setJoinCode(e.target.value.replace(/\D/g, '').slice(0, 5))}
            inputMode="numeric"
            placeholder="5-digit code"
            style={{ ...inputStyle, fontSize: 22, letterSpacing: '.2em', textAlign: 'center', fontFamily: "'Spline Sans Mono', monospace" }}
          />
          <input
            value={playerName}
            onChange={e => setPlayerName(e.target.value)}
            placeholder={activeCharacter ? `Name (default: ${activeCharacter.name})` : 'Your name'}
            style={inputStyle}
          />
          {activeCharacter && (
            <p style={{ fontSize: 11.5, color: 'var(--color-faint)' }}>
              Bringing <span style={{ color: 'var(--color-gold-lt)' }}>{activeCharacter.name}</span> — the DM will see your race, class, AC and HP.
            </p>
          )}
          <button
            onClick={() => joinLobby(joinCode, playerName || activeCharacter?.name || '', activeCharacter ? snapshotOf(activeCharacter) : undefined)}
            disabled={busy || joinCode.length !== 5}
            style={primaryBtn(busy || joinCode.length !== 5)}
          >
            {busy ? 'Joining…' : 'Join Lobby'}
          </button>
        </div>
      )}

      {error && <p style={{ fontSize: 12.5, color: 'var(--color-bad)', textAlign: 'center' }}>{error}</p>}

      <p style={{ fontSize: 11.5, color: 'var(--color-faint)', textAlign: 'center', lineHeight: 1.5 }}>
        {mode === 'dm'
          ? 'Switch to Player mode (top bar) to join someone else’s lobby instead.'
          : 'Switch to DM mode (top bar) to host your own lobby.'}
      </p>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'var(--color-card-inner)', border: '1px solid var(--color-border)',
  borderRadius: 10, padding: '11px 12px', color: 'var(--color-text)', fontSize: 15, outline: 'none', fontFamily: 'inherit',
};

const primaryBtn = (disabled: boolean): React.CSSProperties => ({
  padding: '12px', borderRadius: 12, border: 'none',
  background: 'var(--color-gold)', color: 'var(--color-gold-on)', fontWeight: 800, fontSize: 15,
  cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1,
});

function Header() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span className="msym" style={{ fontSize: 26, color: 'var(--color-gold-lt)' }}>groups</span>
      <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-.01em' }}>Session</span>
    </div>
  );
}
