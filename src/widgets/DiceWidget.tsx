import { useState } from 'react';
import { registerWidget } from './registry';
import type { WidgetProps } from './registry';

const DICE = [4, 6, 8, 10, 12, 20] as const;

function DiceWidget({ }: WidgetProps) {
  const [die, setDie] = useState(20);
  const [result, setResult] = useState<number | null>(null);

  const roll = () => setResult(Math.ceil(Math.random() * die));

  return (
    <div style={{ padding: '10px 13px 14px', display: 'flex', flexDirection: 'column', gap: 11 }}>
      {/* Die selector */}
      <div style={{ display: 'flex', gap: 6 }}>
        {DICE.map(d => (
          <button
            key={d}
            onClick={() => { setDie(d); setResult(null); }}
            style={{
              flex: 1, padding: '7px 0', borderRadius: 9,
              background: die === d ? 'rgba(184,115,51,.25)' : 'var(--color-border)',
              border: `1px solid ${die === d ? 'rgba(184,115,51,.5)' : 'var(--color-border)'}`,
              color: die === d ? '#d08c4a' : 'var(--color-muted)',
              fontFamily: "'Spline Sans Mono', monospace",
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}
          >
            d{d}
          </button>
        ))}
      </div>

      {/* Roll row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
        <button
          onClick={roll}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            background: '#b87333', color: '#1a1206', fontWeight: 800, fontSize: 14,
            padding: '11px 0', borderRadius: 12, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          <span className="msym" style={{ fontSize: 18 }}>casino</span>
          Roll d{die}
        </button>
        {result !== null && (
          <div style={{
            minWidth: 52, height: 46, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            background: 'var(--color-card-inner)', borderRadius: 12, border: '1px solid var(--color-border)',
          }}>
            <span style={{ fontFamily: "'Spline Sans Mono', monospace", fontSize: 22, fontWeight: 700, color: '#d08c4a', lineHeight: 1 }}>{result}</span>
          </div>
        )}
      </div>
    </div>
  );
}

registerWidget({
  typeId: 'dice',
  label: 'Dice Roller',
  icon: 'casino',
  defaultConfig: {},
  defaultSpan: 2,
  component: DiceWidget,
});
