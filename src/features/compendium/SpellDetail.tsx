import type { Entry } from '@/domain/reference/types';
import { renderEntries } from '@/rendering';

const SCHOOL_NAMES: Record<string, string> = {
  A: 'Abjuration',
  C: 'Conjuration',
  D: 'Divination',
  E: 'Enchantment',
  V: 'Evocation',
  I: 'Illusion',
  N: 'Necromancy',
  T: 'Transmutation',
};

const LEVEL_ORDINALS = ['Cantrip', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th'];

interface CastTime { number: number; unit: string }
interface Distance { type: string; amount?: number }
interface SpellRange { type: string; distance?: Distance }
interface Components { v?: boolean; s?: boolean; m?: string | { text?: string } }
interface Duration { type: string; duration?: { type: string; amount?: number }; concentration?: boolean }

function formatTime(time: CastTime[]): string {
  if (time.length === 0) return '—';
  const { number: n, unit } = time[0];
  return `${n} ${unit}${n > 1 && !unit.endsWith('s') ? 's' : ''}`;
}

function formatRange(range: SpellRange): string {
  if (!range.distance) return range.type;
  const { type, amount } = range.distance;
  if (type === 'touch') return 'Touch';
  if (type === 'sight') return 'Sight';
  if (type === 'self') return 'Self';
  return `${amount ?? '?'} ${type}`;
}

function formatComponents(c: Components): string {
  const parts: string[] = [];
  if (c.v) parts.push('V');
  if (c.s) parts.push('S');
  if (c.m) {
    const mat = typeof c.m === 'string' ? c.m : (c.m.text ?? '');
    parts.push(`M (${mat})`);
  }
  return parts.join(', ');
}

function formatDuration(duration: Duration[]): string {
  if (duration.length === 0) return '—';
  const d = duration[0];
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

// Hardcoded Fireball for Phase 1 demo — Phase 2 replaces this with ingest + search
const FIREBALL = {
  name: 'Fireball',
  source: 'PHB',
  level: 3,
  school: 'V',
  time: [{ number: 1, unit: 'action' }] as CastTime[],
  range: { type: 'point', distance: { type: 'feet', amount: 150 } } as SpellRange,
  components: { v: true, s: true, m: 'a tiny ball of bat guano and sulfur' } as Components,
  duration: [{ type: 'instant' }] as Duration[],
  entries: [
    "A bright streak flashes from your pointing finger to a point you choose within range and then blossoms with a low roar into an explosion of flame. Each creature in a 20-foot-radius sphere centered on that point must make a Dexterity saving throw. A target takes {@damage 8d6} fire damage on a failed save, or half as much damage on a successful one.",
    "The fire spreads around corners. It ignites flammable objects in the area that aren’t being worn or carried.",
  ] as Entry[],
  entriesHigherLevel: [
    {
      type: 'entries' as const,
      name: 'At Higher Levels',
      entries: [
        "When you cast this spell using a spell slot of 4th level or higher, the damage increases by {@scaledamage 8d6|3-9|1d6} for each slot level above 3rd.",
      ] as Entry[],
    },
  ] as Entry[],
};

interface MetaRowProps {
  label: string;
  value: string;
}

function MetaRow({ label, value }: MetaRowProps) {
  return (
    <div className="flex gap-3 text-sm">
      <span className="text-slate-400 w-28 shrink-0">{label}</span>
      <span>{value}</span>
    </div>
  );
}

export function SpellDetail() {
  const spell = FIREBALL;
  const levelLabel = spell.level === 0 ? 'Cantrip' : `${LEVEL_ORDINALS[spell.level] ?? spell.level}-level`;
  const school = SCHOOL_NAMES[spell.school] ?? spell.school;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 max-w-xl mx-auto">
      <header className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight">{spell.name}</h1>
        <p className="text-slate-400 text-sm mt-0.5">
          {levelLabel} {school} · {spell.source}
        </p>
      </header>

      <section className="space-y-1.5 border-y border-white/10 py-3 mb-4">
        <MetaRow label="Casting time" value={formatTime(spell.time)} />
        <MetaRow label="Range" value={formatRange(spell.range)} />
        <MetaRow label="Components" value={formatComponents(spell.components)} />
        <MetaRow label="Duration" value={formatDuration(spell.duration)} />
      </section>

      <section className="text-sm leading-relaxed space-y-1">
        {renderEntries(spell.entries)}
        <div className="mt-3 pt-3 border-t border-white/10">
          {renderEntries(spell.entriesHigherLevel)}
        </div>
      </section>
    </div>
  );
}
