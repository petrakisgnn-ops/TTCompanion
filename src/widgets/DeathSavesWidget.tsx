import { registerWidget } from './registry';
import type { WidgetProps } from './registry';
import { useCharacterStore } from '../stores/characterStore';

function Pip({ filled, type }: { filled: boolean; type: 'success' | 'failure' }) {
  const color = type === 'success' ? '#5ec27a' : '#e0556b';
  return (
    <div style={{
      width: 26, height: 26, borderRadius: '50%',
      border: `2px solid ${filled ? color : 'rgba(255,255,255,.15)'}`,
      background: filled ? color : 'transparent',
      flexShrink: 0, cursor: 'pointer',
      transition: 'all .12s',
    }} />
  );
}

function DeathSavesWidget({ instance, character }: WidgetProps) {
  const { mutate } = useCharacterStore();
  const saves = character.deathSaves ?? { successes: 0, failures: 0 };

  const toggle = (type: 'successes' | 'failures', idx: number) => {
    const current = saves[type];
    const next = current > idx ? idx : idx + 1;
    mutate(character.id, c => ({
      ...c,
      deathSaves: { ...saves, [type]: Math.min(3, Math.max(0, next)) },
    }));
  };

  const reset = () => {
    mutate(character.id, c => ({ ...c, deathSaves: { successes: 0, failures: 0 } }));
  };

  return (
    <div style={{ padding: '10px 14px 14px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Successes */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#5ec27a', width: 60, flexShrink: 0 }}>Success</span>
          <div style={{ display: 'flex', gap: 7 }}>
            {[0, 1, 2].map(i => (
              <button key={i} onClick={() => toggle('successes', i)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
                <Pip filled={i < saves.successes} type="success" />
              </button>
            ))}
          </div>
        </div>

        {/* Failures */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#e0556b', width: 60, flexShrink: 0 }}>Failure</span>
          <div style={{ display: 'flex', gap: 7 }}>
            {[0, 1, 2].map(i => (
              <button key={i} onClick={() => toggle('failures', i)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
                <Pip filled={i < saves.failures} type="failure" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Status line */}
      <div style={{ marginTop: 10, display: 'flex', alignItems: 'center' }}>
        {saves.successes >= 3 && (
          <span style={{ fontSize: 12, fontWeight: 700, color: '#5ec27a' }}>Stabilized!</span>
        )}
        {saves.failures >= 3 && (
          <span style={{ fontSize: 12, fontWeight: 700, color: '#e0556b' }}>Dead!</span>
        )}
        {(saves.successes > 0 || saves.failures > 0) && saves.successes < 3 && saves.failures < 3 && (
          <button onClick={reset} style={{ fontSize: 11.5, color: 'var(--color-muted)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
            Reset
          </button>
        )}
      </div>
    </div>
  );
}

registerWidget({
  typeId: 'death-saves',
  label: 'Death Saves',
  icon: 'heart_broken',
  defaultConfig: {},
  defaultSpan: 2,
  component: DeathSavesWidget,
});
