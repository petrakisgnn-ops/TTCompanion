import type { Entry, EntryNode, RefId } from './types';

/**
 * Class / subclass feature resolution over a raw class JSON (`public/data/class/class-*.json`).
 *
 * The data model (5etools):
 *  - A class lists the features it gains as uid strings in `classFeatures`
 *    ("Divine Order|Cleric|XPHB|1"); a subclass does the same in `subclassFeatures`.
 *  - The full text lives in the flat `classFeature` / `subclassFeature` arrays.
 *  - A feature's entries can *reference* other features (`refClassFeature` /
 *    `refSubclassFeature`) — either plainly (a subclass's intro feature pulling in its
 *    sub-features) or inside an `options` block, which is a "choose N" (Divine Order →
 *    Protector or Thaumaturge, Totem Spirit → Bear/Eagle/Wolf, …).
 *  - Some records are `_copy` stubs of another record in the same file (a PHB subclass
 *    re-listed for the 2024 class with new levels) and must be resolved before use.
 *
 * Everything here is pure; feed it an already-fetched class JSON.
 */

// ── Raw shapes ───────────────────────────────────────────────────────────────

export type ClassFeatureRef = string | { classFeature: string; gainSubclassFeature?: boolean };

export interface RawClassEntry {
  name: string;
  source: string;
  classFeatures?: ClassFeatureRef[];
  [k: string]: unknown;
}

export interface RawSubclassEntry {
  name: string;
  shortName: string;
  source: string;
  className?: string;
  classSource?: string;
  subclassFeatures?: string[];
  [k: string]: unknown;
}

export interface RawClassFeature {
  name: string;
  source?: string;
  className: string;
  classSource?: string;
  level: number;
  entries?: Entry[];
  isClassFeatureVariant?: boolean;
  [k: string]: unknown;
}

export interface RawSubclassFeature {
  name: string;
  source?: string;
  className?: string;
  classSource?: string;
  subclassShortName?: string;
  subclassSource: string;
  level: number;
  entries?: Entry[];
  isClassFeatureVariant?: boolean;
  [k: string]: unknown;
}

export interface ClassJson {
  class?: RawClassEntry[];
  subclass?: RawSubclassEntry[];
  classFeature?: RawClassFeature[];
  subclassFeature?: RawSubclassFeature[];
}

// ── _copy resolution ─────────────────────────────────────────────────────────

type Rec = Record<string, unknown>;

interface CopyDirective {
  _preserve?: Record<string, boolean>;
  _mod?: Record<string, unknown>;
  [k: string]: unknown;
}

/** Props a `_copy` never inherits from its target unless `_preserve`d (mirrors 5etools). */
const NON_INHERITED = ['page', 'otherSources', 'referenceSources', 'srd', 'srd52', 'basicRules', 'basicRules2024', 'reprintedAs', 'hasFluff', 'hasFluffImages'];

const lc = (v: unknown): string =>
  typeof v === 'string' ? v.toLowerCase() : typeof v === 'number' || typeof v === 'boolean' ? String(v) : '';

function matchesCopyTarget(candidate: Rec, directive: CopyDirective): boolean {
  for (const [k, v] of Object.entries(directive)) {
    if (k.startsWith('_')) continue;
    if (lc(candidate[k]) !== lc(v)) return false;
  }
  return true;
}

function applyArrayMod(arr: unknown[], mod: Rec): unknown[] {
  const items: unknown[] = Array.isArray(mod.items) ? (mod.items as unknown[]) : mod.items != null ? [mod.items] : [];
  switch (mod.mode) {
    case 'appendArr': return [...arr, ...items];
    case 'prependArr': return [...items, ...arr];
    case 'insertArr': {
      const i = typeof mod.index === 'number' ? mod.index : arr.length;
      return [...arr.slice(0, i), ...items, ...arr.slice(i)];
    }
    case 'replaceArr': {
      const replace = mod.replace as { index?: number } | string | undefined;
      const idx = typeof replace === 'object' && replace && typeof replace.index === 'number'
        ? replace.index
        : arr.findIndex(x => typeof x === 'string' ? x === replace : (x as Rec)?.name === replace);
      if (idx < 0) return arr;
      return [...arr.slice(0, idx), ...items, ...arr.slice(idx + 1)];
    }
    case 'removeArr': {
      const names: unknown[] = Array.isArray(mod.names) ? (mod.names as unknown[]) : [mod.names];
      return arr.filter(x => !names.includes(typeof x === 'string' ? x : (x as Rec)?.name));
    }
    default: return arr; // unsupported mode — keep the target's array as-is
  }
}

