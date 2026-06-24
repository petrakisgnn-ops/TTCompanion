# D&D Companion — Claude Code project guide

Mobile-first (phone + tablet) PWA: a D&D 5e companion built on a **local D&D reference
data dump**. Read-only reference content + user-owned characters + a customizable, class-aware
dashboard, with a Player mode and a DM mode. Full architecture lives in `ARCHITECTURE.md`
— **read it before any structural work.**

## Who you're working with
Intermediate developer, strong C#/Unity background, newer to React. Favor clean code and
SOLID. Briefly explain React-specific idioms when non-obvious (hooks, effects, render
model); don't over-explain general programming.

## Stack
- React + TypeScript (strict mode) + Vite
- Tailwind CSS v4 (via `@tailwindcss/vite` plugin; `@theme` block in `src/index.css`)
- React Router
- Zustand (state)
- Dexie.js over IndexedDB (persistence + cached reference data)
- dnd-kit (dashboard widget reordering, touch-friendly)
- vite-plugin-pwa (installable / offline)

## Architecture rules (non-negotiable)
- **Two data domains.** Read-only **reference** data (D&D content) vs. read/write
  **user** data (characters, dashboard layouts, DM state). Never mix them.
- A character stores **references** (`name|source` ids), never copies of reference
  content. Resolve at render time.
- `domain/` and `rendering/` are pure: no React, no DOM imports. UI depends on domain,
  never the reverse.
- `data/repositories/` are **interfaces**; the Dexie implementations are injected behind
  them (so a future sync backend is a swap, not a rewrite).
- The dashboard is **data-driven**: a list of widget instances
  `{ id, type, config, span, order }` mapped through a registry. A new widget type is a
  registration, never an edit to the dashboard engine (Open/Closed).
- The `@tag` renderer dispatches per-tag via a handler registry; **unknown tags degrade
  to plain text, never throw.**
- One generic `resource-tracker` widget (config: `{ label, max, resetOn }`) — do NOT
  create a separate widget per class resource.

## Conventions
- Named exports, not default. `interface` for object shapes.
- Rules math (ability modifier, proficiency bonus, spell save DC, AC) = pure functions in
  `domain/rules/`, unit-tested.
- One widget component per file under `widgets/`, each registered via `registerWidget`.
- Keep components presentational; logic lives in domain / hooks / stores.
- Mobile-first: build the phone single-column layout first, then the tablet two-pane /
  2-column grid from one breakpoint. Tap targets >= 44px. Dark mode is the default.
- Path alias `@/` maps to `src/`.

## Folder structure
```
src/
  app/                  # routing, providers, mobile shell (bottom nav, mode toggle)
  domain/               # PURE TS — no React, no DOM
    reference/          #   Spell, Monster, Item, ... type definitions
    character/          #   Character, ClassLevel, ResourceTrack, ...
    rules/              #   pure functions: modifiers, proficiency, spell save DC, AC...
    widgets/            #   WidgetInstance, DashboardLayout
  data/                 # ingestion + persistence (only place that knows about Dexie)
    ingest/             #   read + normalize + index the reference JSON
    repositories/       #   ReferenceRepository, CharacterRepository (interfaces + impls)
    db.ts               #   Dexie schema / object stores
  rendering/            # the @tag engine: Entry tree -> React nodes
    parser.ts
    handlers/           #   one handler per tag
  features/
    dashboard/          # customizable home screen + widget engine
    character/          # sheet view + editor (creation flow)
    compendium/         # reference browser (spells, bestiary, items, ...)
    dm/                 # DM-only tools (initiative, encounter builder, party view)
  widgets/              # widget components + registry
  ui/                   # shared presentational components
```

## Data
The reference JSON lives in `public/data/`. It is large — **never paste its contents
into context; reference files by path.** Key folders: `spells/`, `bestiary/`, `class/`.
Key files: `items.json`, `items-base.json`, `backgrounds.json`, `races.json`, `feats.json`,
`conditionsdiseases.json`, `actions.json`, `skills.json`, `senses.json`.

A one-time ingest pass (`data/ingest/`) normalizes and indexes into IndexedDB on first run.

## Commands
- dev:   `npm run dev`
- build: `npm run build`
- test:  `npm run test`
- lint:  `npm run lint`

## Build order — current phase: **Phase 1**
1. ✅ Phase 0 — Project setup (done)
2. 🔄 **Phase 1 — @tag renderer** ← CURRENT
   - `rendering/parser.ts`: walk entries tree, split `{@tag ...}` markup
   - Handler registry + priority handlers
   - Unknown tags degrade to plain text
   - Unit tests against real dump entries
   - One hardcoded spell detail screen
3. Phase 2 — Ingestion + Compendium
4. Phase 3 — Characters
5. Phase 4 — Dashboard engine
6. Phase 5 — Fill out widgets + DM mode
