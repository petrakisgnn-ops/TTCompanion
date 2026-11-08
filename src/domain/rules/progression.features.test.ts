import { describe, expect, it } from 'vitest';
import {
  buildClassFeatures, parseClassFeatureUid, parseSubclassFeatureUid, pendingChoices,
  subclassOptions, subclassReprintFor,
  resolveClassJsonCopies, type ClassJson as FeatureClassJson,
} from '../reference/classFeatures';
import { optionalFeatureSlots } from './optionalFeatures';
import { CLASSES } from './classData';
import { loadClassJson, pickClassEntry, type RawClassEntry } from './__fixtures__/classJson';
import { extractClassTable } from './__fixtures__/classTable';

const ALL_CLASSES = CLASSES.map(c => c.name);
const load = (cls: string) => resolveClassJsonCopies(loadClassJson(cls) as unknown as FeatureClassJson);

// ── UID parsing ───────────────────────────────────────────────────────────────
describe('feature uid parsing', () => {
  it('defaults class source to PHB and feature source to the class source', () => {
    expect(parseClassFeatureUid('Rage|Barbarian||1')).toEqual(
      { name: 'Rage', className: 'Barbarian', classSource: 'PHB', level: 1, source: 'PHB' });
    expect(parseClassFeatureUid('Protector|Cleric|XPHB|1|XPHB').classSource).toBe('XPHB');
  });
  it('defaults subclass source to PHB and feature source to the subclass source', () => {
    const u = parseSubclassFeatureUid('Blessed Strikes|Cleric||Knowledge||8|TCE');
    expect(u).toMatchObject({ classSource: 'PHB', subclassShortName: 'Knowledge', subclassSource: 'PHB', level: 8, source: 'TCE' });
    expect(parseSubclassFeatureUid('Life Domain|Cleric|XPHB|Life|XPHB|3').source).toBe('XPHB');
  });
});

// ── _copy resolution ──────────────────────────────────────────────────────────
describe('resolveClassJsonCopies', () => {
  it('fills a copy stub from its target and keeps its own overrides', () => {
    const json = resolveClassJsonCopies({
      subclassFeature: [
        { name: 'Death Domain', source: 'DMG', className: 'Cleric', classSource: 'PHB', subclassShortName: 'Death', subclassSource: 'DMG', level: 1, entries: ['text'] },
        { name: 'Death Domain', source: 'DMG', className: 'Cleric', classSource: 'XPHB', subclassShortName: 'Death', subclassSource: 'DMG', level: 3,
          _copy: { name: 'Death Domain', source: 'DMG', className: 'Cleric', classSource: 'PHB', subclassShortName: 'Death', subclassSource: 'DMG', level: 1 } },
      ],
    });
    const copy = json.subclassFeature![1];
    expect(copy.level).toBe(3);
    expect(copy.classSource).toBe('XPHB');
    expect(copy.entries).toEqual(['text']);
    expect(copy._copy).toBeUndefined();
  });
});

// ── Feature tree ──────────────────────────────────────────────────────────────
describe('buildClassFeatures — 2024 Cleric', () => {
  const json = load('Cleric');

  it('offers Divine Order as a choice at level 1 and does not list both options as features', () => {
    const { features, choices } = buildClassFeatures(json, { className: 'Cleric', classSource: 'XPHB', level: 1 });
    const names = features.map(f => f.name);
    expect(names).toContain('Divine Order');
    expect(names).not.toContain('Protector');
    expect(names).not.toContain('Thaumaturge');
    const order = choices.find(c => c.featureName === 'Divine Order')!;
    expect(order.options.map(o => o.name)).toEqual(['Protector', 'Thaumaturge']);
    expect(order.count).toBe(1);
    expect(pendingChoices(choices).map(c => c.featureName)).toContain('Divine Order');
  });

  it('inlines the chosen option text into the parent feature', () => {
    const first = buildClassFeatures(json, { className: 'Cleric', classSource: 'XPHB', level: 1 });
    const order = first.choices.find(c => c.featureName === 'Divine Order')!;
    const protector = order.options.find(o => o.name === 'Protector')!;
    const { features, choices } = buildClassFeatures(json, {
      className: 'Cleric', classSource: 'XPHB', level: 1, choices: { [order.id]: [protector.id] },
    });
    const divine = features.find(f => f.name === 'Divine Order')!;
    const text = JSON.stringify(divine.entries);
    expect(text).toContain('Protector');
    expect(text).not.toContain('Thaumaturge');
    expect(pendingChoices(choices)).toHaveLength(0);
  });

  it('flattens a 2024 subclass intro into its sub-features', () => {
    const { features } = buildClassFeatures(json, {
      className: 'Cleric', classSource: 'XPHB', level: 3, subclass: { name: 'Life Domain', source: 'XPHB' },
    });
    const names = features.filter(f => f.origin === 'subclass').map(f => f.name);
    expect(names).toEqual(expect.arrayContaining(['Life Domain', 'Disciple of Life', 'Life Domain Spells', 'Preserve Life']));
    // No feature keeps an unresolved reference node.
    expect(JSON.stringify(features)).not.toMatch(/"type":"ref(Class|Subclass)Feature"/);
  });

  it('uses the 2024 levels for a classic subclass taken by the 2024 class', () => {
    const { features } = buildClassFeatures(json, {
      className: 'Cleric', classSource: 'XPHB', level: 3, subclass: { name: 'Death Domain', source: 'DMG' },
    });
    const death = features.filter(f => f.origin === 'subclass');
    expect(death.length).toBeGreaterThan(0);
    expect(death.every(f => f.level <= 3)).toBe(true);
    expect(death.map(f => f.name)).toContain('Death Domain');
  });

  it('does not duplicate 2014 subclass features', () => {
    const { features } = buildClassFeatures(json, {
      className: 'Cleric', classSource: 'PHB', level: 20, subclass: { name: 'Knowledge Domain', source: 'PHB' },
    });
    const names = features.filter(f => f.origin === 'subclass').map(f => f.name);
    expect(names.filter(n => n === 'Knowledge Domain')).toHaveLength(1);
    expect(names.filter(n => n === 'Channel Divinity: Knowledge of the Ages')).toHaveLength(1);
  });
});