function resolveList<T extends object>(list: T[] | undefined): T[] | undefined {
  if (!list) return list;
  const done = new Map<T, T>();

  const resolve = (rec: T, depth: number): T => {
    const cached = done.get(rec);
    if (cached) return cached;
    const directive = (rec as Rec)._copy as CopyDirective | undefined;
    if (!directive || depth > 8) { done.set(rec, rec); return rec; }

    const target = list.find(c => c !== rec && matchesCopyTarget(c as Rec, directive));
    if (!target) {
      const { _copy: _ignored, ...rest } = rec as Rec;
      void _ignored;
      done.set(rec, rest as T);
      return rest as T;
    }
    const base = { ...(resolve(target, depth + 1) as Rec) };
    for (const k of NON_INHERITED) if (!directive._preserve?.[k] && !directive._preserve?.['*']) delete base[k];

    const { _copy: _drop, ...own } = rec as Rec;
    void _drop;
    const merged: Rec = { ...base, ...own };
    for (const [prop, modRaw] of Object.entries(directive._mod ?? {})) {
      const mods = Array.isArray(modRaw) ? modRaw : [modRaw];
      let value = Array.isArray(merged[prop]) ? (merged[prop] as unknown[]) : [];
      for (const m of mods) if (m && typeof m === 'object') value = applyArrayMod(value, m as Rec);
      merged[prop] = value;
    }
    done.set(rec, merged as T);
    return merged as T;
  };

  return list.map(r => resolve(r, 0));
}

/** Returns the class JSON with every same-file `_copy` record replaced by its resolved form. */
export function resolveClassJsonCopies(json: ClassJson): ClassJson {
  return {
    ...json,
    class: resolveList(json.class),
    subclass: resolveList(json.subclass),
    classFeature: resolveList(json.classFeature),
    subclassFeature: resolveList(json.subclassFeature),
  };
}

// ── UIDs ─────────────────────────────────────────────────────────────────────

export interface ClassFeatureUid {
  name: string; className: string; classSource: string; level: number; source: string;
}

export interface SubclassFeatureUid extends ClassFeatureUid {
  subclassShortName: string; subclassSource: string;
}

/** "Name|Class|ClassSource|Level|Source" — empty classSource = PHB, empty source = classSource. */
export function parseClassFeatureUid(uid: string): ClassFeatureUid {
  const [name = '', className = '', cs = '', lvl = '', src = ''] = uid.split('|');
  const classSource = cs || 'PHB';
  return { name, className, classSource, level: Number(lvl) || 0, source: src || classSource };
}

/** "Name|Class|ClassSource|SubShort|SubSource|Level|Source" — empty sources default to PHB / subclassSource. */
export function parseSubclassFeatureUid(uid: string): SubclassFeatureUid {
  const [name = '', className = '', cs = '', short = '', ss = '', lvl = '', src = ''] = uid.split('|');
  const classSource = cs || 'PHB';
  const subclassSource = ss || 'PHB';
  return {
    name, className, classSource, subclassShortName: short, subclassSource,
    level: Number(lvl) || 0, source: src || subclassSource,
  };
}

const eq = (a: string | undefined, b: string | undefined) => (a ?? '').toLowerCase() === (b ?? '').toLowerCase();

function findClassFeature(json: ClassJson, uid: ClassFeatureUid): RawClassFeature | undefined {
  const pool = (json.classFeature ?? []).filter(f =>
    eq(f.name, uid.name) && eq(f.className, uid.className) && eq(f.classSource ?? 'PHB', uid.classSource));
  return pool.find(f => f.level === uid.level && eq(f.source ?? uid.classSource, uid.source))
    ?? pool.find(f => f.level === uid.level)
    ?? pool[0];
}

