/**
 * Test-only loader for the reference class JSON (`public/data/class/class-*.json`).
 * Used by the class-progression reconciliation suite to cross-check the app's hardcoded
 * tables against the authoritative 5etools data. NOT imported by app code — it reads from
 * disk via node:fs and would not work in the browser.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import type { OptionalFeatureProgressionRow } from '../optionalFeatures';

const HERE = dirname(fileURLToPath(import.meta.url));
// __fixtures__ → rules → domain → src → repo root, then into public/data/class.
const CLASS_DIR = resolve(HERE, '../../../../public/data/class');

export interface RawTableGroup {
  title?: string;
  colLabels?: string[];
  rows?: unknown[][];
  rowsSpellProgression?: number[][];
}

export interface RawClassEntry {
  name: string;
  source: string;
  edition?: string;
  hd?: { faces?: number };
  classTableGroups?: RawTableGroup[];
  /** Feature refs, e.g. "Rage|Barbarian||1" (or an object wrapping that string). */
  classFeatures?: (string | { classFeature: string })[];
  optionalfeatureProgression?: OptionalFeatureProgressionRow[];
}

export interface RawClassFeature {
  name: string;
  className: string;
  classSource?: string;
  source: string;
  level: number;
}

export interface ClassJson {
  class: RawClassEntry[];
  classFeature?: RawClassFeature[];
  subclass?: { name: string; source: string; shortName?: string }[];
}

const cache = new Map<string, ClassJson>();

/** Reads and memoizes one class file by class name (e.g. "Barbarian" → class-barbarian.json). */
export function loadClassJson(className: string): ClassJson {
  const key = className.toLowerCase();
  let json = cache.get(key);
  if (!json) {
    // These files are saved with a UTF-8 BOM, which JSON.parse rejects — strip it.
    let raw = readFileSync(resolve(CLASS_DIR, `class-${key}.json`), 'utf-8');
    if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
    json = JSON.parse(raw) as ClassJson;
    cache.set(key, json);
  }
  return json;
}

/** Picks the class entry for an edition the same way ClassesPage/StepClass do. */
export function pickClassEntry(json: ClassJson, edition: '5e' | '5.5e' = '5e'): RawClassEntry {
  const arr = json.class;
  if (edition === '5.5e') {
    return arr.find(c => c.edition === 'one') ?? arr.find(c => c.edition !== 'classic') ?? arr[0];
  }
  return arr.find(c => c.edition === 'classic' || !c.edition) ?? arr[0];
}
