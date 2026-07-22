import { describe, expect, it } from 'vitest';
import { resolveExpandedSpellRefs, resolveGrantedSpells, type GrantSource } from './grantedSpells';

describe('resolveGrantedSpells', () => {
  it('resolves a fixed innate grant with a daily (long rest) use count, level-gated', () => {
    const drow: GrantSource = {
      name: 'Drow', source: 'PHB',
      additionalSpells: [{
        innate: {
          3: { daily: { 1: ['faerie fire'] } },
          5: { daily: { 1: ['darkness'] } },
        },
        known: { 1: ['dancing lights#c'] },
      }],
    };

    const atLevel1 = resolveGrantedSpells({ race: drow }, 1);
    expect(atLevel1).toEqual([
      { kind: 'fixed', spellRef: { name: 'dancing lights', source: 'PHB' }, grantedBy: 'Drow', innate: true, dailyUses: undefined, resetOn: undefined },
    ]);

    const atLevel5 = resolveGrantedSpells({ race: drow }, 5);
    expect(atLevel5).toEqual(expect.arrayContaining([
      { kind: 'fixed', spellRef: { name: 'faerie fire', source: 'PHB' }, grantedBy: 'Drow', innate: true, dailyUses: 1, resetOn: 'longRest' },
      { kind: 'fixed', spellRef: { name: 'darkness', source: 'PHB' }, grantedBy: 'Drow', innate: true, dailyUses: 1, resetOn: 'longRest' },
    ]));
    expect(atLevel5).toHaveLength(3);
  });

  it('resolves a "rest" (short rest) wrapper nested under a known block', () => {
    const shadarKai: GrantSource = {
      name: 'Shadar-kai', source: 'MTF',
      additionalSpells: [{ known: { 1: { rest: { 1: ['misty step'] } } } }],
    };
    expect(resolveGrantedSpells({ subrace: shadarKai }, 1)).toEqual([
      { kind: 'fixed', spellRef: { name: 'misty step', source: 'MTF' }, grantedBy: 'Shadar-kai', innate: true, dailyUses: 1, resetOn: 'shortRest' },
    ]);
  });

  it('resolves a fixed spell + a choice query under the same daily wrapper (Fey Touched)', () => {
    const feyTouched: GrantSource = {
      name: 'Fey Touched', source: 'TCE',
      additionalSpells: [{
        innate: { _: { daily: { '1e': ['misty step', { choose: 'level=1|school=E;D' }] } } },
      }],
    };
    const options = resolveGrantedSpells({ feats: [feyTouched] }, 4);
    expect(options).toEqual(expect.arrayContaining([
      { kind: 'fixed', spellRef: { name: 'misty step', source: 'TCE' }, grantedBy: 'Fey Touched', innate: true, dailyUses: 1, resetOn: 'longRest' },
      { kind: 'choice', query: { levels: [1], classFilter: undefined, schoolFilter: ['E', 'D'] }, count: 1, grantedBy: 'Fey Touched', innate: true, dailyUses: 1, resetOn: 'longRest' },
    ]));
    expect(options).toHaveLength(2);
  });

  it('resolves Magic Initiate: a permanently-known choice (cantrips) and a daily choice (leveled spell)', () => {
    const magicInitiateBard: GrantSource = {
      name: 'Magic Initiate', source: 'PHB',
      additionalSpells: [{
        innate: { _: { daily: { 1: [{ choose: 'level=1|class=Bard' }] } } },
        known: { _: [{ choose: 'level=0|class=Bard', count: 2 }] },
      }],
    };
    const options = resolveGrantedSpells({ feats: [magicInitiateBard] }, 4);
    expect(options).toEqual(expect.arrayContaining([
      { kind: 'choice', query: { levels: [0], classFilter: ['Bard'], schoolFilter: undefined }, count: 2, grantedBy: 'Magic Initiate', innate: true, dailyUses: undefined, resetOn: undefined },
      { kind: 'choice', query: { levels: [1], classFilter: ['Bard'], schoolFilter: undefined }, count: 1, grantedBy: 'Magic Initiate', innate: true, dailyUses: 1, resetOn: 'longRest' },
    ]));
    expect(options).toHaveLength(2);
  });

  it('gives each named sub-block of a multi-variant feat (real Magic Initiate shape) a distinct grantedBy, so they don\'t collide', () => {
    const magicInitiate: GrantSource = {
      name: 'Magic Initiate', source: 'PHB',
      additionalSpells: [
        {
          name: 'Bard Spells',
          innate: { _: { daily: { 1: [{ choose: 'level=1|class=Bard' }] } } },
          known: { _: [{ choose: 'level=0|class=Bard', count: 2 }] },
        },
        {
          name: 'Cleric Spells',
          innate: { _: { daily: { 1: [{ choose: 'level=1|class=Cleric' }] } } },
          known: { _: [{ choose: 'level=0|class=Cleric', count: 2 }] },
        },
      ],
    };
    const options = resolveGrantedSpells({ feats: [magicInitiate] }, 4);
    const grantedByValues = new Set(options.map(o => o.grantedBy));
    expect(grantedByValues).toEqual(new Set(['Magic Initiate (Bard Spells)', 'Magic Initiate (Cleric Spells)']));
    expect(options).toHaveLength(4); // 2 options (cantrips + leveled) per variant
  });

  it('does not let a background\'s variant-narrowing swallow an unrelated feat\'s named blocks (regression)', () => {
    // The background-variant-name filter exists for Strixhaven Initiate-style grants
    // (blocks named after colleges, narrowed to the character's actual background).
    // Magic Initiate's blocks are named after *classes*, which never match a background
    // name — narrowing must not apply to it just because *some* background is present.
    const magicInitiate: GrantSource = {
      name: 'Magic Initiate', source: 'PHB',
      additionalSpells: [
        { name: 'Bard Spells', known: { _: [{ choose: 'level=0|class=Bard', count: 2 }] } },
        { name: 'Cleric Spells', known: { _: [{ choose: 'level=0|class=Cleric', count: 2 }] } },
      ],
    };
    const acolyte: GrantSource = { name: 'Acolyte', source: 'PHB' };
    const options = resolveGrantedSpells({ background: acolyte, feats: [magicInitiate] }, 4);
    expect(options).toHaveLength(2);
  });

  it('still narrows a Strixhaven-style feat to the block matching the character\'s actual background', () => {
    const strixhavenInitiate: GrantSource = {
      name: 'Strixhaven Initiate', source: 'SCC',
      additionalSpells: [
        { name: 'Lorehold 1', known: { 1: ['guidance#c'] } },
        { name: 'Prismari 1', known: { 1: ['minor illusion#c'] } },
      ],
    };
    const lorehold: GrantSource = { name: 'Lorehold Student', source: 'SCC' };
    const options = resolveGrantedSpells({ background: lorehold, feats: [strixhavenInitiate] }, 1);
    expect(options).toHaveLength(1);
    expect(options[0]).toMatchObject({ grantedBy: 'Strixhaven Initiate (Lorehold 1)' });
  });

  it('collapses Strixhaven Initiate\'s "every possible cantrip pair" encoding: no over-granting, one deduped choice', () => {
    // Real shape: 3 named blocks for one college, each a different pair from a pool of
    // 3 cantrips (5etools' way of encoding "choose 2 of 3" without a count query), each
    // repeating the identical 1st-level spell choice.
    const strixhavenInitiate: GrantSource = {
      name: 'Strixhaven Initiate', source: 'SCC',
      additionalSpells: [
        {
          name: 'Lorehold 1',
          known: { _: ['light#c', 'sacred flame#c'] },
          innate: { _: { daily: { 1: [{ choose: 'level=1|class=cleric;wizard' }] } } },
        },
        {
          name: 'Lorehold 2',
          known: { _: ['light#c', 'thaumaturgy#c'] },
          innate: { _: { daily: { 1: [{ choose: 'level=1|class=cleric;wizard' }] } } },
        },
        {
          name: 'Lorehold 3',
          known: { _: ['sacred flame#c', 'thaumaturgy#c'] },
          innate: { _: { daily: { 1: [{ choose: 'level=1|class=cleric;wizard' }] } } },
        },
      ],
    };
    const options = resolveGrantedSpells({ feats: [strixhavenInitiate] }, 1);

    const fixed = options.filter(o => o.kind === 'fixed');
    expect(fixed.map(o => o.spellRef.name).sort()).toEqual(['light', 'sacred flame', 'thaumaturgy']);
    expect(fixed.every(o => o.ambiguousVariant === true)).toBe(true);

    const choices = options.filter(o => o.kind === 'choice');
    expect(choices).toHaveLength(1);
    expect(choices[0]).toMatchObject({ count: 1, dailyUses: 1, resetOn: 'longRest' });
  });

  it('does not flag a feat\'s single, unnumbered block as an ambiguous variant', () => {
    const feyTouched: GrantSource = {
      name: 'Fey Touched', source: 'TCE',
      additionalSpells: [{ innate: { _: { daily: { 1: ['misty step'] } } } }],
    };
    const options = resolveGrantedSpells({ feats: [feyTouched] }, 1);
    expect(options[0]).toMatchObject({ ambiguousVariant: undefined });
  });

  it('parses a choice query listing more than one eligible class (real Strixhaven Initiate shape)', () => {
    const strixhavenInitiate: GrantSource = {
      name: 'Strixhaven Initiate', source: 'SCC',
      additionalSpells: [{
        name: 'Lorehold 1',
        known: { _: ['light#c', 'sacred flame#c'] },
        innate: { _: { daily: { 1: [{ choose: 'level=1|class=cleric;wizard' }] } } },
      }],
    };
    const options = resolveGrantedSpells({ feats: [strixhavenInitiate] }, 1);
    const choice = options.find(o => o.kind === 'choice');
    expect(choice?.query.classFilter).toEqual(['cleric', 'wizard']);
  });

  it('still resolves fixed "expanded" list grants (Strixhaven-style backgrounds), gated as non-innate', () => {
    const guildBg: GrantSource = {
      name: 'Golgari Agent', source: 'GGR',
      additionalSpells: [{ expanded: { s0: ['dancing lights#c', 'spare the dying#c'], s1: ['entangle'] } }],
    };
    const options = resolveGrantedSpells({ background: guildBg }, 1);
    expect(options.every(o => o.innate === false)).toBe(true);
    expect(options).toHaveLength(3);
  });

  it('deduplicates identical grants and returns [] when there is nothing to grant', () => {
    expect(resolveGrantedSpells({}, 5)).toEqual([]);
  });

  it('resolves subclass `prepared` blocks (Life Domain) as alwaysPrepared, gated by class level via levelOverride', () => {
    const lifeDomain: GrantSource = {
      name: 'Life Domain', source: 'PHB', levelOverride: 3,
      additionalSpells: [{
        prepared: {
          1: ['bless', 'cure wounds'],
          3: ['lesser restoration', 'spiritual weapon'],
          5: ['beacon of hope', 'revivify'],
        },
      }],
    };
    // character total level intentionally different from class level to prove the override wins
    const options = resolveGrantedSpells({ subclasses: [lifeDomain] }, 9);
    const names = options.map(o => (o.kind === 'fixed' ? o.spellRef.name : '')).sort();
    expect(names).toEqual(['bless', 'cure wounds', 'lesser restoration', 'spiritual weapon']);
    expect(options.every(o => o.kind === 'fixed' && o.alwaysPrepared === true)).toBe(true);
  });

  it('marks per-terrain named blocks (Circle of the Land shape — no digit suffix) as ambiguous variants', () => {
    const land: GrantSource = {
      name: 'Circle of the Land', source: 'PHB', levelOverride: 3,
      additionalSpells: [
        { name: 'Arctic', prepared: { 3: ['hold person', 'spike growth'] } },
        { name: 'Coast', prepared: { 3: ['mirror image', 'misty step'] } },
      ],
    };
    const options = resolveGrantedSpells({ subclasses: [land] }, 3);
    expect(options).toHaveLength(4);
    expect(options.every(o => o.ambiguousVariant === true)).toBe(true);
  });

  it('extracts a patron expanded list as plain refs (The Fiend shape)', () => {
    const fiend: GrantSource = {
      name: 'The Fiend', source: 'PHB',
      additionalSpells: [{ expanded: { s1: ['burning hands', 'command'], s2: ['scorching ray'] } }],
    };
    expect(resolveExpandedSpellRefs(fiend).map(r => r.name).sort()).toEqual(['burning hands', 'command', 'scorching ray']);
  });
});