function findSubclassFeature(json: ClassJson, uid: SubclassFeatureUid): RawSubclassFeature | undefined {
  const pool = (json.subclassFeature ?? []).filter(f =>
    eq(f.name, uid.name) &&
    eq(f.subclassShortName, uid.subclassShortName) &&
    eq(f.subclassSource, uid.subclassSource) &&
    eq(f.classSource ?? 'PHB', uid.classSource));
  return pool.find(f => f.level === uid.level && eq(f.source ?? uid.subclassSource, uid.source))
    ?? pool.find(f => f.level === uid.level)
    ?? pool[0];
}

/** Stable, case-insensitive id for a feature record (used as a choice id / option id). */
function classFeatureId(f: RawClassFeature): string {
  return [f.name, f.className, f.classSource ?? 'PHB', f.level, f.source ?? f.classSource ?? 'PHB'].join('|').toLowerCase();
}
function subclassFeatureId(f: RawSubclassFeature): string {
  return [f.name, f.className ?? '', f.classSource ?? 'PHB', f.subclassShortName ?? '', f.subclassSource, f.level, f.source ?? f.subclassSource]
    .join('|').toLowerCase();
}

// ── Built output ─────────────────────────────────────────────────────────────

export interface LeveledFeature {
  name: string;
  level: number;
  entries: Entry[];
}

export interface BuiltFeature extends LeveledFeature {
  /** Stable id of the record this row came from. */
  id: string;
  origin: 'class' | 'subclass';
  /** An optional/variant class feature (e.g. TCE's Blessed Strikes) — the player may use it instead of another. */
  optional?: boolean;
}

export interface FeatureChoiceOption {
  /** Option id — store this in `Character.featureChoices[choice.id]`. */
  id: string;
  name: string;
  entries: Entry[];
}

/** A "choose N of these features" point (Divine Order, Primal Order, Totem Spirit, …). */
export interface FeatureChoice {
  id: string;
  /** The feature that offers the choice, e.g. "Divine Order". */
  featureName: string;
  className: string;
  level: number;
  count: number;
  options: FeatureChoiceOption[];
  /** Currently chosen option ids (valid ones only). */
  chosen: string[];
}

export interface BuildFeaturesArgs {
  className: string;
  classSource: string;
  subclass?: RefId;
  level: number;
  /** Character.featureChoices — choice id → chosen option ids. */
  choices?: Record<string, string[]>;
}

export interface BuiltClassFeatures {
  features: BuiltFeature[];
  choices: FeatureChoice[];
}

const isRefNode = (e: Entry): boolean =>
  typeof e === 'object' && (e.type === 'refClassFeature' || e.type === 'refSubclassFeature');

/** Picks the class entry matching name + source, falling back to the first with the name. */
export function findClassEntry(json: ClassJson, className: string, classSource: string): RawClassEntry | undefined {
  const all = json.class ?? [];
  return all.find(c => eq(c.name, className) && eq(c.source, classSource)) ?? all.find(c => eq(c.name, className));
}

/** Picks the subclass record for a chosen subclass *under this class version* (a PHB subclass is re-listed for the XPHB class with new levels). */
export function findSubclassEntry(json: ClassJson, subclass: RefId, classSource: string): RawSubclassEntry | undefined {
  const all = (json.subclass ?? []).filter(s => eq(s.name, subclass.name) && eq(s.source, subclass.source));
  return all.find(s => eq(s.classSource ?? 'PHB', classSource)) ?? all[0];
}

/**
 * Every feature a class (+ chosen subclass) has gained by `level`, in table order, with nested
 * feature references flattened into their own rows and "choose N" option blocks resolved
 * against `choices` (unchosen → every option is shown inline, with a prompt). Also returns
 * the choice points reached so the UI can ask the player.
 */
