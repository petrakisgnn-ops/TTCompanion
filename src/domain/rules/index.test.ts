import { describe, expect, it } from 'vitest';
import { passiveScore } from './index';

describe('passiveScore', () => {
  it('is 10 + mod when not proficient', () => {
    expect(passiveScore(3, 2, false)).toBe(13);
  });

  it('adds the proficiency bonus once when proficient', () => {
    expect(passiveScore(3, 2, true)).toBe(15);
  });

  it('doubles the proficiency bonus with expertise', () => {
    expect(passiveScore(3, 2, true, true)).toBe(17);
  });

  it('ignores expertise when not proficient', () => {
    expect(passiveScore(3, 2, false, true)).toBe(13);
  });
});
