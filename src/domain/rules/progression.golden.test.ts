import { describe, expect, it } from 'vitest';
import { rewardSnapshot, progression } from './progression';
import { CLASSES } from './classData';
import type { AbilityScores } from '../character/types';

const ALL_CLASSES = CLASSES.map(c => c.name);
const snap = (cls: string, level: number, scores?: AbilityScores) =>
  rewardSnapshot(cls, level, scores ? { abilityScores: scores } : undefined);

// ── Proficiency bonus (universal PHB bands) ───────────────────────────────────
describe('proficiency bonus', () => {
  const band = (level: number) =>
    level <= 4 ? 2 : level <= 8 ? 3 : level <= 12 ? 4 : level <= 16 ? 5 : 6;

  it('follows +2/+3/+4/+5/+6 bands for every class at every level', () => {
    for (const cls of ALL_CLASSES) {
      for (let l = 1; l <= 20; l++) {
        expect(snap(cls, l).proficiencyBonus).toBe(band(l));
      }
    }
  });
});

// ── Max HP anchors (CON mod 0) ────────────────────────────────────────────────
describe('max HP at CON mod 0', () => {
  // [class, hitDie, hpAt1, hpAt20]
  const cases: [string, number, number, number][] = [
    ['Barbarian', 12, 12, 145],
    ['Fighter', 10, 10, 124],
    ['Paladin', 10, 10, 124],
    ['Ranger', 10, 10, 124],
    ['Bard', 8, 8, 103],
    ['Cleric', 8, 8, 103],
    ['Monk', 8, 8, 103],
    ['Rogue', 8, 8, 103],
    ['Artificer', 8, 8, 103],
    ['Warlock', 8, 8, 103],
    ['Sorcerer', 6, 6, 82],
    ['Wizard', 6, 6, 82],
  ];

  it.each(cases)('%s (d%d): level 1 = %d, level 20 = %d', (cls, _hd, hp1, hp20) => {
    expect(snap(cls, 1).maxHpAtConMod0).toBe(hp1);
    expect(snap(cls, 20).maxHpAtConMod0).toBe(hp20);
  });
});

// ── ASI / feat levels ─────────────────────────────────────────────────────────
describe('ASI levels', () => {
  it('grants the default 5 ASIs (levels 4/8/12/16/19) for a standard class', () => {
    const s = progression('Wizard');
    expect(s.filter(x => x.asiThisLevel).map(x => x.level)).toEqual([4, 8, 12, 16, 19]);
    expect(snap('Wizard', 20).asiCountUpTo).toBe(5);
  });

  it('gives Fighter 7 ASIs (extra at 6 and 14)', () => {
    const s = progression('Fighter');
    expect(s.filter(x => x.asiThisLevel).map(x => x.level)).toEqual([4, 6, 8, 12, 14, 16, 19]);
    expect(snap('Fighter', 20).asiCountUpTo).toBe(7);
  });

  it('gives Rogue 6 ASIs (extra at 10)', () => {
    const s = progression('Rogue');
    expect(s.filter(x => x.asiThisLevel).map(x => x.level)).toEqual([4, 8, 10, 12, 16, 19]);
    expect(snap('Rogue', 20).asiCountUpTo).toBe(6);
  });
});

// ── Subclass timing ───────────────────────────────────────────────────────────
describe('subclass timing', () => {
  const firstLevelWithSubclass = (cls: string) =>
    progression(cls).find(s => s.picksSubclassBy)?.level;

  it.each([
    ['Cleric', 1], ['Sorcerer', 1], ['Warlock', 1],
    ['Wizard', 2], ['Druid', 2],
    ['Barbarian', 3], ['Bard', 3], ['Fighter', 3], ['Monk', 3],
    ['Paladin', 3], ['Ranger', 3], ['Rogue', 3], ['Artificer', 3],
  ])('%s picks its subclass by level %d', (cls, lvl) => {
    expect(firstLevelWithSubclass(cls)).toBe(lvl);
  });
});

// ── Full-caster spell slots ───────────────────────────────────────────────────
describe('full-caster spell slots', () => {
  it('Wizard slot anchors', () => {
    expect(snap('Wizard', 1).spellSlots).toEqual([2]);
    expect(snap('Wizard', 5).spellSlots).toEqual([4, 3, 2]);
    expect(snap('Wizard', 11).spellSlots).toEqual([4, 3, 3, 3, 2, 1]);
    expect(snap('Wizard', 17).spellSlots).toEqual([4, 3, 3, 3, 2, 1, 1, 1, 1]);
    expect(snap('Wizard', 20).spellSlots).toEqual([4, 3, 3, 3, 3, 2, 2, 1, 1]);
  });

  it('every full caster shares the same table', () => {
    for (const cls of ['Bard', 'Cleric', 'Druid', 'Sorcerer', 'Wizard']) {
      expect(snap(cls, 5).spellSlots).toEqual([4, 3, 2]);
      expect(snap(cls, 20).spellSlots).toEqual([4, 3, 3, 3, 3, 2, 2, 1, 1]);
    }
  });
});

