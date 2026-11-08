import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expandMagicVariants, type MagicVariant } from './magicVariants';
import type { Item } from './types';

const DATA = resolve(dirname(fileURLToPath(import.meta.url)), '../../../public/data');
const read = <T,>(f: string): T => JSON.parse(readFileSync(resolve(DATA, f), 'utf-8').replace(/^﻿/, '')) as T;

describe('expandMagicVariants (real data)', () => {
  const base = read<{ baseitem: Item[] }>('items-base.json').baseitem;
  const items = read<{ item: Item[] }>('items.json').item;
  const variants = read<{ magicvariant: MagicVariant[] }>('magicvariants.json').magicvariant;
  const existing = new Set(items.map(i => `${i.name}|${i.source}`.toLowerCase()));
  const out = expandMagicVariants(base, variants, existing);
  const find = (name: string, source: string) => out.find(i => i.name === name && i.source === source);

  it('creates Mace of Warning for both editions', () => {
    const classic = find('Mace of Warning', 'DMG');
    const modern = find('Mace of Warning', 'XDMG');
    expect(classic).toMatchObject({ baseItem: 'Mace|PHB', dmg1: '1d6', weaponCategory: 'simple', reqAttune: true, rarity: 'uncommon' });
    expect(modern).toMatchObject({ baseItem: 'Mace|XPHB' });
  });

  it('fills templated bonuses', () => {
    const plusOne = find('+1 Longsword', 'DMG')!;
    expect(plusOne.bonusWeapon).toBe('+1');
    expect(JSON.stringify(plusOne.entries)).toContain('+1 bonus');
    expect(JSON.stringify(plusOne.entries)).not.toContain('{=');
  });

  it('never duplicates an existing item or itself', () => {
    const keys = out.map(i => `${i.name}|${i.source}`.toLowerCase());
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys.some(k => existing.has(k))).toBe(false);
  });
});
