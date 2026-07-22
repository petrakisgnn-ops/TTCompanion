import { describe, expect, it } from 'vitest';
import { resolveClassSpellList, type SpellSourcesJson } from './classSpellList';

const FIXTURE: SpellSourcesJson = {
  PHB: {
    'Cure Wounds': { class: [{ name: 'Cleric', source: 'PHB' }, { name: 'Druid', source: 'PHB' }] },
    'Fireball': { class: [{ name: 'Sorcerer', source: 'PHB' }, { name: 'Wizard', source: 'PHB' }] },
    'Aid': {
      class: [{ name: 'Cleric', source: 'PHB' }],
      classVariant: [{ name: 'Bard', source: 'PHB', definedInSource: 'TCE' }],
    },
  },
  XGE: {
    'Sickening Radiance': { class: [{ name: 'Wizard', source: 'PHB' }, { name: 'Druid', source: 'PHB' }] },
  },
};

describe('resolveClassSpellList', () => {
  it('collects spells across books for a class, case-insensitively', () => {
    const result = resolveClassSpellList(FIXTURE, 'wizard');
    expect(result).toEqual(
      expect.arrayContaining([
        { name: 'Fireball', source: 'PHB' },
        { name: 'Sickening Radiance', source: 'XGE' },
      ]),
    );
    expect(result).toHaveLength(2);
  });

  it('excludes classVariant-only grants', () => {
    const result = resolveClassSpellList(FIXTURE, 'bard');
    expect(result).toEqual([]);
  });

  it('includes base class grants alongside a classVariant on the same spell', () => {
    const result = resolveClassSpellList(FIXTURE, 'cleric');
    expect(result).toEqual(
      expect.arrayContaining([
        { name: 'Cure Wounds', source: 'PHB' },
        { name: 'Aid', source: 'PHB' },
      ]),
    );
  });
});
