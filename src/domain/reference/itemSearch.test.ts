import { describe, expect, it } from 'vitest';
import { isMundane, searchItems } from './itemSearch';
import type { Item } from './types';

const items: Item[] = [
  { name: '+1 Plate Armor', source: 'DMG', rarity: 'rare', reprintedAs: ['+1 Armor|XDMG'] },
  { name: 'Adamantine Plate Armor', source: 'DMG', rarity: 'uncommon' },
  { name: 'Plate Armor', source: 'PHB', rarity: 'none', reprintedAs: ['Plate Armor|XPHB'] },
  { name: 'Plate Armor', source: 'XPHB', rarity: 'none' },
  { name: 'Half Plate Armor', source: 'XPHB', rarity: 'none' },
  { name: 'Plate Armor of Etherealness', source: 'DMG', rarity: 'legendary' },
];

describe('searchItems', () => {
  it('puts the exact match first', () => {
    expect(searchItems(items, 'plate armor')[0].name).toBe('Plate Armor');
  });
  it('filters by edition', () => {
    const r = searchItems(items, 'plate armor', { edition: '5.5e' });
    expect(r.filter(i => i.name === 'Plate Armor').map(i => i.source)).toEqual(['XPHB']);
    expect(r.some(i => i.name === '+1 Plate Armor')).toBe(false);
  });
  it('ranks prefix and word matches above substrings, mundane first', () => {
    const r = searchItems(items, 'plate', { edition: '5e' }).map(i => i.name);
    expect(r.slice(0, 2)).toEqual(['Plate Armor', 'Plate Armor of Etherealness']);
    expect(r.indexOf('Adamantine Plate Armor')).toBeGreaterThan(r.indexOf('Plate Armor of Etherealness'));
  });
  it('returns nothing for an empty query', () => {
    expect(searchItems(items, '  ')).toEqual([]);
  });
});

describe('isMundane', () => {
  it('treats missing rarity as mundane', () => {
    expect(isMundane({})).toBe(true);
    expect(isMundane({ rarity: 'rare' })).toBe(false);
  });
});
