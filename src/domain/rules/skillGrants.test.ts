import { describe, expect, it } from 'vitest';
import { parseSkillGrant } from './skillGrants';

describe('parseSkillGrant', () => {
  it('returns an empty grant for missing/invalid input', () => {
    expect(parseSkillGrant(undefined)).toEqual({ fixed: [], choiceCount: 0, choiceFrom: [] });
    expect(parseSkillGrant([])).toEqual({ fixed: [], choiceCount: 0, choiceFrom: [] });
  });

  it('reads a fixed grant (Elf PHB → Perception)', () => {
    expect(parseSkillGrant([{ perception: true }])).toEqual({
      fixed: ['Perception'], choiceCount: 0, choiceFrom: [],
    });
  });

  it('normalizes multi-word keys (Bugbear → Stealth, "animal handling")', () => {
    const g = parseSkillGrant([{ choose: { from: ['animal handling', 'medicine'] } }]);
    expect(g.choiceCount).toBe(1);
    expect(g.choiceFrom).toEqual(['Animal Handling', 'Medicine']);
  });

  it('reads a restricted choice with an explicit count (Changeling → choose 2)', () => {
    const g = parseSkillGrant([{ choose: { from: ['deception', 'insight', 'intimidation'], count: 2 } }]);
    expect(g.choiceCount).toBe(2);
    expect(g.choiceFrom).toEqual(['Deception', 'Insight', 'Intimidation']);
  });

  it('reads a free "any" choice (Half-Elf → any 2)', () => {
    expect(parseSkillGrant([{ any: 2 }])).toEqual({ fixed: [], choiceCount: 2, choiceFrom: [] });
  });
});