// ── Half-caster spell slots (single-class own table) ──────────────────────────
describe('half-caster spell slots', () => {
  it.each(['Paladin', 'Ranger'])('%s has no slots at 1, [2] at 2, [4,2] at 5, [4,3,3,3,2] at 20', cls => {
    expect(snap(cls, 1).spellSlots).toEqual([]);
    expect(snap(cls, 2).spellSlots).toEqual([2]);
    expect(snap(cls, 5).spellSlots).toEqual([4, 2]);
    expect(snap(cls, 20).spellSlots).toEqual([4, 3, 3, 3, 2]);
  });

  it('Artificer rounds up: [2] at 1, [4,2] at 5, [4,3,3,3,2] at 20', () => {
    expect(snap('Artificer', 1).spellSlots).toEqual([2]);
    expect(snap('Artificer', 5).spellSlots).toEqual([4, 2]);
    expect(snap('Artificer', 20).spellSlots).toEqual([4, 3, 3, 3, 2]);
  });
});

// ── Warlock pact magic ────────────────────────────────────────────────────────
describe('warlock pact magic', () => {
  it.each([
    [1, 1, 1], [2, 2, 1], [3, 2, 2], [5, 2, 3], [9, 2, 5], [11, 3, 5], [17, 4, 5], [20, 4, 5],
  ])('level %d → %d slots at slot-level %d', (level, count, slotLevel) => {
    expect(snap('Warlock', level).pactSlots).toEqual({ count, level: slotLevel });
    expect(snap('Warlock', level).spellSlots).toEqual([]); // pact is tracked separately
  });
});

// ── Cantrips / spells known ───────────────────────────────────────────────────
describe('cantrips and spells known', () => {
  it('cantrip anchors', () => {
    expect(snap('Bard', 1).cantripsKnown).toBe(2);
    expect(snap('Cleric', 1).cantripsKnown).toBe(3);
    expect(snap('Sorcerer', 1).cantripsKnown).toBe(4);
    expect(snap('Wizard', 1).cantripsKnown).toBe(3);
    expect(snap('Warlock', 1).cantripsKnown).toBe(2);
  });

  it('non-cantrip classes report null', () => {
    for (const cls of ['Barbarian', 'Fighter', 'Monk', 'Paladin', 'Rogue']) {
      expect(snap(cls, 20).cantripsKnown).toBeNull();
    }
  });

  it('spells-known anchors', () => {
    expect(snap('Bard', 1).spellsKnown).toBe(4);
    expect(snap('Bard', 20).spellsKnown).toBe(22);
    expect(snap('Sorcerer', 1).spellsKnown).toBe(2);
    expect(snap('Warlock', 20).spellsKnown).toBe(15);
    expect(snap('Ranger', 1).spellsKnown).toBe(0);
    expect(snap('Ranger', 2).spellsKnown).toBe(2);
    expect(snap('Ranger', 20).spellsKnown).toBe(11);
  });

  it('prepared casters (Cleric/Druid/Wizard/Paladin) have no known table', () => {
    for (const cls of ['Cleric', 'Druid', 'Wizard', 'Paladin']) {
      expect(snap(cls, 10).spellsKnown).toBeNull();
    }
  });
});

