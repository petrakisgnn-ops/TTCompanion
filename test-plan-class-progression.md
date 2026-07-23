# Class Progression Test Plan (Levels 1–20)

Status: **PLAN — not yet implemented.** This document describes a testing system that
verifies every class is rewarded correctly at each level (1–20) per the 2014 PHB rules and
the reference data. Implement in the phases at the end.

---

## 1. Goal

For **every class × every level 1–20**, assert that the values the app derives match the
rules. "Rewarded correctly" means the per-level:

- **Proficiency bonus**
- **Hit points** (hit die, max-HP formula)
- **ASI / feat levels** (which levels grant one, and how many by a given level)
- **Subclass timing** (the level a subclass is chosen, and that subclass features gate to reached levels)
- **Spell slots** (full / half / third / pact / artificer progressions)
- **Cantrips known** and **spells known / prepared** counts
- **Class resource pools** (Rage, Ki, Sorcery Points, Channel Divinity, Bardic Inspiration,
  Wild Shape, Second Wind / Action Surge / Indomitable, Lay on Hands, Arcane Recovery)
- **Optional-feature counts** (Fighting Styles, Eldritch Invocations, Metamagic, Battle
  Master Maneuvers, Artificer Infusions, Elemental Disciplines)
- **Class features unlocked** (the named features gained at each level)

The system should be **low-maintenance**: prefer cross-checking the app's derived values
against the reference JSON (the authoritative table data) over hand-typing a giant
expected-values matrix that could itself be wrong.

---

## 2. Scope

**In scope (first delivery):**
- The 13 supported classes in `CLASSES` (`src/domain/rules/classData.ts`): Artificer,
  Barbarian, Bard, Cleric, Druid, Fighter, Monk, Paladin, Ranger, Rogue, Sorcerer,
  Warlock, Wizard.
- **5e (2014 PHB)** edition only for the first pass. 5.5e/XPHB is a follow-up (§9).
- Single-class progression 1–20 (multiclass slot pooling is separately covered by the
  existing `resources.test.ts` / `spellcasting.test.ts`; extend later — §10).

**Out of scope (tracked as explicit gaps, §10):**
- Subclass-specific resource pools the app doesn't model (e.g. a specific domain's extra
  Channel Divinity options), armor/AC, Martial Arts die, Sneak Attack dice, and other
  values the app never computes. Tests must not assert on things the app deliberately
  doesn't track; they assert on what the app *claims* to derive.

---

## 3. Strategy overview — three layers

| Layer | What it proves | Speed | Source of truth |
|------|----------------|-------|-----------------|
| **A. Golden table tests** | The app's pure derivations are self-consistent & match hand-verified anchor values | Fast (pure TS) | The PHB (hand-encoded anchors) |
| **B. Data reconciliation** | The app's hardcoded tables agree with the reference class JSON | Fast (parses `public/data/class/*.json`) | 5etools class JSON (`classTableGroups`, `classFeatures`) |
| **C. Level-up integration** | Simulating 1→20 through the real level-up path lands on the right cumulative state | Medium | Layers A+B |

Layer B is the high-value, low-maintenance core: the class JSON already contains the
per-level columns (Rages, Ki, Sorcery Points, cantrips known, spells known, spell slots) and
the per-level feature list. Reconciling the app's tables against it catches drift without a
human re-typing every number.

---

## 4. The "reward snapshot" — the unit under test

Define one normalized shape that captures everything the app derives for a class at a level.
Tests build it and compare against expected. Proposed (pure, no React):

```ts
// src/domain/rules/progression.ts  (NEW — see §7)
export interface RewardSnapshot {
  level: number;
  proficiencyBonus: number;
  maxHpAtConMod0: number;                 // maxHp(hitDie, level, 0) — CON-independent anchor
  asiThisLevel: boolean;                  // isAsiLevel(class, level)
  asiCountUpTo: number;                   // asiLevelsUpTo(class, level).length
  picksSubclassBy: boolean;               // level >= subclassLevel(class)
  spellSlots: number[];                   // index 0 = 1st-level slots … (from computeSpellSlots)
  pactSlots: { count: number; level: number } | null;
  cantripsKnown: number | null;           // classData.cantripsKnown?.[level-1]
  spellsKnown: number | null;             // classData.spellsKnownTable?.[level-1]
  resources: Record<string, number>;      // { rage: 3, ... } from computeClassResources
  optionalFeatureSlots: Record<string, number>; // { 'Eldritch Invocations': 5, ... }
  featureNames: string[];                 // features gained at exactly this level
}

export function rewardSnapshot(
  className: string,
  level: number,
  opts?: { subclass?: RefId; abilityScores?: AbilityScores },
): RewardSnapshot;
```

