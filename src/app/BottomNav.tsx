import { useLocation, useNavigate } from 'react-router-dom';

interface NavTab {
  label: string;
  icon: string;
  path: string;
  /** Extra paths that should make this tab appear active */
  matchPaths?: string[];
}

const TABS: NavTab[] = [
  { label: 'Home',       icon: 'home',          path: '/dashboard' },
  { label: 'Party',      icon: 'groups',        path: '/characters', matchPaths: ['/characters'] },
  { label: 'Compendium', icon: 'auto_stories',  path: '/compendium', matchPaths: ['/compendium', '/spells', '/bestiary', '/items'] },
  { label: 'Tools',      icon: 'casino',        path: '/tools' },
  { label: 'Settings',   icon: 'settings',      path: '/settings' },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (tab: NavTab) => {
    const paths = [tab.path, ...(tab.matchPaths ?? [])];
    return paths.some(p => location.pathname === p || location.pathname.startsWith(p + '/'));
  };

  return (
    <nav style={{
      flexShrink: 0,
      display: 'flex',
      background: 'var(--color-nav)',
      borderTop: '1px solid var(--color-border)',
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    }}>
      {TABS.map(tab => {
        const active = isActive(tab);
        return (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              padding: '7px 0 9px',
              color: active ? '#d08c4a' : 'var(--color-faint)',
              transition: 'color .15s',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            <span className="msym" style={{ fontSize: 22 }}>{tab.icon}</span>
            <span style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: '.02em' }}>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