// ── Class resource pools ──────────────────────────────────────────────────────
describe('class resources', () => {
  it('Barbarian rage: 2/3/4/5/6 then unlimited (untracked) at 20', () => {
    expect(snap('Barbarian', 1).resources).toEqual({ rage: 2 });
    expect(snap('Barbarian', 3).resources).toEqual({ rage: 3 });
    expect(snap('Barbarian', 6).resources).toEqual({ rage: 4 });
    expect(snap('Barbarian', 12).resources).toEqual({ rage: 5 });
    expect(snap('Barbarian', 17).resources).toEqual({ rage: 6 });
    expect(snap('Barbarian', 20).resources).toEqual({}); // Unlimited → nothing to track
  });

  it('Monk ki = level from 2', () => {
    expect(snap('Monk', 1).resources).toEqual({});
    expect(snap('Monk', 2).resources).toEqual({ ki: 2 });
    expect(snap('Monk', 20).resources).toEqual({ ki: 20 });
  });

  it('Sorcerer sorcery points = level from 2', () => {
    expect(snap('Sorcerer', 1).resources).toEqual({});
    expect(snap('Sorcerer', 2).resources).toEqual({ 'sorcery-points': 2 });
    expect(snap('Sorcerer', 20).resources).toEqual({ 'sorcery-points': 20 });
  });

  it('Cleric channel divinity: 1@2, 2@6, 3@18', () => {
    expect(snap('Cleric', 1).resources).toEqual({});
    expect(snap('Cleric', 2).resources).toEqual({ 'channel-divinity': 1 });
    expect(snap('Cleric', 6).resources).toEqual({ 'channel-divinity': 2 });
    expect(snap('Cleric', 18).resources).toEqual({ 'channel-divinity': 3 });
  });

  it('Druid wild shape: 2 from level 2', () => {
    expect(snap('Druid', 1).resources).toEqual({});
    expect(snap('Druid', 2).resources).toEqual({ 'wild-shape': 2 });
  });

  it('Fighter second wind / action surge / indomitable', () => {
    expect(snap('Fighter', 1).resources).toEqual({ 'second-wind': 1 });
    expect(snap('Fighter', 2).resources).toEqual({ 'second-wind': 1, 'action-surge': 1 });
    expect(snap('Fighter', 9).resources).toEqual({ 'second-wind': 1, 'action-surge': 1, indomitable: 1 });
    expect(snap('Fighter', 17).resources).toEqual({ 'second-wind': 1, 'action-surge': 2, indomitable: 3 });
  });

  it('Paladin lay on hands = level×5, channel divinity from 3', () => {
    expect(snap('Paladin', 1).resources).toEqual({ 'lay-on-hands': 5 });
    expect(snap('Paladin', 3).resources).toEqual({ 'lay-on-hands': 15, 'channel-divinity': 1 });
    expect(snap('Paladin', 20).resources).toEqual({ 'lay-on-hands': 100, 'channel-divinity': 1 });
  });

  it('Wizard arcane recovery is always 1', () => {
    expect(snap('Wizard', 1).resources).toEqual({ 'arcane-recovery': 1 });
    expect(snap('Wizard', 20).resources).toEqual({ 'arcane-recovery': 1 });
  });

  it('Bardic Inspiration scales with CHA modifier (min 1)', () => {
    const cha16: AbilityScores = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 16 };
    expect(snap('Bard', 1).resources).toEqual({ 'bardic-inspiration': 1 }); // default CHA 10 → min 1
    expect(snap('Bard', 1, cha16).resources).toEqual({ 'bardic-inspiration': 3 }); // +3
  });

  it('classes with no modeled non-spell pool report {}', () => {
    for (const cls of ['Ranger', 'Rogue', 'Artificer']) {
      expect(snap(cls, 20).resources).toEqual({});
    }
  });
});

// ── Monotonicity invariants (cheap typo/regression net across all classes) ─────
describe('monotonic progression invariants', () => {
  // Resources may legitimately DROP only here (a rule removes the pool):
  const ALLOWED_RESOURCE_DROPS: Record<string, Record<string, number[]>> = {
    Barbarian: { rage: [20] }, // Unlimited rages at 20 → pool removed
  };

  it.each(ALL_CLASSES)('%s never regresses prof / slots / known / resources', cls => {
    const s = progression(cls);
    for (let i = 1; i < s.length; i++) {
      const prev = s[i - 1];
      const cur = s[i];

      expect(cur.proficiencyBonus).toBeGreaterThanOrEqual(prev.proficiencyBonus);

      const total = (a: number[]) => a.reduce((x, y) => x + y, 0);
      expect(total(cur.spellSlots)).toBeGreaterThanOrEqual(total(prev.spellSlots));

      if (cur.pactSlots && prev.pactSlots) {
        expect(cur.pactSlots.count).toBeGreaterThanOrEqual(prev.pactSlots.count);
        expect(cur.pactSlots.level).toBeGreaterThanOrEqual(prev.pactSlots.level);
      }

      if (cur.cantripsKnown != null && prev.cantripsKnown != null) {
        expect(cur.cantripsKnown).toBeGreaterThanOrEqual(prev.cantripsKnown);
      }
      if (cur.spellsKnown != null && prev.spellsKnown != null) {
        expect(cur.spellsKnown).toBeGreaterThanOrEqual(prev.spellsKnown);
      }

      for (const [id, prevMax] of Object.entries(prev.resources)) {
        const dropsHere = ALLOWED_RESOURCE_DROPS[cls]?.[id]?.includes(cur.level);
        if (dropsHere) continue;
        expect(cur.resources[id], `${cls} ${id} at level ${cur.level}`).toBeGreaterThanOrEqual(prevMax);
      }
    }
  });
});
