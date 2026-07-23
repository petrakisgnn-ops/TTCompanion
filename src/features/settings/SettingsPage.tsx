import { useSettingsStore } from '../../stores/settingsStore';
import type { Edition, Theme } from '../../stores/settingsStore';
import { THEMES } from '../../app/themes';

export function SettingsPage() {
  const { edition, setEdition, theme, setTheme } = useSettingsStore();

  return (
    <div style={{ padding: '16px 14px 90px', display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className="msym" style={{ fontSize: 26, color: '#d08c4a' }}>settings</span>
        <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-.01em' }}>Settings</span>
      </div>

      {/* Appearance */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--color-muted)', paddingLeft: 2 }}>
          Appearance
        </span>
        <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 14, padding: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <span className="msym" style={{ fontSize: 20, color: '#d08c4a' }}>contrast</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-2)', flex: 1 }}>Theme</span>
          </div>
          <ThemePicker value={theme} onChange={setTheme} />
        </div>
      </div>

      {/* Rules Edition */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--color-muted)', paddingLeft: 2 }}>
          Rules Edition
        </span>
        <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 14, padding: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
            <span className="msym" style={{ fontSize: 20, color: '#d08c4a', marginTop: 1 }}>menu_book</span>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-2)', display: 'block', marginBottom: 3 }}>
                D&amp;D Edition
              </span>
              <span style={{ fontSize: 12, color: 'var(--color-faint)', lineHeight: 1.4 }}>
                Controls which version of revised content is shown in the compendium. Content exclusive to one edition (e.g. XGE spells) is always shown.
              </span>
            </div>
          </div>
          <EditionPicker value={edition} onChange={setEdition} />
        </div>
      </div>

      {/* About */}
      <SettingSection title="About" rows={[
        { icon: 'info', label: 'Version', value: '1.0.0' },
      ]} />

      <div style={{ textAlign: 'center', paddingTop: 10, color: 'var(--color-disabled)', fontSize: 11, fontFamily: "'Spline Sans Mono', monospace" }}>
        D&D Companion · v1.0.0
      </div>
    </div>
  );
}

// ── Edition picker ────────────────────────────────────────────────────────────

interface EditionOption { value: Edition; label: string; sub: string }
const OPTIONS: EditionOption[] = [
  { value: '5e',   label: 'D&D 5e',   sub: '2014 Player\'s Handbook' },
  { value: '5.5e', label: 'D&D 5.5e', sub: '2024 Player\'s Handbook' },
];

function EditionPicker({ value, onChange }: { value: Edition; onChange: (e: Edition) => void }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
      {OPTIONS.map(opt => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            style={{
              padding: '10px 12px', borderRadius: 10, textAlign: 'left',
              border: active ? '1.5px solid #d08c4a' : '1.5px solid var(--color-border)',
              background: active ? 'rgba(176,115,51,.12)' : 'rgba(255,255,255,.03)',
              cursor: 'pointer', transition: 'border-color .15s, background .15s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
              {active && <span className="msym" style={{ fontSize: 15, color: '#d08c4a' }}>check_circle</span>}
              <span style={{ fontSize: 13, fontWeight: 700, color: active ? '#d08c4a' : 'var(--color-text-2)' }}>
                {opt.label}
              </span>
            </div>
            <span style={{ fontSize: 11, color: 'var(--color-faint)' }}>{opt.sub}</span>
          </button>
        );
      })}
    </div>
  );
}

// ── Theme picker ─────────────────────────────────────────────────────────────

function ThemePicker({ value, onChange }: { value: Theme; onChange: (t: Theme) => void }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
      {THEMES.map(t => {
        const active = value === t.id;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 11px', borderRadius: 10,
              border: active ? '1.5px solid var(--color-gold-lt)' : '1.5px solid var(--color-border)',
              background: active ? 'var(--color-raised)' : 'transparent',
              cursor: 'pointer', transition: 'border-color .15s, background .15s',
            }}
          >
            {/* Color swatch: background · surface · accent */}
            <span style={{ display: 'flex', borderRadius: 6, overflow: 'hidden', border: '1px solid var(--color-border)', flexShrink: 0 }}>
              {t.swatch.map((c, i) => (
                <span key={i} style={{ width: 11, height: 22, background: c }} />
              ))}
            </span>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: active ? 'var(--color-gold-lt)' : 'var(--color-text-2)', flex: 1, textAlign: 'left' }}>
              {t.label}
            </span>
            {active && <span className="msym" style={{ fontSize: 15, color: 'var(--color-gold-lt)' }}>check_circle</span>}
          </button>
        );
      })}
    </div>
  );
}

// ── Generic static section ────────────────────────────────────────────────────

interface SettingRow { icon: string; label: string; value?: string }

function SettingSection({ title, rows }: { title: string; rows: SettingRow[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
      <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--color-muted)', paddingLeft: 2 }}>
        {title}
      </span>
      <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 14, overflow: 'hidden' }}>
        {rows.map((row, i) => (
          <div
            key={row.label}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '13px 14px',
              borderBottom: i < rows.length - 1 ? '1px solid var(--color-border)' : 'none',
            }}
          >
            <span className="msym" style={{ fontSize: 20, color: '#d08c4a' }}>{row.icon}</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-2)', flex: 1 }}>{row.label}</span>
            {row.value && <span style={{ fontSize: 12.5, color: 'var(--color-muted)' }}>{row.value}</span>}
            <span className="msym" style={{ fontSize: 19, color: 'var(--color-disabled)' }}>chevron_right</span>
          </div>
        ))}
      </div>
    </div>
  );
}
