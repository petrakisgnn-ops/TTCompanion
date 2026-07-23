# 2024 (5.5e / One D&D) Support — Plan

Status: **PLAN — not yet implemented.** Investigation-grounded design for adding 2024 rules to
character creation and the sheet. **Guiding constraint: 2014 behavior must not regress.** The
existing 330-test suite — especially the class-progression golden/reconcile tests, which are
2014 — is the regression guardrail; every 2024 change is added *alongside* 2014, never in place of it.

---

## 1. Where we already stand

The app is already **edition-aware for content**, and partially for creation. What works today
when the global edition is set to 5.5e (`settingsStore.edition === '5.5e'`, which maps to sources
`XPHB/XDMG/XMM` via `domain/rules/edition.ts`):

| Area | Status in 5.5e mode today |
|------|---------------------------|
| Compendium filtering (spells/items/feats/races/backgrounds/classes/subclasses) | ✅ `matchesEdition` hides 2014-reprinted content, shows XPHB |
| Race/species, background, subclass **selection** | ✅ filtered by edition in StepRace/StepBackground/StepClass |
| **Background ability scores** (the 2024 +2/+1 or +1/+1/+1 weighted choice) | ✅ `parseBackgroundAbilityPatterns` handles the `{choose:{weighted:…}}` shape; StepAbilities forks on edition |
| **Background Origin feat** (Acolyte → Magic Initiate, …) | ✅ `resolveBackgroundFeats` + feat-reward application (ability/spells/proficiencies) |
| Feature *display* (species/class/subclass/background text) | ✅ `useCharacterFeatures` filters by source |

**Data is fully present:** 10 XPHB species, 16 XPHB backgrounds, 77 XPHB feats (Origin/General/
Fighting-Style/Epic-Boon categories), XPHB class entries (`edition: "one"`), 4 XPHB subclasses per
class, `spells-xphb.json` (391 spells), 123 XPHB items.

---

## 2. What actually changes in 2024 (data-grounded)

| Element | 2014 | 2024 | App impact |
|--------|------|------|-----------|
| **Species (race)** | Grants ability bonuses + traits | **No ability bonuses**; traits/size/speed only (some grant small choices) | Ability source moves to background (already handled). Species-trait choices (2024 Human skill+feat, Elf lineage) mostly unmodeled |
| **Background** | 2 skills, tool/lang, a feature, no ASI | **+2/+1 or +1/+1/+1 ASI (choose), an Origin feat, 2 skills, 1 tool** | Ability + feat already applied; the Origin-feat requirement (must be an Origin feat) isn't enforced |
| **Subclass timing** | Varies (Cleric/Sorc/Warlock 1, Wizard/Druid 2, else 3) | **Level 3 for every class** | `subclassLevel()` is 2014-only → wrong for 2024 |
| **Class tables** | 2014 slots/resources/ASI/known | New: **Weapon Mastery**, more **prepared** casters, changed resource counts, Epic Boon @19 | `classData`/`spellSlots`/`classResources`/`spellcasting` are **2014-only** (Phase 6 finding) |
| **Casting** | Fixed known lists for Bard/Sorc/Warlock/Ranger | 2024 shifts several to **prepared**; "Prepared Spells" count column | `isPreparedCaster`/known tables are 2014-only |
| **Feats** | Half-feats ad hoc; taken via ASI | **Categories** (Origin/General/Fighting Style/Epic Boon); General need level 4+; standardized +1 | Category/prereq gating not modeled |
| **Weapon Mastery** | — | New per-class mastery slots | Unmodeled |
| **Spells/Items** | PHB | XPHB variants (391 spells, 123 items), weapon mastery properties | Filtered already; per-spell rule changes not tracked |

---

## 3. The gaps to close (all in the rules layer — 2014-only today)

1. **`subclassLevel(class, edition)`** — 2024 = 3 for all classes.
2. **Class progression tables** — spell slots, class resources, ASI levels, cantrips/prepared
   counts, per the XPHB `classTableGroups`. Today `domain/rules/classData.ts` (`CLASSES`,
   `SUBCLASS_LEVEL`, `ASI_LEVELS`, `SUBCLASS_CASTERS`), `spellSlots.ts`, `classResources.ts`,
   and `spellcasting.ts` encode 2014 only.