`rewardSnapshot` is a thin aggregator over existing pure functions:
`proficiencyBonus`, `maxHp`, `isAsiLevel`, `asiLevelsUpTo`, `subclassLevel`,
`computeSpellSlots`, `getClassData().cantripsKnown/spellsKnownTable`,
`computeClassResources`, `optionalFeatureSlots`, and a **new pure feature-extraction
function** (§7).

Using standard ability scores (e.g. all 10 → CON mod 0) makes HP and resource anchors
deterministic; parameterize `abilityScores` only where a resource depends on a modifier
(Bardic Inspiration = CHA mod).

---

## 5. Sources of truth & reconciliation

Two encodings of the same rules exist in the repo:

1. **App tables** — `classData.ts` (`CLASSES`, `cantripsKnown`, `spellsKnownTable`,
   `ASI_LEVELS`, `SUBCLASS_LEVEL`, `SUBCLASS_CASTERS`), `spellSlots.ts` (`FULL/HALF/
   ARTIFICER/THIRD/PACT_*`), `classResources.ts` (`RAGE_USES`, threshold tables).
2. **Reference JSON** — `public/data/class/class-*.json`:
   - `class[].classTableGroups[]` → `{ colLabels, rows }` (per-level number columns) and
     `{ title, rowsSpellProgression }` (per-level slot arrays).
   - `class[].classFeatures[]` → `"Name|Class|Source|Level"` strings (which feature at which level).
   - `classFeature[]` → full feature entries.

**Reconciliation tests** parse (2) and assert (1) matches. Column-name → app-value mapping
(to build a per-class extractor):

| Class | JSON column / group | App value |
|-------|---------------------|-----------|
| Barbarian | "Rages" | `computeClassResources('Barbarian', L).rage` (note: L20 = "Unlimited" → app omits; assert omission) |
| Barbarian | "Rage Damage" | *not modeled* → xfail/skip (§10) |
| Bard | "Cantrips Known" | `classData.cantripsKnown[L-1]` |
| Bard | "Spells Known" | `classData.spellsKnownTable[L-1]` |
| Bard/Cleric/Druid/Sorcerer/Wizard | Spell-slot progression group | `computeSpellSlots('full', L)` |
| Cleric | "Channel Divinity" (from features) | `computeClassResources('Cleric', L)['channel-divinity']` |
| Monk | "Ki Points" | `computeClassResources('Monk', L).ki` |
| Monk | "Martial Arts", "Unarmored Movement" | *not modeled* → skip |
| Sorcerer | "Sorcery Points" | `computeClassResources('Sorcerer', L)['sorcery-points']` |
| Warlock | "Cantrips/Spells Known", "Spell Slots", "Slot Level", "Invocations Known" | `cantripsKnown`, `spellsKnownTable`, `computeSpellSlots('pact', L)`, `optionalFeatureSlots` |
| Paladin/Ranger | Spell-slot progression group | `computeSpellSlots('half', L)` |
| Artificer | "Cantrips Known", spell-slot group, "Infused Items" | `cantripsKnown`, `computeSpellSlots('artificer', L)`, `optionalFeatureSlots` |
| Ranger | "Spells Known" | `classData.spellsKnownTable[L-1]` |
| Fighter | "Second Wind"/features | `computeClassResources('Fighter', L)` (second-wind/action-surge/indomitable) |

Where the app deliberately doesn't model a column (Rage Damage, Martial Arts die, Sneak
Attack, Unarmored Movement, Ki-fueled DC, etc.), the reconciliation extractor lists it as a
**known-unmodeled column** and the test skips it (never silently passes) — see §10.

---

## 6. Test layers in detail