describe('buildClassFeatures — other choice features', () => {
  it('2024 Druid offers Primal Order', () => {
    const { choices } = buildClassFeatures(load('Druid'), { className: 'Druid', classSource: 'XPHB', level: 1 });
    expect(choices.find(c => c.featureName === 'Primal Order')?.options.map(o => o.name)).toEqual(['Magician', 'Warden']);
  });
  it('Totem Warrior offers a Totem Spirit', () => {
    const { choices } = buildClassFeatures(load('Barbarian'), {
      className: 'Barbarian', classSource: 'PHB', level: 3, subclass: { name: 'Path of the Totem Warrior', source: 'PHB' },
    });
    expect(choices.some(c => c.featureName === 'Totem Spirit' && c.options.length >= 3)).toBe(true);
  });
});

// ── Feature-name reconciliation ───────────────────────────────────────────────
// The class table's `classFeatures` refs are the authoritative "which feature at which level";
// every one must surface at its level (sub-features referenced from them are extra rows).
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

// The app plays Artificer from TCE in both editions (the EFA 2024 reprint isn't wired up yet).
const CASES = ALL_CLASSES.flatMap(c => [[c, '5e'], [c, '5.5e']] as const)
  .filter(([c, e]) => !(c === 'Artificer' && e === '5.5e'));

describe('feature-name reconciliation (every class-table feature is surfaced at its level)', () => {
  it.each(CASES)('%s (%s)', (cls, edition) => {
    const json = load(cls);
    const entry = pickClassEntry(loadClassJson(cls), edition);
    const refs = refsByLevel(entry);

    for (let level = 1; level <= 20; level++) {
      const appAtLevel = new Set(
        buildClassFeatures(json, { className: entry.name, classSource: entry.source, level }).features
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

describe('subclassOptions', () => {
  const json = load('Cleric');
  const names = (refs: { name: string; source: string }[]) => refs.map(r => `${r.name}|${r.source}`);

  it('2024 Cleric offers only the 2024 Life Domain (not the reprinted PHB one)', () => {
    const opts = names(subclassOptions(json, 'XPHB', '5.5e'));
    expect(opts).toContain('Life Domain|XPHB');
    expect(opts).not.toContain('Life Domain|PHB');
    expect(opts).toContain('Knowledge Domain|FRHoF');
    expect(opts).not.toContain('Knowledge Domain|PHB');
    expect(opts).toContain('Tempest Domain|PHB'); // never reprinted — still offered
    expect(new Set(opts).size).toBe(opts.length);
  });

  it('2014 Cleric offers the PHB domains and no 2024-book ones', () => {
    const opts = names(subclassOptions(json, 'PHB', '5e'));
    expect(opts).toContain('Life Domain|PHB');
    expect(opts).not.toContain('Life Domain|XPHB');
  });
});

describe('subclassReprintFor', () => {
  const json = load('Cleric');
  it('maps a classic subclass on the 2024 class to its reprint', () => {
    expect(subclassReprintFor(json, { name: 'Life Domain', source: 'PHB' }, 'XPHB')).toEqual({ name: 'Life Domain', source: 'XPHB' });
  });
  it('leaves never-reprinted and already-2024 subclasses alone', () => {
    expect(subclassReprintFor(json, { name: 'Tempest Domain', source: 'PHB' }, 'XPHB')).toBeNull();
    expect(subclassReprintFor(json, { name: 'Life Domain', source: 'XPHB' }, 'XPHB')).toBeNull();
  });
});