3. **Prepared/known split** — 2024 re-classifies several casters; `isPreparedCaster` needs an edition.
4. **Weapon Mastery** — a new choose-N mechanic (like optional-features) per class/level.
5. **Species-trait choices** — 2024 Human (skill + Origin feat), Elf lineage, etc. — a small choice layer.
6. **Feat category gating** — Origin (background) vs General (level 4+) vs Fighting Style vs Epic Boon.

---

## 4. Storage & data model (the "have these stored" ask)

**Decision needed — record edition on the character.** Today edition is a single **global**
setting (`settingsStore`), and the rules layer ignores it (always 2014). For 2024 the derivation
must know which edition a character *is*, independent of the global toggle a user might flip later.

- **Add `edition: '2014' | '2024'` to the `Character` model** (default `'2014'` for all existing
  saved characters via a migration/normalizer — Dexie load path). A character created in 2024 keeps
  2024 rules forever, regardless of the global setting.
- References are already source-tagged (`{name, source}`), so a 2024 character's refs already point at
  XPHB content; the new field just drives *rule* selection (subclass level, tables, prep).
- The global `settingsStore.edition` keeps driving **content browsing/filtering** and the **default**
  for a new character; the wizard writes the chosen edition onto the character.

Everything else stays reference-based — no copying of 2024 content into characters (architecture rule).

---

## 5. Non-regression strategy (2014 must not break)

- **Additive, edition-parameterized rules.** Change signatures to `fn(…, edition)` with the 2014
  path unchanged and `'2014'` as the default, so existing callers/tests keep passing. New 2024
  tables live in new constants beside the 2014 ones — never mutate the 2014 arrays.
- **The class-progression test suite is the guard.** Its golden + reconcile tests pin 2014 to the
  reference JSON; they must stay green at every step. 2024 gets a **parallel** suite
  (`pickClassEntry(json, '5.5e')` already exists in the fixtures).
- **Character edition is sticky** (stored, §4) so a 2014 character never picks up 2024 math.
- **One vertical slice at a time** (baby steps, §6) — each phase ships green with both editions covered.

---

## 6. Implementation phases (baby steps)

Each phase ends with green 2014 tests + new 2024 tests.

