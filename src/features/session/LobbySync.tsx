import { useEffect, useRef } from 'react';
import { useCharacterStore } from '../../stores/characterStore';
import { useSessionStore } from '../../stores/sessionStore';
import { snapshotOf } from '../../domain/session/snapshot';

/**
 * Renders nothing. While this device is a joined player, it mirrors the active character's snapshot
 * into the lobby whenever it changes (HP, AC, level…), so the DM's roster updates live. The
 * `mutate` store replaces the character object immutably on every change, so watching its reference
 * is enough to catch HP loss. A ref guards against re-sending an identical snapshot.
 */
export function LobbySync() {
  const role = useSessionStore(s => s.role);
  const code = useSessionStore(s => s.code);
  const syncCharacter = useSessionStore(s => s.syncCharacter);
  const characters = useCharacterStore(s => s.characters);
  const activeId = useCharacterStore(s => s.activeId);
  const active = characters.find(c => c.id === activeId) ?? characters[0];

  const lastSent = useRef('');

  // Forget the last-sent snapshot when the session ends, so re-joining always re-sends.
  useEffect(() => { if (!code) lastSent.current = ''; }, [code]);

  useEffect(() => {
    if (role !== 'player' || !code || !active) return;
    const snap = snapshotOf(active);
    const key = JSON.stringify(snap);
    if (key === lastSent.current) return;
    lastSent.current = key;
    void syncCharacter(snap);
  }, [role, code, active, syncCharacter]);

  return null;
}
