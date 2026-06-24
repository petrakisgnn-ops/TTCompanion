import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useCharacterStore } from '../stores/characterStore';
import { useModeStore } from '../stores/modeStore';
import { useSettingsStore } from '../stores/settingsStore';
import { BottomNav } from './BottomNav';
import { totalLevel } from '../domain/rules';

function CharacterHeader() {
  const { characters, activeId } = useCharacterStore();
  const { mode, set } = useModeStore();
  const character = characters.find(c => c.id === activeId) ?? null;

  const initial  = character?.name?.[0]?.toUpperCase() ?? '?';
  const name     = character?.name ?? 'D&D Companion';
  const subtitle = character
    ? `${character.race.name} · ${character.classes.map(cl => `${cl.classRef.name} ${cl.level}`).join('/')} · Lv ${totalLevel(character.classes)}`
    : 'No active character';

  return (
    <header style={{ background: 'var(--color-app)', borderBottom: '1px solid var(--color-border)' }}
      className="flex-none flex items-center gap-3 px-4 py-2.5">

      {/* Avatar */}
      <div style={{
        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
        background: 'linear-gradient(135deg,#b87333,#6b3a1f)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 800, fontSize: 15, color: '#fff',
      }}>
        {initial}
      </div>

      {/* Name + subtitle */}
      <div className="flex-1 min-w-0">
        <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-text)', lineHeight: 1.15, letterSpacing: '-.01em' }}
          className="truncate">{name}</p>
        <p style={{ fontSize: 11, color: 'var(--color-muted)', fontWeight: 500, marginTop: 1 }}
          className="truncate">{subtitle}</p>
      </div>

      {/* Player / DM toggle */}
      <div style={{
        display: 'flex', background: 'var(--color-card)',
        border: '1px solid var(--color-border)', borderRadius: 11, padding: 3,
        flexShrink: 0,
      }}>
        {(['player', 'dm'] as const).map(m => (
          <button
            key={m}
            onClick={() => set(m)}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '5px 11px', borderRadius: 8,
              fontSize: 12, fontWeight: 700, transition: 'all .15s',
              background: mode === m ? '#b87333' : 'transparent',
              color: mode === m ? '#1a1206' : 'var(--color-muted)',
            }}
          >
            <span className="msym" style={{ fontSize: 14 }}>
              {m === 'player' ? 'person' : 'shield_person'}
            </span>
            {m === 'player' ? 'Player' : 'DM'}
          </button>
        ))}
      </div>
    </header>
  );
}

export function AppShell() {
  const { theme } = useSettingsStore();

  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light');
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  return (
    <div style={{ height: '100%', background: 'var(--color-deep)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <CharacterHeader />

      <main className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-none">
        <Outlet />
      </main>

      <BottomNav />
    </div>
  );
}