export function buildClassFeatures(json: ClassJson, args: BuildFeaturesArgs): BuiltClassFeatures {
  const { level, choices = {} } = args;
  const features: BuiltFeature[] = [];
  const choicePoints: FeatureChoice[] = [];
  const visited = new Set<string>();

  type AnyRec = { kind: 'class'; rec: RawClassFeature } | { kind: 'subclass'; rec: RawSubclassFeature };

  const resolveRef = (node: EntryNode): AnyRec | undefined => {
    if (node.type === 'refClassFeature' && typeof node.classFeature === 'string') {
      const rec = findClassFeature(json, parseClassFeatureUid(node.classFeature));
      return rec && { kind: 'class', rec };
    }
    if (node.type === 'refSubclassFeature' && typeof node.subclassFeature === 'string') {
      const rec = findSubclassFeature(json, parseSubclassFeatureUid(node.subclassFeature));
      return rec && { kind: 'subclass', rec };
    }
    return undefined;
  };
  const idOf = (r: AnyRec) => (r.kind === 'class' ? classFeatureId(r.rec) : subclassFeatureId(r.rec));

  /**
   * Rewrites an entries array: plain refs are pulled out into `nested` (become their own rows),
   * `options` blocks of feature refs become choice points, other refs degrade to inline tags.
   * `inline` = inside an option body — nested refs are inlined as sub-sections instead of rows.
   */
  const rewrite = (entries: Entry[], owner: { id: string; name: string; level: number }, nested: BuiltFeature[], inline: boolean, counter: { n: number }): Entry[] => {
    const out: Entry[] = [];
    for (const e of entries) {
      if (typeof e === 'string') { out.push(e); continue; }

      if (isRefNode(e)) {
        const r = resolveRef(e);
        if (!r || r.rec.level > level) continue;
        if (inline) {
          out.push({ type: 'entries', name: r.rec.name, entries: rewrite(r.rec.entries ?? [], owner, nested, true, counter) });
        } else {
          nested.push(...expand(r));
        }
        continue;
      }

      if (e.type === 'refOptionalfeature' && typeof e.optionalfeature === 'string') {
        const [name, source] = e.optionalfeature.split('|');
        out.push(`{@optfeature ${name}${source ? `|${source}` : ''}}`);
        continue;
      }
      if (e.type === 'refFeat' && typeof e.feat === 'string') {
        out.push(`{@feat ${e.feat}}`);
        continue;
      }

      if (e.type === 'options' && Array.isArray(e.entries) && e.entries.some(isRefNode)) {
        const resolved = (e.entries.filter(isRefNode) as EntryNode[]).map(resolveRef).filter((r): r is AnyRec => !!r);
        const others = e.entries.filter(x => !isRefNode(x));
        const choiceId = counter.n === 0 ? owner.id : `${owner.id}#${counter.n}`;
        counter.n++;
        const count = typeof e.count === 'number' ? e.count : 1;
        const options: FeatureChoiceOption[] = resolved.map(r => ({
          id: idOf(r),
          name: r.rec.name,
          entries: rewrite(r.rec.entries ?? [], owner, nested, true, { n: 0 }),
        }));
        const chosen = (choices[choiceId] ?? []).filter(id => options.some(o => o.id === id));
        choicePoints.push({
          id: choiceId, featureName: owner.name, className: args.className,
          level: owner.level, count, options, chosen,
        });
        const shown = chosen.length > 0 ? options.filter(o => chosen.includes(o.id)) : options;
        if (chosen.length === 0) {
          out.push(`{@i Not chosen yet — choose ${count} of the following in Feature Choices.}`);
        }
        for (const o of shown) out.push({ type: 'entries', name: o.name, entries: o.entries });
        out.push(...rewrite(others, owner, nested, inline, counter));
        continue;
      }

      // Any other block: rewrite its children in place.
      const copy: EntryNode = { ...e };
      if (Array.isArray(e.entries)) copy.entries = rewrite(e.entries, owner, nested, inline, counter);
      if (Array.isArray(e.items)) copy.items = rewrite(e.items, owner, nested, inline, counter);
      out.push(copy);
    }
    return out;
  };

  const expand = (r: AnyRec): BuiltFeature[] => {
    const id = idOf(r);
    if (visited.has(id)) return [];
    visited.add(id);
    const nested: BuiltFeature[] = [];
    const owner = { id, name: r.rec.name, level: r.rec.level };
    const entries = rewrite(r.rec.entries ?? [], owner, nested, false, { n: 0 });
    const self: BuiltFeature = {
      id, name: r.rec.name, level: r.rec.level, entries, origin: r.kind,
      ...(r.rec.isClassFeatureVariant ? { optional: true } : {}),
    };
    return [self, ...nested];
  };

  // Class table features
  const cls = findClassEntry(json, args.className, args.classSource);
  for (const ref of cls?.classFeatures ?? []) {
    const uidStr = typeof ref === 'string' ? ref : ref.classFeature;
    const uid = parseClassFeatureUid(uidStr);
    if (uid.level > level) continue;
    const rec = findClassFeature(json, uid);
    if (rec) features.push(...expand({ kind: 'class', rec }));
  }

  // Subclass features
  if (args.subclass) {
    const sub = findSubclassEntry(json, args.subclass, cls?.source ?? args.classSource);
    for (const uidStr of sub?.subclassFeatures ?? []) {
      const uid = parseSubclassFeatureUid(uidStr);
      if (uid.level > level) continue;
      const rec = findSubclassFeature(json, uid);
      if (rec) features.push(...expand({ kind: 'subclass', rec }));
    }
  }

  // Stable sort keeps a parent ahead of its same-level sub-features.
  const ordered = features.map((f, i) => ({ f, i })).sort((a, b) => a.f.level - b.f.level || a.i - b.i).map(x => x.f);
  return { features: ordered, choices: choicePoints };
}