### Layer A — Golden table tests (`progression.golden.test.ts`)
- Iterate `class × level (1..20)`, build `rewardSnapshot`, assert against a small set of
  **hand-verified PHB anchors** per class (not all 20 values — the reconciliation layer
  covers the full column). Anchors to hard-code, e.g.:
  - Proficiency bonus: +2 @1–4, +3 @5–8, +4 @9–12, +5 @13–16, +6 @17–20 (all classes).
  - Wizard slots @5 = `[4,3,2]`; @11 gains 6th; @17 gains 9th; @20 = `[4,3,3,3,3,2,2,1,1]`.
  - Warlock pact @1 = 1×1st, @11 = 3 slots @5th, @17 = 4 slots @5th.
  - Paladin (single-class) @5 = `[4,2]` (own table, not the pooled math).
  - Barbarian rage: 2 @1, 3 @3, 4 @6, 5 @12, 6 @17, **omitted @20**.
  - Monk ki = level from @2; Sorcerer sorcery points = level from @2.
  - Fighter action surge: 1 @2, 2 @17; indomitable 1 @9, 2 @13, 3 @17.
  - Cleric channel divinity: 1 @2, 2 @6, 3 @18. Paladin CD: 1 @3 (never scales).
  - ASI levels: default {4,8,12,16,19}; Fighter {4,6,8,12,14,16,19}; Rogue {4,8,10,12,16,19}.
  - Subclass level: Cleric/Sorcerer/Warlock @1, Wizard/Druid @2, else @3.
- Assert **monotonicity invariants** across all classes/levels (cheap, catches typos):
  proficiency bonus non-decreasing; spell-slot totals non-decreasing; resource pools
  non-decreasing except where a rule removes them (Barbarian rage @20).

