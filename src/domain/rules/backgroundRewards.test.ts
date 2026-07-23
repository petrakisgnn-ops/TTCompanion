import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { parseBackgroundRewards, type RawBackground } from './backgroundRewards';
import { ALL_SKILLS } from './classSkills';

function loadBackgrounds(): RawBackground[] {
  const path = resolve(dirname(fileURLToPath(import.meta.url)), '../../../public/data/backgrounds.json');
  let raw = readFileSync(path, 'utf-8');
  if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
  return (JSON.parse(raw) as { background: RawBackground[] }).background;
}

const backgrounds = loadBackgrounds();
const norm = (s: string) => s.toLowerCase().replace(/[\s']/g, '');
const block = (raw: unknown): Record<string, unknown> | undefined =>
  Array.isArray(raw) ? (raw[0] as Record<string, unknown> | undefined) : undefined;

// Reference derivations parse the raw JSON straightforwardly (a different, simpler path than the
// app's parsers) so a bug in either surfaces. Compared normalized, independent of display casing.

describe('every background is loaded', () => {
  it('has a non-trivial number of backgrounds', () => {
    expect(backgrounds.length).toBeGreaterThan(100);
  });
});

describe('skill proficiency rewards', () => {
  it('match fixed grants and choose/any counts for every background', () => {
    for (const bg of backgrounds) {
      const where = `${bg.name}|${bg.source}`;
      const r = parseBackgroundRewards(bg).skills;
      const b = block(bg.skillProficiencies);

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
    for (const bg of backgrounds) {
      for (const s of parseBackgroundRewards(bg).skills.fixed) {
        expect(valid.has(norm(s)), `${bg.name}: "${s}"`).toBe(true);
      }
    }
  });

  it('grants a skill CHOICE for every background that offers one (regression guard)', () => {
    const chooseBgs = backgrounds.filter(bg => {
      const b = block(bg.skillProficiencies);
      return b && (b.choose != null || typeof b.any === 'number');
    });
    expect(chooseBgs.length).toBeGreaterThanOrEqual(8);
    for (const bg of chooseBgs) {
      expect(parseBackgroundRewards(bg).skills.choiceCount, `${bg.name}|${bg.source}`).toBeGreaterThan(0);
    }
  });
});

describe('language rewards', () => {
  it('match fixed grants and free-choice counts for every background', () => {
    for (const bg of backgrounds) {
      const where = `${bg.name}|${bg.source}`;
      const r = parseBackgroundRewards(bg).languages;
      const b = block(bg.languageProficiencies);

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
  it('match fixed grants and choose counts for every background', () => {
    for (const bg of backgrounds) {
      const where = `${bg.name}|${bg.source}`;
      const r = parseBackgroundRewards(bg).tools;
      const b = block(bg.toolProficiencies);

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

describe('feat rewards', () => {
  it('extract the granted feat names for every background that grants a feat', () => {
    for (const bg of backgrounds) {
      const where = `${bg.name}|${bg.source}`;
      const ref: string[] = [];
      for (const grant of bg.feats ?? []) {
        for (const [k, v] of Object.entries(grant)) {
          if (v) ref.push(k.split('|')[0].split(';')[0].trim());
        }
      }
      expect(parseBackgroundRewards(bg).featNames, where).toEqual(ref);
    }
  });
});

describe('anchored backgrounds (hand-verified PHB values)', () => {
  it('Acolyte: Insight + Religion, 2 languages, no tools', () => {
    const acolyte = backgrounds.find(b => b.name === 'Acolyte' && b.source === 'PHB');
    expect(acolyte).toBeDefined();
    const r = parseBackgroundRewards(acolyte!);
    expect(r.skills.fixed.map(norm).sort()).toEqual(['insight', 'religion']);
    expect(r.skills.choiceCount).toBe(0);
    expect(r.languages.choiceCount).toBe(2);
    expect(r.tools.fixed).toEqual([]);
  });

  it('Cloistered Scholar: fixed History + a choice of one more skill', () => {
    const bg = backgrounds.find(b => b.name === 'Cloistered Scholar');
    expect(bg).toBeDefined();
    const r = parseBackgroundRewards(bg!);
    expect(r.skills.fixed.map(norm)).toEqual(['history']);
    expect(r.skills.choiceCount).toBe(1);
    expect(r.skills.choiceFrom.map(norm).sort()).toEqual(['arcana', 'nature', 'religion']);
  });
});
