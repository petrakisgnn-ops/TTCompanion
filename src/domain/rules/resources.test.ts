import { describe, expect, it } from 'vitest';
import { recomputeAllResources } from './resources';
import { computeSpellSlots } from './spellSlots';
import type { AbilityScores } from '../character/types';

const SCORES: AbilityScores = { str: 10, dex: 10, con: 10, int: 10, wis: 14, cha: 14 };

const slotsOf = (tracks: { id: string; max: number }[]) =>
  Object.fromEntries(tracks.filter(t => t.id.startsWith('slot-')).map(t => [t.id, t.max]));

describe('computeSpellSlots (1/3 casters)', () => {
  it('matches the PHB Eldritch Knight table', () => {
    expect(computeSpellSlots('1/3', 2)).toEqual([]);
    expect(computeSpellSlots('1/3', 3).map(t => t.max)).toEqual([2]);
    expect(computeSpellSlots('1/3', 7).map(t => t.max)).toEqual([4, 2]);
    expect(computeSpellSlots('1/3', 19).map(t => t.max)).toEqual([4, 3, 3, 1]);
  });
});

describe('subclass resource pools', () => {
  const trackById = (tracks: { id: string; max: number; label: string }[], id: string) =>
    tracks.find(t => t.id === id);

  it('grants a Battle Master superiority dice, scaling count and die size', () => {
    const at = (level: number) => trackById(
      recomputeAllResources([{ classRef: { name: 'Fighter', source: 'PHB' }, level, subclass: { name: 'Battle Master', source: 'PHB' } }], [], SCORES),
      'superiority-dice',
    );
    expect(at(3)).toMatchObject({ max: 4, label: 'Superiority Dice (d8)' });
    expect(at(7)).toMatchObject({ max: 5, label: 'Superiority Dice (d8)' });
    expect(at(10)).toMatchObject({ max: 5, label: 'Superiority Dice (d10)' });
    expect(at(18)).toMatchObject({ max: 6, label: 'Superiority Dice (d12)' });
  });

  it('gives a plain Champion no superiority dice', () => {
    const tracks = recomputeAllResources(
      [{ classRef: { name: 'Fighter', source: 'PHB' }, level: 5, subclass: { name: 'Champion', source: 'PHB' } }], [], SCORES,
    );
    expect(trackById(tracks, 'superiority-dice')).toBeUndefined();
  });
});

describe('recomputeAllResources slot routing', () => {
  it('uses the class OWN table for a single-class half-caster (regression: Paladin 5 = 4×1st + 2×2nd)', () => {
    const tracks = recomputeAllResources(
      [{ classRef: { name: 'Paladin', source: 'PHB' }, level: 5 }], [], SCORES,
    );
    expect(slotsOf(tracks)).toEqual({ 'slot-1': 4, 'slot-2': 2 });
  });

  it('uses the subclass third-caster table for a single-class Eldritch Knight', () => {
    const tracks = recomputeAllResources(
      [{ classRef: { name: 'Fighter', source: 'PHB' }, level: 3, subclass: { name: 'Eldritch Knight', source: 'PHB' } }],
      [], SCORES,
    );
    expect(slotsOf(tracks)).toEqual({ 'slot-1': 2 });
  });

  it('gives a subclass-less Fighter no slots', () => {
    const tracks = recomputeAllResources(
      [{ classRef: { name: 'Fighter', source: 'PHB' }, level: 3 }], [], SCORES,
    );
    expect(slotsOf(tracks)).toEqual({});
  });

  it('pools 2+ caster classes via the PHB multiclass table (Paladin 2 / Cleric 3 → caster level 4)', () => {
    const tracks = recomputeAllResources(
      [
        { classRef: { name: 'Paladin', source: 'PHB' }, level: 2 },
        { classRef: { name: 'Cleric', source: 'PHB' }, level: 3 },
      ],
      [], SCORES,
    );
    // floor(2/2) + 3 = 4 → full-caster row 4: 4×1st, 3×2nd
    expect(slotsOf(tracks)).toEqual({ 'slot-1': 4, 'slot-2': 3 });
  });

  it('counts an Eldritch Knight as floor(level/3) in a multiclass pool', () => {
    const tracks = recomputeAllResources(
      [
        { classRef: { name: 'Fighter', source: 'PHB' }, level: 6, subclass: { name: 'Eldritch Knight', source: 'PHB' } },
        { classRef: { name: 'Wizard', source: 'PHB' }, level: 2 },
      ],
      [], SCORES,
    );
    // floor(6/3) + 2 = 4 → full-caster row 4
    expect(slotsOf(tracks)).toEqual({ 'slot-1': 4, 'slot-2': 3 });
  });
});