### Layer B — Data reconciliation (`progression.reconcile.test.ts`)
- Load each `class-*.json` (Node `fs`/`import`; the files live in `public/data/class/`).
- Build a per-class **column extractor** that pulls numeric columns out of
  `classTableGroups` (handle both `rows` cell shapes: plain numbers, `{roll}`, dice strings,
  and `{@filter ...}`/`{@feat ...}` markup cells → parse the leading integer or mark "not
  numeric"). Extract the spell-slot group from `rowsSpellProgression`.
- For each level 1–20, assert the app value equals the JSON value for every **mapped**
  column; **skip (with an explicit `it.skip`/allowlist) the known-unmodeled columns.**
- Parse `class[].classFeatures[]` (`"Name|Class|Source|Level"`) into a level→names map and
  assert `rewardSnapshot(...).featureNames` equals the JSON's feature names at that level
  (filtered to the active source, excluding "optional/TCE" reprints unless in scope).

### Layer C — Level-up integration (`progression.levelup.test.ts`)
- Start a synthetic level-1 character (via the same construction the wizard uses) and drive
  `recomputeAllResources` (and the store's `levelUp` reducer if feasible headlessly) once per
  level to 20.
- After each step assert the cumulative resource state matches `rewardSnapshot` for that
  level, and that **spent-resource preservation** works (spend a resource, level up, confirm
  the newly-gained amount is added without refilling spent ones — the documented behavior in
  `recomputeAllResources`).
- This is the only layer that exercises the *reducer*, catching bugs the pure snapshot can't
  (e.g. resource-id churn, stale tracks).

---

## 7. Required refactors to make this testable

1. **Extract feature derivation from the hook.** `useCharacterFeatures` (React + `fetch`)
   currently owns per-level feature gating. Extract a **pure** function, e.g.
   `classFeaturesUpTo(classJson, className, source, level): FeatureRow[]` in
   `src/domain/reference/features.ts` (or a new `classFeatures.ts`), and have the hook call
   it. Tests then feed it loaded JSON with no React/fetch.
2. **Add `rewardSnapshot` / `progression.ts`** (§4) as the single aggregation point.
3. **Add a class-JSON loader for tests** — a tiny helper that reads
   `public/data/class/class-<name>.json` from disk (Vitest runs in Node; use
   `fs.readFileSync` + `JSON.parse` or a path import). Memoize per file.
4. **Add a column-extractor** util that turns `classTableGroups` into
   `{ [colLabel]: number[] }` and the spell group into `number[][]`, with a documented list
   of cells it can't parse (so they surface, not vanish).

None of these change runtime behavior; they only expose pure seams.

---

## 8. Per-class checklist

Each class's reconciliation extractor + golden anchors must cover the columns/resources it
actually has:

| Class | Cast | Subclass @ | Resources (modeled) | Optional-feature groups | Notable JSON columns to reconcile |
|-------|------|-----------|---------------------|-------------------------|-----------------------------------|
| Artificer | artificer | 3 | — | Infusions | Cantrips, slots, Infused Items |
| Barbarian | none | 3 | rage | — | Rages (Rage Damage = skip) |
| Bard | full | 3 | bardic-inspiration | — (Magical Secrets = data) | Cantrips, Spells Known, slots |
| Cleric | full | **1** | channel-divinity | — | Cantrips, slots, Channel Divinity |
| Druid | full | **2** | wild-shape | — | Cantrips, slots (Wild Shape = features) |
| Fighter | none (EK = 1/3) | 3 | second-wind, action-surge, indomitable | Fighting Style, Maneuvers (BM) | — (EK slots via THIRD) |
| Monk | none | 3 | ki | Elemental Disciplines (Four Elements) | Ki Points (Martial Arts/UM = skip) |
| Paladin | half | 3 | lay-on-hands, channel-divinity | Fighting Style | Slots (own half table) |
| Ranger | half | 3 | — | Fighting Style | Spells Known, slots |
| Rogue | none (AT = 1/3) | 3 | — | — | — (Sneak Attack = skip; AT slots via THIRD) |
| Sorcerer | full | **1** | sorcery-points | Metamagic | Cantrips, Spells Known, slots, Sorcery Points |
| Warlock | pact | **1** | — | Eldritch Invocations | Cantrips/Spells Known, pact slots, Slot Level, Invocations |
| Wizard | full | **2** | arcane-recovery | — | Cantrips, slots |

---

## 9. Editions

- **Pass 1:** 5e / PHB. Select the PHB class entry (`edition === 'classic' || !edition`) and
  filter features/subclasses to non-XPHB sources, mirroring `ClassesPage`/`StepClass`.
- **Pass 2:** 5.5e / XPHB. The XPHB class entries have different tables (e.g. Weapon Mastery,
  changed Channel Divinity/Rage counts, Warlock as a Pact-of-slots→spell-slots change). Add
  parallel golden anchors and reconcile against the XPHB `classTableGroups`. Gate by the
  `edition` setting the same way the app does. **Do not** mix editions in one snapshot.

---

## 10. Known unmodeled areas (assert-skip, never silent-pass)

Maintain an explicit allowlist so these are visible, not forgotten:

- Rage Damage, Martial Arts die, Unarmored Movement, Sneak Attack dice, Ki save DC,
  Brutal Critical dice — **the app does not compute these** (no field on `Character`).
- Subclass-specific resource pools and features beyond spell grants + optional-feature
  progressions (e.g. per-domain Channel Divinity effects) — features render as text only.
- AC / Unarmored Defense (Barbarian/Monk) — app uses base `10 + DEX` everywhere (see the
  AC follow-up note in the sheet). Out of scope for progression tests.
- Multiclass 1–20 sweeps — covered piecemeal by `resources.test.ts`; a full multiclass
  matrix is a later extension.

Any column the extractor encounters that is **neither mapped nor on the skip allowlist** must
**fail** the test ("unrecognized class-table column X") so new data can't slip through
untested.

---

## 11. File layout

```
src/domain/rules/
  progression.ts                 # NEW: rewardSnapshot + RewardSnapshot
  progression.golden.test.ts     # Layer A
  progression.reconcile.test.ts  # Layer B
  progression.levelup.test.ts    # Layer C
  __fixtures__/
    classJson.ts                 # test-only loader for public/data/class/*.json
    classTable.ts                # classTableGroups → columns extractor + skip allowlist
src/domain/reference/
  classFeatures.ts               # NEW (or extend features.ts): pure classFeaturesUpTo(...)
```

Keep everything under `domain/` (pure, no React/fetch) so tests stay fast and headless.

---

## 12. Implementation phases

1. ✅ **Phase 1 — Harness & Layer A (DONE).** `progression.ts` (`rewardSnapshot`,
   `progression`, `RewardSnapshot`) aggregates the pure functions; `progression.golden.test.ts`
   holds hand-verified anchors + monotonicity invariants for all 13 classes (69 tests, green).
2. ✅ **Phase 2 — Extractors (DONE).** `__fixtures__/classJson.ts` (BOM-tolerant disk loader
   + `pickClassEntry`) and `__fixtures__/classTable.ts` (`extractClassTable` →
   `{ columns: Record<string,(number|null)[]>, nonNumericColumns, spellSlots }`, plus
   `parseCell`/`parseLabel` and the `UNMODELED_COLUMNS` skip-allowlist).
   `progression.extract.test.ts` covers Barbarian/Wizard/Warlock/Monk (12 tests, green).
   Note: `tsconfig.app.json` `types` gained `"node"` so `tsc -b` accepts the fixtures' `node:` imports.
3. ✅ **Phase 3 — Layer B reconciliation (DONE).** `progression.reconcile.test.ts` cross-checks
   every mapped column + the spell-slot matrix for all 13 classes × levels 1–20, with a
   coverage guard that fails on any unrecognized column (39 tests, green). **Result: zero
   discrepancies** — the app's `classData`/`spellSlots`/`classResources` tables match the
   reference JSON exactly. Deferred columns (Invocations/Infusions/Infused Items) are skipped
   with reason pending Phase 4.
4. ✅ **Phase 4 — Feature refactor + feature reconciliation (DONE).** Extracted pure
   `classFeaturesUpTo` / `subclassFeaturesUpTo` into `src/domain/reference/classFeatures.ts`
   and pointed `useCharacterFeatures` at them. `progression.features.test.ts` (58 tests incl.
   Phase 3): pure-filter unit tests, per-level **feature-name reconciliation** for all 13
   classes (rule: every class-table `classFeatures` ref is surfaced at its level — the app is a
   controlled *superset* because it also shows named sub-features like Monk Flurry of Blows /
   Cleric Turn Undead), and **optional-feature-count** reconciliation (Warlock Invocations,
   Artificer Infusions) against `optionalFeatureSlots`. All green — the app never drops a
   class-table feature. "Infused Items" reclassified as unmodeled (attunement count).
5. ✅ **Phase 5 — Layer C level-up integration (DONE).** `progression.levelup.test.ts` (16
   tests) drives `recomputeAllResources` — the exact call the store's `levelUp` reducer uses —
   1→20 with resources carried forward, asserting every class's resource maxes match the
   snapshot at each level (and every pool full when nothing is spent). Spent-preservation cases
   (Barbarian rage, Wizard 3rd-level slot) confirm only the newly-gained amount is added, and
   Barbarian's rage pool correctly disappears at level 20. All green.
6. ⛔ **Phase 6 — 5.5e / XPHB (BLOCKED — feature gap, not a test gap).** Investigation
   (Phase 5 wrap-up) found the app's **progression rules have no edition branching**:
   `classData.ts`, `spellSlots.ts`, `classResources.ts`, and `progression.ts` are 2014-only —
   the `edition` setting affects only character-creation inputs (ability bonuses, backgrounds,
   tools, starting equipment) and reference-content filtering, **not** the leveling tables
   (slots / resources / ASI / subclass timing / cantrips-spells known). So a 5.5e character is
   computed with 2014 tables. Reconciling against the XPHB `classTableGroups` would therefore
   fail wholesale — it would document the gap in red, not verify anything.
   **Options before writing Phase 6 tests:**
   (a) Leave Phase 6 as N/A until 2024 progression tables exist (recommended — nothing to test yet).
   (b) Implement edition-aware progression tables first (a real feature: XPHB slots/resources/
   ASI/Weapon Mastery/Warlock-as-full-caster-with-invocations, etc.), then add parallel golden
   anchors + reconciliation using the loader's existing `pickClassEntry(json, '5.5e')`.
   (c) Add a small *characterization* test asserting the app currently uses 2014 tables in 5.5e
   mode (documents present behavior without implying it's correct).

---

## 13. Acceptance criteria

- `npm run test` runs the new suites headlessly and deterministically (no network).
- For all 13 classes, levels 1–20: proficiency, HP anchors, ASI levels, subclass timing,
  spell slots, cantrips/spells known, and every **modeled** resource/optional-feature count
  match both the golden anchors (A) and the reference JSON (B).
- Every class-table column is either reconciled or on the documented skip-allowlist; an
  unrecognized column fails the suite.
- The level-up integration reaches level 20 with correct cumulative state and preserves
  spent resources across level-ups.
- Discrepancies found during Phase 3/4 are each resolved as a code fix or a documented,
  justified skip — not left ambiguous.