1. ✅ **Phase A — Edition plumbing (DONE).** `Edition` type moved to `domain/rules/edition.ts`
   (store re-exports it); `Character.edition` added; `DexieCharacterRepository.normalize` defaults
   old saves to `'5e'` (on load + import); the wizard writes the current global edition onto new
   characters (StepSpells' synthetic character too). No 2014 behavior change — full 330-test suite
   green, `tsc -b` + build clean. Derivations don't consume edition yet (that starts in Phase B).
2. ✅ **Phase B — Subclass timing (DONE).** `subclassLevel(class, edition='5e')` → 3 for all in
   2024; 2014 path unchanged (default arg). All callers pass edition (creation → wizard/global
   edition, sheet/level-up/multiclass → `character.edition`). 2024 subclass-timing tests added,
   2014 tests unchanged. Full suite green (334), `tsc -b` + build clean.
3. ✅ **Phase C — 2024 class tables (DONE).** Diffed 2024 vs 2014 first: **spell slots and cantrip
   counts are unchanged** (2024 only renames the "Cantrips" column), so the real deltas are (a) all
   casters become *prepared* with a flat "Prepared Spells" table (`PREPARED_2024` + edition-aware
   `isPreparedCaster`/`maxPreparedSpells`/`isKnownCaster`/`classHasSpellChoices`), (b) 2024
   half-casters get a level-1 slot (`HALF_2024`), (c) resource deltas — Cleric CD 2/3/4, Paladin CD
   2@3/3@11, Barbarian Rage tracked (6) at 20 (`computeClassResources(..., edition)` threaded through
   `recomputeAllResources`). `progression.reconcile2024.test.ts` reconciles all of it against the
   XPHB `classTableGroups`. Full suite green (361), 2014 unchanged (default `'5e'` everywhere).
4. ✅ **Phase D — Prepared/known + spells UI (FOLDED INTO C).** `SpellSelection` now passes
   `character.edition`, so the Spells step and the sheet already render 2024 prepared casting with the
   flat caps. (Remaining nuance: 2024 caster-subclass prep — deferred with §5's other subclass work.)
5. ✅ **Phase E — Weapon Mastery (DONE).** Display: item detail pages show a weapon's Mastery
   property + what it does (`itemMasteryCache`, resolved from `items-base.json`'s `itemMastery`).
   Mechanic: `weaponMasteryCount(class, level, edition)` (Barbarian/Fighter scale, Paladin/Ranger/
   Rogue fixed 2, reconciled against the XPHB column); `Character.masteredWeapons` (migrated to
   `[]`); a searchable `WeaponMasteryPicker` in creation for 2024 martials; and a sheet
   `WeaponMasterySection` showing each mastered weapon + its property. 364 tests green.
6. ✅ **Phase F — Species-trait & feat-category polish (DONE).** Feat-category gating
   (`featCategory` / `isAsiFeatEligible`): ASI feat pickers (creation + level-up) now filter by the
   character's edition and, in 2024, to **General** feats meeting their level prerequisite (Origin/
   Epic/Fighting-Style excluded); the race bonus-feat search is edition-filtered too. 2024 Human's
   Origin-feat choice (`parseRaceFeatGrant` of the species `anyFromCategory` grant) now surfaces an
   **Origin-feat picker** in creation. (2024 species *skill* choices and lineage *spells* already
   worked via `parseSkillGrant` and the granted-spell system.) 374 tests green.
7. ✅ **Phase G — Creation UX (DONE).** Per the locked decision (inherit the global edition
   silently), the wizard now shows a **2014 / 2024 badge** in its header so the ruleset being built
   is always visible, and writes that edition onto the character. End-to-end review confirmed the
   whole 2024 flow works: species (no ability) → background (ability + Origin feat + skills + tool +
   A/B equipment) → subclass-at-3 → background-weighted abilities → species/background skill choices,
   expertise, class options, weapon mastery, Origin feat → prepared casting → equipment → finalize.
   Equipment already parsed the 2024 A/B choice shape. 370 tests green.

---

**2024 support (Phases A–G) is complete.** A character created in 2024 mode builds and levels with
correct rules end-to-end; 2014 characters are byte-for-byte unchanged (every edition fork defaults
to `'5e'`, guarded by the untouched 2014 test suite).

---

## 7. Testing strategy

- Extend the class-progression fixtures to a **2024 pass**: golden anchors (subclass @3 everywhere,
  XPHB slot/resource anchors) + reconciliation against `pickClassEntry(json, '5.5e')`'s
  `classTableGroups`, with an explicit skip-allowlist for still-unmodeled columns (Weapon Mastery
  until Phase E).
- **Background/feat reward reconciliation already covers XPHB entries** (those suites iterate the
  whole files, both editions) — they'll validate 2024 backgrounds' ability/feat/skill/tool grants.
- Every phase: the full 2014 suite stays green (regression gate) before merge.

---

## 8. Decisions (locked)

1. **Edition granularity — per-character.** Add `edition` to `Character`; migrate saved characters
   to 2014. A character's rules are sticky regardless of the global toggle.
2. **Multiclass — single edition per character.** All of a character's classes use its edition.
3. **Creation entry — inherit the global setting silently.** A new character takes
   `settingsStore.edition` at creation time and stores it; no in-wizard toggle. (Phase G reduces to
   "write the global edition onto the character"; no explicit UI step.)
4. **Species-trait choices — deferred to Phase F.**

Type note: reuse the existing `Edition = '5e' | '5.5e'` type (5e ≙ 2014, 5.5e ≙ 2024) rather than
introducing `'2014'|'2024'`, so it lines up with `settingsStore` and `matchesEdition`.