/** Choice points that still need a pick. */
export function pendingChoices(choices: FeatureChoice[]): FeatureChoice[] {
  return choices.filter(c => c.chosen.length < Math.min(c.count, c.options.length));
}

// ── Subclass options ─────────────────────────────────────────────────────────

const SOURCES_2024 = new Set(['XPHB', 'XDMG', 'XMM']);
const isReprinted = (s: RawSubclassEntry) =>
  Array.isArray(s.reprintedAs) && s.reprintedAs.some(r => typeof r === 'string');

/**
 * The subclasses a class version offers, deduped by name + source. Expects a copy-resolved
 * class JSON (`resolveClassJsonCopies`). The file lists each classic subclass twice — once for
 * the 2014 class and once (a copy) for the 2024 class — so only the entries for `classSource`
 * count. For 2024 a subclass that was reprinted (Life Domain PHB → XPHB, Knowledge Domain
 * PHB → FRHoF) is hidden in favour of its reprint; for 2014 the 2024-book subclasses are hidden.
 */
export function subclassOptions(json: ClassJson, classSource: string, edition: '5e' | '5.5e'): RefId[] {
  const seen = new Set<string>();
  const out: RefId[] = [];
  for (const s of json.subclass ?? []) {
    if (!eq(s.classSource ?? 'PHB', classSource)) continue;
    if (edition === '5.5e' ? isReprinted(s) : SOURCES_2024.has(s.source)) continue;
    const key = `${s.name}|${s.source}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ name: s.name, source: s.source });
  }
  return out;
}

/**
 * When a 2024 character holds a classic subclass that has a reprint for its class version
 * (e.g. Life Domain|PHB on the 2024 Cleric), the reprint to use instead; otherwise null.
 * `reprintedAs` uids are "ShortName|Class|ClassSource|SubclassSource".
 */
export function subclassReprintFor(json: ClassJson, subclass: RefId, classSource: string): RefId | null {
  const entry = findSubclassEntry(json, subclass, classSource);
  const uid = (entry?.reprintedAs as unknown[] | undefined)?.find((r): r is string => typeof r === 'string');
  if (!uid) return null;
  const [shortName, , cs = 'PHB', src = 'PHB'] = uid.split('|');
  const target = (json.subclass ?? []).find(s =>
    eq(s.shortName, shortName) && eq(s.source, src) && eq(s.classSource ?? 'PHB', cs) && !isReprinted(s));
  if (!target || !eq(target.classSource ?? 'PHB', classSource)) return null;
  return { name: target.name, source: target.source };
}
