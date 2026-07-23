import { describe, expect, it } from 'vitest';
import { recomputeAllResources } from './resources';
import { rewardSnapshot, DEFAULT_ABILITY_SCORES } from './progression';
import { CLASSES } from './classData';
import type { ResourceTrack } from '../character/types';

/**
 * Layer C — the level-up INTEGRATION path. The store's `levelUp` reducer recomputes resources
 * with exactly `recomputeAllResources(classes, previousResources, abilityScores)`, carrying the
 * previous resources forward. Looping that 1→20 mirrors a character climbing levels and
 * exercises the top-up merge chain (which the per-component golden/reconcile tests don't).
 */

const ALL_CLASSES = CLASSES.map(c => c.name);
const sourceOf = (name: string) => CLASSES.find(c => c.name === name)!.source;

/** id → max for a resource track list. */
function maxes(tracks: ResourceTrack[]): Record<string, number> {
  const m: Record<string, number> = {};
  for (const t of tracks) m[t.id] = t.max;
  return m;
}

/** The maxes the snapshot says a class should have at a level, keyed the same way as tracks. */
function expectedMaxes(cls: string, level: number): Record<string, number> {
  const s = rewardSnapshot(cls, level);
  const m: Record<string, number> = {};
  s.spellSlots.forEach((v, i) => { m[`slot-${i + 1}`] = v; });
  if (s.pactSlots) m['pact'] = s.pactSlots.count;
  for (const [id, v] of Object.entries(s.resources)) m[id] = v;
  return m;
}

describe('level-up integration — climbing 1→20 lands on the right resources', () => {
  it.each(ALL_CLASSES)('%s', name => {
    const classRef = { name, source: sourceOf(name) };
    let resources: ResourceTrack[] = [];
    for (let level = 1; level <= 20; level++) {
      resources = recomputeAllResources([{ classRef, level }], resources, DEFAULT_ABILITY_SCORES);
      expect(maxes(resources), `${name} @${level}`).toEqual(expectedMaxes(name, level));
      // Never spent anything → every pool is full.
      for (const t of resources) expect(t.current, `${name} ${t.id} @${level}`).toBe(t.max);
    }
  });
});

describe('spent resources survive a level-up (only the newly-gained amount is added)', () => {
  const DEF = DEFAULT_ABILITY_SCORES;

  it('Barbarian rage: spent 2 of 3 at L5 → 2 of 4 at L6', () => {
    const cr = { name: 'Barbarian', source: 'PHB' };
    let r = recomputeAllResources([{ classRef: cr, level: 5 }], [], DEF);
    expect(r.find(t => t.id === 'rage')).toMatchObject({ max: 3, current: 3 });

    r = r.map(t => (t.id === 'rage' ? { ...t, current: 1 } : t)); // spend 2
    r = recomputeAllResources([{ classRef: cr, level: 6 }], r, DEF);
    expect(r.find(t => t.id === 'rage')).toMatchObject({ max: 4, current: 2 });
  });

  it('Wizard 3rd-level slot: spent 1 of 2 at L5 → 2 of 3 at L6', () => {
    const cr = { name: 'Wizard', source: 'PHB' };
    let r = recomputeAllResources([{ classRef: cr, level: 5 }], [], DEF);
    expect(r.find(t => t.id === 'slot-3')).toMatchObject({ max: 2, current: 2 });

    r = r.map(t => (t.id === 'slot-3' ? { ...t, current: 1 } : t)); // spend 1
    r = recomputeAllResources([{ classRef: cr, level: 6 }], r, DEF);
    expect(r.find(t => t.id === 'slot-3')).toMatchObject({ max: 3, current: 2 });
  });

  it('Barbarian rage pool disappears at level 20 (unlimited rages)', () => {
    const cr = { name: 'Barbarian', source: 'PHB' };
    let r = recomputeAllResources([{ classRef: cr, level: 19 }], [], DEF);
    expect(r.some(t => t.id === 'rage')).toBe(true);
    r = recomputeAllResources([{ classRef: cr, level: 20 }], r, DEF);
    expect(r.some(t => t.id === 'rage')).toBe(false);
  });
});
