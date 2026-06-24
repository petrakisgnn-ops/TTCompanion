import { NavLink } from 'react-router-dom';

const TABS = [
  { to: '/spells',   label: 'Spells'   },
  { to: '/bestiary', label: 'Bestiary' },
  { to: '/items',    label: 'Items'    },
];

export function CompendiumTabs() {
  return (
    <div className="flex border-b border-white/10">
      {TABS.map(({ to, label }) => (
        <NavLink
          key={to}
          to={to}
          end
          className={({ isActive }) =>
            `flex-1 py-2.5 text-sm font-medium text-center transition-colors ${
              isActive
                ? 'text-amber-400 border-b-2 border-amber-500'
                : 'text-slate-500 hover:text-slate-300'
            }`
          }
        >
          {label}
        </NavLink>
      ))}
    </div>
  );
}
