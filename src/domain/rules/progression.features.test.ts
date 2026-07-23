import { describe, expect, it } from 'vitest';
import { classFeaturesUpTo, subclassFeaturesUpTo } from '../reference/classFeatures';
import { optionalFeatureSlots } from './optionalFeatures';
import { CLASSES } from './classData';
import { loadClassJson, pickClassEntry, type RawClassEntry } from './__fixtures__/classJson';
import { extractClassTable } from './__fixtures__/classTable';

const ALL_CLASSES = CLASSES.map(c => c.name);

// ── Pure filtering unit tests ─────────────────────────────────────────────────
describe('classFeaturesUpTo', () => {
  const feats = [
    { name: 'Danger Sense', className: 'Barbarian', classSource: 'PHB', level: 2 },
    { name: 'Rage', className: 'Barbarian', classSource: 'PHB', level: 1 },
    { name: 'Arcane Recovery', className: 'Wizard', classSource: 'PHB', level: 1 },
    { name: 'No Source', className: 'Barbarian', level: 1 }, // classSource omitted
  ];

  it('filters by class + level and orders by level', () => {
    expect(classFeaturesUpTo(feats, 'Barbarian', 'PHB', 1).map(f => f.name)).toEqual(['Rage', 'No Source']);
    expect(classFeaturesUpTo(feats, 'Barbarian', 'PHB', 2).map(f => f.name)).toEqual(['Rage', 'No Source', 'Danger Sense']);
  });

  it('excludes other classes and higher levels', () => {
    expect(classFeaturesUpTo(feats, 'Wizard', 'PHB', 20).map(f => f.name)).toEqual(['Arcane Recovery']);
    expect(classFeaturesUpTo(feats, 'Barbarian', 'PHB', 1).some(f => f.name === 'Danger Sense')).toBe(false);
  });

  it('includes records with no classSource', () => {
    expect(classFeaturesUpTo(feats, 'Barbarian', 'PHB', 1).map(f => f.name)).toContain('No Source');
  });
});

describe('subclassFeaturesUpTo', () => {
  const feats = [
    { name: 'War Priest', subclassShortName: 'War', subclassSource: 'PHB', level: 1 },
    { name: 'Guided Strike', subclassShortName: 'War', subclassSource: 'PHB', level: 2 },
    { name: 'Other', subclassShortName: 'Life', subclassSource: 'PHB', level: 1 },
  ];
  it('filters by subclass shortName + source + level', () => {
    expect(subclassFeaturesUpTo(feats, 'War', 'PHB', 1).map(f => f.name)).toEqual(['War Priest']);
    expect(subclassFeaturesUpTo(feats, 'War', 'PHB', 2).map(f => f.name)).toEqual(['War Priest', 'Guided Strike']);
    expect(subclassFeaturesUpTo(feats, 'Life', 'PHB', 20).map(f => f.name)).toEqual(['Other']);
  });
});

// ── Feature-name reconciliation ───────────────────────────────────────────────
// The class table's `classFeatures` refs are the authoritative "which feature at which level".
// The app derives features from the full `classFeature` array, which ALSO carries named
// sub-features (e.g. a Monk's Flurry of Blows under Ki, a Cleric's Turn Undead under Channel
// Divinity), so the app is a controlled *superset*. The rule we assert: the app never DROPS a
// class-table feature — every ref feature appears at its level.
function refsByLevel(entry: RawClassEntry): Record<number, string[]> {
  const map: Record<number, string[]> = {};
  for (const ref of entry.classFeatures ?? []) {
    const str = typeof ref === 'string' ? ref : ref.classFeature;
    const parts = str.split('|'); // Name|Class|Source|Level|[featureSource]
    const level = Number(parts[3]);
    (map[level] ??= []).push(parts[0]);
  }
  return map;
}

describe('feature-name reconciliation (every class-table feature is surfaced at its level)', () => {
  it.each(ALL_CLASSES)('%s', cls => {
    const json = loadClassJson(cls);
    const entry = pickClassEntry(json);
    const refs = refsByLevel(entry);

    for (let level = 1; level <= 20; level++) {
      const appAtLevel = new Set(
        classFeaturesUpTo(json.classFeature, entry.name, entry.source, level)
          .filter(f => f.level === level)
          .map(f => f.name),
      );
      for (const name of refs[level] ?? []) {
        expect(appAtLevel.has(name), `${cls} L${level}: table feature "${name}" not surfaced`).toBe(true);
      }
    }
  });
});

// ── Optional-feature count reconciliation ─────────────────────────────────────
// The app derives choose-N counts from optionalfeatureProgression via optionalFeatureSlots
// (what ClassOptionsPicker/Section rely on); reconcile that against the class table's own
// per-level column. optionalFeatureSlots omits a group at levels where it grants 0.
function slotMaxFor(entry: RawClassEntry, featureType: string, level: number): number {
  const group = optionalFeatureSlots(entry.optionalfeatureProgression, undefined, level)
    .find(g => g.featureTypes.includes(featureType));
  return group?.max ?? 0;
}

describe('optional-feature counts match the class table', () => {
  it('Warlock — Invocations Known', () => {
    const entry = pickClassEntry(loadClassJson('Warlock'));
    const col = extractClassTable(entry.classTableGroups).columns['Invocations Known'];
    for (let level = 1; level <= 20; level++) {
      expect(slotMaxFor(entry, 'EI', level), `invocations @${level}`).toBe(col[level - 1]);
    }
  });

  it('Artificer — Infusions Known', () => {
    const entry = pickClassEntry(loadClassJson('Artificer'));
    const col = extractClassTable(entry.classTableGroups).columns['Infusions Known'];
    for (let level = 1; level <= 20; level++) {
      expect(slotMaxFor(entry, 'AI', level), `infusions @${level}`).toBe(col[level - 1]);
    }
  });
});
