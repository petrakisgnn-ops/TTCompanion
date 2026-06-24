import { useState } from 'react';
import { registerWidget } from './registry';
import type { WidgetProps } from './registry';

interface ActionState { action: boolean; bonus: boolean; reaction: boolean; }

const DEFAULT: ActionState = { action: false, bonus: false, reaction: false };

function ActionEconomyWidget({ }: WidgetProps) {
  const [used, setUsed] = useState<ActionState>(DEFAULT);

  const toggle = (key: keyof ActionState) =>
    setUsed(s => ({ ...s, [key]: !s[key] }));

  const allUsed = used.action && used.bonus && used.reaction;

  const actions: { key: keyof ActionState; label: string; icon: string }[] = [
    { key: 'action',   label: 'Action',       icon: 'play_arrow'   },
    { key: 'bonus',    label: 'Bonus',        icon: 'add_circle'   },
    { key: 'reaction', label: 'Reaction',     icon: 'reply'        },
  ];

  return (
    <div style={{ padding: '10px 13px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        {actions.map(({ key, label, icon }) => {
          const spent = used[key];
          return (
            <button
              key={key}
              onClick={() => toggle(key)}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                padding: '11px 6px',
                borderRadius: 13,
                background: spent ? 'var(--color-border)' : 'rgba(184,115,51,.15)',
                border: `1px solid ${spent ? 'var(--color-border)' : 'rgba(184,115,51,.35)'}`,
                cursor: 'pointer', fontFamily: 'inherit',
                transition: 'all .15s',
                opacity: spent ? 0.5 : 1,
              }}
            >
              <span className="msym" style={{ fontSize: 22, color: spent ? 'var(--color-faint)' : '#d08c4a' }}>{icon}</span>
              <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.03em', color: spent ? 'var(--color-faint)' : 'var(--color-text-2)' }}>
                {label}
              </span>
              {spent && (
                <span style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--color-faint)', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                  Used
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Reset button */}
      {(used.action || used.bonus || used.reaction) && (
        <button
          onClick={() => setUsed(DEFAULT)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '8px', borderRadius: 11,
            background: allUsed ? 'rgba(184,115,51,.12)' : 'transparent',
            border: `1px solid ${allUsed ? 'rgba(184,115,51,.25)' : 'var(--color-border)'}`,
            color: 'var(--color-muted)', fontSize: 12, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          <span className="msym" style={{ fontSize: 15 }}>refresh</span>
          New Turn
        </button>
      )}
    </div>
  );
}

registerWidget({
  typeId: 'action-economy',
  label: 'Action Economy',
  icon: 'timer',
  defaultConfig: {},
  defaultSpan: 2,
  component: ActionEconomyWidget,
});
