import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../../data/db';
import type { StoredSpell } from '../../data/db';
import { renderEntries } from '../../rendering';

const SCHOOL_NAMES: Record<string, string> = {
  A: 'Abjuration', C: 'Conjuration', D: 'Divination', E: 'Enchantment',
  V: 'Evocation',  I: 'Illusion',   N: 'Necromancy', T: 'Transmutation',
};
const LEVEL_ORDINALS = ['Cantrip', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th'];

function formatTime(time: unknown[]): string {
  if (!time || time.length === 0) return '—';
  const t = time[0] as { number?: number; unit?: string; condition?: string };
  const n = t.number ?? 1;
  const unit = t.unit ?? '';
  const base = `${n} ${unit}${n > 1 && !unit.endsWith('s') ? 's' : ''}`;
  return t.condition ? `${base} (${t.condition})` : base;
}

function formatRange(range: unknown): string {
  const r = range as { type: string; distance?: { type: string; amount?: number } };
  if (!r) return '—';
  if (r.type === 'special') return 'Special';
  if (!r.distance) return r.type;
  const { type, amount } = r.distance;
  if (type === 'touch') return 'Touch';
  if (type === 'sight') return 'Sight';
  if (type === 'self') return 'Self';
  return `${amount ?? '?'} ${type}`;
}

function formatComponents(components: unknown): string {
  const c = components as { v?: boolean; s?: boolean; m?: string | { text?: string } };
  if (!c) return '—';
  const parts: string[] = [];
  if (c.v) parts.push('V');
  if (c.s) parts.push('S');
  if (c.m) {
    const mat = typeof c.m === 'string' ? c.m : (c.m.text ?? '');
    parts.push(`M (${mat})`);
  }
  return parts.join(', ') || '—';
}

function formatDuration(duration: unknown[]): string {
  if (!duration || duration.length === 0) return '—';
  const d = duration[0] as {
    type: string;
    duration?: { type: string; amount?: number };
    concentration?: boolean;
  };
  const conc = d.concentration ? 'Concentration, up to ' : '';
  if (d.type === 'instant') return 'Instantaneous';
  if (d.type === 'permanent') return 'Until dispelled';
  if (d.type === 'special') return 'Special';
  if (d.duration) {
    const { type, amount } = d.duration;
    return `${conc}${amount ?? '?'} ${type}${(amount ?? 1) > 1 ? 's' : ''}`;
  }
  return d.type;
}

interface MetaRowProps { label: string; value: string }
function MetaRow({ label, value }: MetaRowProps) {
  return (
    <div className="flex gap-3 text-sm">
      <span className="text-slate-400 w-28 shrink-0">{label}</span>
      <span>{value}</span>
    </div>
  );
}

export function SpellDetailPage() {
  const { key } = useParams<{ key: string }>();
  const navigate = useNavigate();
  const [spell, setSpell] = useState<StoredSpell | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!key) return;
    db.spells.get(decodeURIComponent(key)).then(s => {
      if (s) setSpell(s);
      else setNotFound(true);
    });
  }, [key]);

  if (notFound) {
    return (
      <div className="p-4 text-slate-400 text-sm">
        Spell not found.{' '}
        <button onClick={() => navigate(-1)} className="text-amber-400 underline">Go back</button>
      </div>
    );
  }

  if (!spell) {
    return <div className="p-4 text-slate-400 text-sm animate-pulse">Loading…</div>;
  }

  const levelLabel =
    spell.level === 0 ? 'Cantrip' : `${LEVEL_ORDINALS[spell.level] ?? spell.level}-level`;
  const school = SCHOOL_NAMES[spell.school] ?? spell.school;

  return (
    <div className="p-4 max-w-xl mx-auto">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="text-slate-400 text-sm mb-3 flex items-center gap-1 hover:text-slate-200"
      >
        ← Spells
      </button>

      {/* Header */}
      <h1 className="text-2xl font-bold tracking-tight">{spell.name}</h1>
      <p className="text-slate-400 text-sm mt-0.5">
        {levelLabel} {school} · {spell.source}
      </p>

      {/* Meta */}
      <section className="space-y-1.5 border-y border-white/10 py-3 my-4">
        <MetaRow label="Casting time" value={formatTime(spell.time as unknown[])} />
        <MetaRow label="Range"        value={formatRange(spell.range)} />
        <MetaRow label="Components"   value={formatComponents(spell.components)} />
        <MetaRow label="Duration"     value={formatDuration(spell.duration as unknown[])} />
      </section>

      {/* Description */}
      <section className="text-sm leading-relaxed space-y-1">
        {renderEntries(spell.entries)}
        {spell.entriesHigherLevel && spell.entriesHigherLevel.length > 0 && (
          <div className="mt-3 pt-3 border-t border-white/10">
            {renderEntries(spell.entriesHigherLevel)}
          </div>
        )}
      </section>
    </div>
  );
}
