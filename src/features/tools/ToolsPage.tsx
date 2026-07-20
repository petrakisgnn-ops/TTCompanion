import { useEffect, useRef, useState } from 'react';
import { useModeStore } from '../../stores/modeStore';
import { generateName } from '../../domain/dm/nameGenerator';

/* ── Dice Roller ─────────────────────────────────────────────────────────── */

const DICE = [4, 6, 8, 10, 12, 20, 100] as const;

interface RollEntry { expr: string; total: number; rolls: number[]; }

function DiceRoller() {
  const [die, setDie] = useState(20);
  const [count, setCount] = useState(1);
  const [mod, setMod] = useState(0);
  const [log, setLog] = useState<RollEntry[]>([]);

  const roll = () => {
    const rolls = Array.from({ length: count }, () => Math.ceil(Math.random() * die));
    const total = rolls.reduce((s, n) => s + n, 0) + mod;
    const expr = `${count}d${die}${mod !== 0 ? (mod > 0 ? `+${mod}` : mod) : ''}`;
    setLog(prev => [{ expr, total, rolls }, ...prev.slice(0, 19)]);
  };

  return (
    <div style={{ padding: '16px 14px 90px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 2 }}>
        <span className="msym" style={{ fontSize: 26, color: '#d08c4a' }}>casino</span>
        <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-.01em' }}>Dice Roller</span>
      </div>

      {/* Die picker + count + mod */}
      <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 18, padding: 18, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Die buttons */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {DICE.map(d => (
            <button
              key={d}
              onClick={() => setDie(d)}
              style={{
                flex: '1 1 42px',
                padding: '10px 0',
                borderRadius: 10,
                background: die === d ? '#b87333' : 'var(--color-card-inner)',
                border: `1px solid ${die === d ? '#b87333' : 'var(--color-border)'}`,
                color: die === d ? '#1a1206' : 'var(--color-text-2)',
                fontFamily: "'Spline Sans Mono', monospace",
                fontSize: 13, fontWeight: 600,
              }}
            >
              d{d}
            </button>
          ))}
        </div>

        {/* Count + mod */}
        <div style={{ display: 'flex', gap: 11 }}>
          {[
            { label: 'Count', value: count, min: 1, max: 20, set: setCount },
            { label: 'Modifier', value: mod, min: -10, max: 20, set: setMod },
          ].map(({ label, value, min, max, set }) => (
            <div key={label} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7, alignItems: 'center' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '.04em' }}>{label}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                <button onClick={() => set(v => Math.max(min, v - 1))} style={adjBtn}>
                  <span className="msym" style={{ fontSize: 18 }}>remove</span>
                </button>
                <span style={{ fontFamily: "'Spline Sans Mono', monospace", fontSize: 20, fontWeight: 600, color: 'var(--color-text)', width: 36, textAlign: 'center' }}>
                  {label === 'Modifier' && value > 0 ? `+${value}` : value}
                </span>
                <button onClick={() => set(v => Math.min(max, v + 1))} style={adjBtn}>
                  <span className="msym" style={{ fontSize: 18 }}>add</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Roll button */}
        <button
          onClick={roll}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
            background: '#b87333', color: '#1a1206', fontWeight: 800,
            fontSize: 16, padding: 15, borderRadius: 14, border: 'none', cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          <span className="msym" style={{ fontSize: 22 }}>casino</span>
          Roll {count}d{die}{mod !== 0 ? (mod > 0 ? `+${mod}` : mod) : ''}
        </button>
      </div>

      {/* Roll log */}
      {log.length > 0 && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: -6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--color-muted)' }}>Roll Log</span>
            <button onClick={() => setLog([])} style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--color-muted)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Clear</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {log.map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '11px 14px' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontFamily: "'Spline Sans Mono', monospace", fontSize: 13, fontWeight: 600, color: 'var(--color-text-2)' }}>{r.expr}</span>
                  {r.rolls.length > 1 && (
                    <span style={{ fontSize: 11, color: 'var(--color-faint)', fontFamily: "'Spline Sans Mono', monospace" }}>[{r.rolls.join(', ')}]</span>
                  )}
                </div>
                <span style={{ fontFamily: "'Spline Sans Mono', monospace", fontSize: 26, fontWeight: 600, color: '#d08c4a' }}>{r.total}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <Timer />
    </div>
  );
}

const adjBtn: React.CSSProperties = {
  width: 32, height: 32, borderRadius: 9, background: 'var(--color-raised)',
  color: '#e0b888', display: 'flex', alignItems: 'center', justifyContent: 'center',
  border: 'none', cursor: 'pointer',
};

/* ── Timer ───────────────────────────────────────────────────────────────── */

