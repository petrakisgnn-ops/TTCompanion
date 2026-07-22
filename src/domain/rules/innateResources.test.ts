import { describe, expect, it } from 'vitest';
import { computeInnateResourceTracks } from './innateResources';
import type { GrantedSpellOption } from './grantedSpells';

describe('computeInnateResourceTracks', () => {
  it('materializes a fixed grant unconditionally', () => {
    const options: GrantedSpellOption[] = [
      { kind: 'fixed', spellRef: { name: 'faerie fire', source: 'PHB' }, grantedBy: 'Drow', innate: true, dailyUses: 1, resetOn: 'longRest' },
    ];
    expect(computeInnateResourceTracks(options, [])).toEqual([
      { id: 'innate-drow-faerie-fire', label: 'faerie fire (Drow)', current: 1, max: 1, resetOn: 'longRest' },
    ]);
  });

  it('ignores grants with no per-rest use count', () => {
    const options: GrantedSpellOption[] = [
      { kind: 'fixed', spellRef: { name: 'dancing lights', source: 'PHB' }, grantedBy: 'Drow', innate: true },
    ];
    expect(computeInnateResourceTracks(options, [])).toEqual([]);
  });

  it('only materializes a choice grant once the player has picked a spell for it', () => {
    const options: GrantedSpellOption[] = [
      { kind: 'choice', query: { levels: [1], schoolFilter: ['E', 'D'] }, count: 1, grantedBy: 'Fey Touched', innate: true, dailyUses: 1, resetOn: 'longRest' },
    ];
    expect(computeInnateResourceTracks(options, [])).toEqual([]);

    const knownSpells = [{ name: 'charm person', source: 'PHB', grantedBy: 'Fey Touched', level: 1 }];
    expect(computeInnateResourceTracks(options, knownSpells)).toEqual([
      { id: 'innate-fey-touched-charm-person', label: 'charm person (Fey Touched)', current: 1, max: 1, resetOn: 'longRest' },
    ]);
  });

  it('does not count a fixed spell from the same grant as an already-made choice (Fey Touched shape)', () => {
    const options: GrantedSpellOption[] = [
      { kind: 'fixed', spellRef: { name: 'misty step', source: 'TCE' }, grantedBy: 'Fey Touched', innate: true, dailyUses: 1, resetOn: 'longRest' },
      { kind: 'choice', query: { levels: [1], schoolFilter: ['E', 'D'] }, count: 1, grantedBy: 'Fey Touched', innate: true, dailyUses: 1, resetOn: 'longRest' },
    ];
    // Only the fixed spell has been auto-added so far — the choice hasn't been made yet.
    const knownSpells = [{ name: 'misty step', source: 'TCE', grantedBy: 'Fey Touched', level: 2 }];
    expect(computeInnateResourceTracks(options, knownSpells)).toEqual([
      { id: 'innate-fey-touched-misty-step', label: 'misty step (Fey Touched)', current: 1, max: 1, resetOn: 'longRest' },
    ]);

    // Once the player picks their choice spell too, its own track appears alongside the fixed one.
    const afterChoice = [...knownSpells, { name: 'charm person', source: 'PHB', grantedBy: 'Fey Touched', level: 1 }];
    expect(computeInnateResourceTracks(options, afterChoice)).toEqual(expect.arrayContaining([
      { id: 'innate-fey-touched-misty-step', label: 'misty step (Fey Touched)', current: 1, max: 1, resetOn: 'longRest' },
      { id: 'innate-fey-touched-charm-person', label: 'charm person (Fey Touched)', current: 1, max: 1, resetOn: 'longRest' },
    ]));
  });

  it('does not let a cantrip choice under the same grantedBy count toward a different leveled choice (Magic Initiate shape)', () => {
    const options: GrantedSpellOption[] = [
      { kind: 'choice', query: { levels: [0], classFilter: ['Bard'] }, count: 2, grantedBy: 'Magic Initiate (Bard Spells)', innate: true },
      { kind: 'choice', query: { levels: [1], classFilter: ['Bard'] }, count: 1, grantedBy: 'Magic Initiate (Bard Spells)', innate: true, dailyUses: 1, resetOn: 'longRest' },
    ];
    // Player has picked their 2 cantrips (level 0) but not yet their leveled spell.
    const knownSpells = [
      { name: 'vicious mockery', source: 'PHB', grantedBy: 'Magic Initiate (Bard Spells)', level: 0 },
      { name: 'minor illusion', source: 'PHB', grantedBy: 'Magic Initiate (Bard Spells)', level: 0 },
    ];
    // The cantrip picks have no dailyUses (permanently known) and must not spuriously
    // fulfill the leveled choice, which does have dailyUses.
    expect(computeInnateResourceTracks(options, knownSpells)).toEqual([]);
  });
});
