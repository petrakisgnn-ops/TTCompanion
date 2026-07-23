import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { parseFeatRewards, parseFeatProficiencies, type RawFeat } from './featRewards';
import { ALL_SKILLS } from './classSkills';

function loadFeats(): RawFeat[] {
  const path = resolve(dirname(fileURLToPath(import.meta.url)), '../../../public/data/feats.json');
  let raw = readFileSync(path, 'utf-8');
  if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
  return (JSON.parse(raw) as { feat: RawFeat[] }).feat;
}

const feats = loadFeats();
const norm = (s: string) => s.toLowerCase().replace(/[\s']/g, '');
const block = (raw: unknown): Record<string, unknown> | undefined =>
  Array.isArray(raw) ? (raw[0] as Record<string, unknown> | undefined) : undefined;

describe('every feat is loaded', () => {
  it('has a non-trivial number of feats', () => {
    expect(feats.length).toBeGreaterThan(200);
  });

  it('parses every feat without throwing', () => {
    for (const f of feats) {
      expect(() => parseFeatRewards(f), `${f.name}|${f.source}`).not.toThrow();
    }
  });
});

describe('ability score rewards', () => {
  it('reads a fixed +1/+2 for feats that grant one (Actor → +1 CHA)', () => {
    const actor = feats.find(f => f.name === 'Actor');
    expect(actor).toBeDefined();
    expect(parseFeatRewards(actor!).ability?.fixed).toEqual({ cha: 1 });
  });

  it('reads a half-feat choice (Resilient → choose one ability +1)', () => {
    const resilient = feats.find(f => f.name === 'Resilient');
    expect(resilient).toBeDefined();
    const choice = parseFeatRewards(resilient!).ability?.choice;
    expect(choice?.amount).toBe(1);
    expect((choice?.from.length ?? 0)).toBeGreaterThan(0);
  });

  it('reports null ability for feats that grant no ability increase', () => {
    // A feat with no `ability` field (e.g. a pure-utility feat) → null.
    const noAbility = feats.find(f => f.ability === undefined);
    if (noAbility) expect(parseFeatRewards(noAbility).ability).toBeNull();
  });
});

describe('skill proficiency rewards', () => {
  it('match fixed grants and choose/any counts for every feat', () => {
    for (const f of feats) {
      const where = `${f.name}|${f.source}`;
      const r = parseFeatRewards(f).skills;
      const b = block(f.skillProficiencies);

      const refFixed = b
        ? Object.entries(b).filter(([k, v]) => v === true && k !== 'choose' && k !== 'any').map(([k]) => norm(k)).sort()
        : [];
      expect(r.fixed.map(norm).sort(), where).toEqual(refFixed);

      let refChoice = 0;
      if (b) {
        if (b.choose && typeof b.choose === 'object') refChoice += (b.choose as { count?: number }).count ?? 1;
        if (typeof b.any === 'number') refChoice += b.any;
      }
      expect(r.choiceCount, where).toBe(refChoice);
    }
  });

  it('only ever grants recognized skills', () => {
    const valid = new Set(ALL_SKILLS.map(norm));
    for (const f of feats) {
      for (const s of parseFeatRewards(f).skills.fixed) {
        expect(valid.has(norm(s)), `${f.name}: "${s}"`).toBe(true);
      }
    }
  });

  it('grants a skill choice for feats that offer one (Prodigy → choose 1)', () => {
    const prodigy = feats.find(f => f.name === 'Prodigy');
    if (prodigy) expect(parseFeatRewards(prodigy).skills.choiceCount).toBe(1);
    // At least some feats offer a skill choice.
    expect(feats.some(f => parseFeatRewards(f).skills.choiceCount > 0)).toBe(true);
  });

  // Skilled encodes its "3 from any skill OR tool" as `skillToolLanguageProficiencies`, a combined
  // shape the app's proficiency parsers don't cover — documented here so it isn't silently missed.
  it('does not mis-parse the combined skillToolLanguageProficiencies shape (Skilled)', () => {
    const skilled = feats.find(f => f.name === 'Skilled');
    if (skilled) {
      expect(skilled.skillProficiencies).toBeUndefined();
      expect(parseFeatRewards(skilled).skills).toEqual({ fixed: [], choiceCount: 0, choiceFrom: [] });
    }
  });
});

describe('language rewards', () => {
  it('match fixed grants and free-choice counts for every feat', () => {
    for (const f of feats) {
      const where = `${f.name}|${f.source}`;
      const r = parseFeatRewards(f).languages;
      const b = block(f.languageProficiencies);

      let refChoice = 0;
      const refFixed: string[] = [];
      if (b) {
        for (const [k, v] of Object.entries(b)) {
          if (k === 'anyStandard' || k === 'anyExotic' || k === 'any') { if (typeof v === 'number') refChoice += v; }
          else if (k === 'other') { if (v) refChoice += 1; }
          else if (k === 'choose') { refChoice += 1; }
          else if (v === true) { refFixed.push(norm(k)); }
        }
      }
      expect(r.fixed.map(norm).sort(), where).toEqual(refFixed.sort());
      expect(r.choiceCount, where).toBe(refChoice);
    }
  });
});

describe('tool proficiency rewards', () => {
  it('match fixed grants and choose counts for every feat', () => {
    for (const f of feats) {
      const where = `${f.name}|${f.source}`;
      const r = parseFeatRewards(f).tools;
      const b = block(f.toolProficiencies);

      let refChoice = 0;
      const refFixed: string[] = [];
      if (b) {
        for (const [k, v] of Object.entries(b)) {
          if (k === 'anyArtisansTool' || k === 'anyGamingSet' || k === 'anyMusicalInstrument' || k === 'any') {
            if (typeof v === 'number') refChoice += v;
          } else if (k === 'choose') { refChoice += 1; }
          else if (v === true) { refFixed.push(norm(k)); }
        }
      }
      expect(r.fixed.map(norm).sort(), where).toEqual(refFixed.sort());
      expect(r.choiceCount, where).toBe(refChoice);
    }
  });
});

describe('spell / expertise reward flags', () => {
  it('flags feats that grant spells via additionalSpells', () => {
    for (const f of feats) {
      const expected = Array.isArray(f.additionalSpells) && f.additionalSpells.length > 0;
      expect(parseFeatRewards(f).grantsSpells, `${f.name}|${f.source}`).toBe(expected);
    }
    // Magic Initiate is the canonical spell-granting feat.
    const magicInitiate = feats.find(f => f.name.toLowerCase().startsWith('magic initiate'));
    if (magicInitiate) expect(parseFeatRewards(magicInitiate).grantsSpells).toBe(true);
  });

  it('flags feats that grant Expertise', () => {
    for (const f of feats) {
      const expected = Array.isArray(f.expertise) && f.expertise.length > 0;
      expect(parseFeatRewards(f).grantsExpertise, `${f.name}|${f.source}`).toBe(expected);
    }
  });
});

describe('parseFeatProficiencies (fixed grants + player choices)', () => {
  it('never throws across every feat', () => {
    for (const f of feats) expect(() => parseFeatProficiencies(f), `${f.name}|${f.source}`).not.toThrow();
  });

  it('Boon of Terror → fixed Intimidation, no choices', () => {
    const f = feats.find(x => x.name === 'Boon of Terror');
    if (!f) return;
    const p = parseFeatProficiencies(f);
    expect(p.fixed.skills).toEqual(['Intimidation']);
    expect(p.choices).toEqual([]);
  });

  it('Aberrant Anatomy → fixed Perception proficiency AND expertise', () => {
    const f = feats.find(x => x.name === 'Aberrant Anatomy');
    if (!f) return;
    const p = parseFeatProficiencies(f);
    expect(p.fixed.skills).toEqual(['Perception']);
    expect(p.fixed.expertise).toEqual(['Perception']);
  });

  it('Prodigy → a skill, tool, language, and expertise choice', () => {
    const f = feats.find(x => x.name === 'Prodigy');
    if (!f) return;
    const p = parseFeatProficiencies(f);
    expect(p.fixed.skills).toEqual([]);
    expect(p.choices.map(c => c.kind).sort()).toEqual(['expertise', 'language', 'skill', 'tool']);
    expect(p.choices.find(c => c.kind === 'skill')?.count).toBe(1);
    expect(p.choices.find(c => c.kind === 'skill')?.from?.length).toBe(18);
    expect(p.choices.find(c => c.kind === 'expertise')?.count).toBe(1);
  });

  it('Skilled → a combined skill-or-tool choice of 3', () => {
    const f = feats.find(x => x.name === 'Skilled');
    if (!f) return;
    expect(parseFeatProficiencies(f).choices.find(c => c.kind === 'skillOrTool')?.count).toBe(3);
  });
});