function fmt(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

function Timer() {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running]);

  const reset = () => { setRunning(false); setElapsed(0); };

  return (
    <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 18, padding: '20px 18px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, alignSelf: 'flex-start' }}>
        <span className="msym" style={{ fontSize: 22, color: '#d08c4a' }}>timer</span>
        <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text)', letterSpacing: '-.01em' }}>Timer</span>
      </div>

      {/* Clock face */}
      <span style={{
        fontFamily: "'Spline Sans Mono', monospace",
        fontSize: 56, fontWeight: 600, letterSpacing: '-.02em',
        color: running ? '#d08c4a' : 'var(--color-text)',
        lineHeight: 1, transition: 'color .3s',
      }}>
        {fmt(elapsed)}
      </span>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 10, width: '100%' }}>
        <button
          onClick={() => setRunning(r => !r)}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '13px 0', borderRadius: 13, border: 'none', cursor: 'pointer',
            fontFamily: 'inherit', fontSize: 15, fontWeight: 700,
            background: running ? 'rgba(224,85,107,.15)' : '#b87333',
            color: running ? '#e0556b' : '#1a1206',
            transition: 'background .15s, color .15s',
          }}
        >
          <span className="msym" style={{ fontSize: 20 }}>{running ? 'pause' : 'play_arrow'}</span>
          {running ? 'Pause' : elapsed > 0 ? 'Resume' : 'Start'}
        </button>

        {elapsed > 0 && (
          <button
            onClick={reset}
            style={{
              width: 52, display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 13, border: '1px solid var(--color-border)',
              background: 'var(--color-card-inner)', cursor: 'pointer',
              color: 'var(--color-muted)',
            }}
          >
            <span className="msym" style={{ fontSize: 20 }}>restart_alt</span>
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Name Generator (standalone) ────────────────────────────────────────────
 * Same generateName() the NPC quick-create form uses inline — one
 * implementation, two entry points. ── */

function NameGeneratorTool() {
  const [race, setRace] = useState('Human');
  const [name, setName] = useState(() => generateName('Human'));
  const [history, setHistory] = useState<string[]>([]);

  const roll = (r: string = race) => {
    const next = generateName(r);
    setName(next);
    setHistory(h => [next, ...h.slice(0, 19)]);
  };

  return (
    <div style={{ padding: '16px 14px 90px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 2 }}>
        <span className="msym" style={{ fontSize: 26, color: '#d08c4a' }}>badge</span>
        <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-.01em' }}>Name Generator</span>
      </div>

      <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 18, padding: 18, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {['Human', 'Elf', 'Dwarf', 'Halfling', 'Gnome', 'Half-Orc', 'Tiefling', 'Dragonborn', 'Goblin', 'Orc'].map(r => (
            <button
              key={r}
              onClick={() => { setRace(r); roll(r); }}
              style={{
                padding: '7px 13px', borderRadius: 999, fontSize: 12.5, fontWeight: 600,
                background: race === r ? '#b87333' : 'var(--color-card-inner)',
                border: `1px solid ${race === r ? '#b87333' : 'var(--color-border)'}`,
                color: race === r ? '#1a1206' : 'var(--color-text-2)',
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              {r}
            </button>
          ))}
        </div>

        <div style={{ textAlign: 'center', padding: '10px 0' }}>
          <span style={{ fontSize: 30, fontWeight: 800, color: '#d08c4a', letterSpacing: '-.01em' }}>{name}</span>
        </div>

        <button
          onClick={() => roll()}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
            background: '#b87333', color: '#1a1206', fontWeight: 800,
            fontSize: 16, padding: 15, borderRadius: 14, border: 'none', cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          <span className="msym" style={{ fontSize: 22 }}>casino</span>
          Generate
        </button>
      </div>

      {history.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {history.map((n, i) => (
            <span key={i} style={{ fontSize: 12.5, padding: '5px 11px', borderRadius: 999, background: 'var(--color-card)', border: '1px solid var(--color-border)', color: 'var(--color-text-3)' }}>
              {n}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── DM Tools ────────────────────────────────────────────────────────────── */

type DmTab = 'names' | 'timer';

function DmTools() {
  const [tab, setTab] = useState<DmTab>('names');

  const dmTabs: { key: DmTab; label: string; icon: string }[] = [
    { key: 'names', label: 'Name Generator', icon: 'badge' },
    { key: 'timer', label: 'Timer',          icon: 'timer' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Tab bar */}
      <div style={{ flexShrink: 0, padding: '14px 14px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 13 }}>
          <span className="msym" style={{ fontSize: 26, color: '#d08c4a' }}>shield_person</span>
          <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-.01em' }}>DM Tools</span>
        </div>
        <div style={{ display: 'flex', gap: 4, background: 'var(--color-card-inner)', border: '1px solid var(--color-border)', borderRadius: 13, padding: 4 }}>
          {dmTabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                padding: '8px 0', borderRadius: 10, fontSize: 12.5, fontWeight: 700,
                background: tab === t.key ? '#b87333' : 'transparent',
                color: tab === t.key ? '#1a1206' : 'var(--color-muted)',
                border: 'none', cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s',
              }}
            >
              <span className="msym" style={{ fontSize: 16 }}>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {tab === 'names' && <NameGeneratorTool />}
        {tab === 'timer' && <div style={{ padding: '14px 14px 90px' }}><Timer /></div>}
      </div>
    </div>
  );
}

/* ── Root ─────────────────────────────────────────────────────────────────── */

export function ToolsPage() {
  const { mode } = useModeStore();
  return mode === 'dm' ? <DmTools /> : <DiceRoller />;
}
