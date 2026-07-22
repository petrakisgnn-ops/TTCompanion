import { describe, expect, it } from 'vitest';
import { parseFeatAbility } from './featAbility';

describe('parseFeatAbility', () => {
  it('parses a fixed increase (Heavy Armor Master shape)', () => {
    expect(parseFeatAbility([{ str: 1 }])).toEqual({ fixed: { str: 1 }, choice: undefined });
  });

  it('parses a choose-with-from-and-amount (Resilient / Fey Touched shape)', () => {
    expect(parseFeatAbility([{ choose: { from: ['int', 'wis', 'cha'], amount: 1 } }])).toEqual({
      fixed: {},
      choice: { from: ['int', 'wis', 'cha'], amount: 1, count: 1 },
    });
  });

  it('parses a bare-array choose (XPHB shape) with amount defaulting to 1', () => {
    expect(parseFeatAbility({ choose: ['int', 'wis', 'cha'] })).toEqual({
      fixed: {},
      choice: { from: ['int', 'wis', 'cha'], amount: 1, count: 1 },
    });
  });

  it('returns null for feats with no ability field', () => {
    expect(parseFeatAbility(undefined)).toBeNull();
    expect(parseFeatAbility(null)).toBeNull();
  });

  it('degrades unrecognized shapes to null instead of throwing', () => {
    expect(parseFeatAbility([{ choose: 'garbage' }])).toBeNull();
    expect(parseFeatAbility('not-an-object')).toBeNull();
  });

  it('can carry both a fixed part and a choice part', () => {
    expect(parseFeatAbility([{ str: 1 }, { choose: { from: ['dex', 'con'], amount: 1 } }])).toEqual({
      fixed: { str: 1 },
      choice: { from: ['dex', 'con'], amount: 1, count: 1 },
    });
  });
});
