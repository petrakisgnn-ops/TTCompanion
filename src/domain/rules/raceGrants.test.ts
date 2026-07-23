import { describe, expect, it } from 'vitest';
import { parseRaceFeatGrant } from './raceGrants';

describe('parseRaceFeatGrant', () => {
  it('reads a 2024 species Origin-feat grant (Human)', () => {
    expect(parseRaceFeatGrant([{ anyFromCategory: { category: ['O'], count: 1 } }])).toEqual({ category: 'O' });
  });

  it('returns null when the species grants no such feat choice', () => {
    expect(parseRaceFeatGrant(undefined)).toBeNull();
    expect(parseRaceFeatGrant([])).toBeNull();
    expect(parseRaceFeatGrant([{ perception: true }])).toBeNull();
  });
});
