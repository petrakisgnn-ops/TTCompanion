# DM Mode — Feature Specification

## Context

This is an update to an existing D&D companion web app used by a single party.
The app has two modes: **Player** (mostly complete) and **DM** (currently a placeholder
reusing the player UI). This spec covers building out DM mode.

**Design philosophy — read this first:**
- The app replaces the back-and-forth to books and physical notes. It does NOT replace
  pen-and-paper elements or physical dice rolling — those are the fun of the game.
- Therefore: no auto-rolling for players, no automated combat resolution. Players roll
  physical dice and call out numbers; the DM types them in. The app is a **bookkeeping
  and reference tool**, not a rules engine.
- Already implemented and NOT in scope: Compendium (has info for everything),
  Settings, dice roller and timer in Tools, player mode features.

---

## Navigation (DM mode)

Bottom nav tabs: **Home · NPCs · Compendium · Tools · Settings**

- There is NO separate "Party" tab — Home IS the party dashboard.
- Session Notes are accessed from a button on the Home screen (used during play,
  should be one tap away from the dashboard), not a separate nav tab.

---

## 1. Home — Session Dashboard

The core DM screen. Has two modes controlled by a single toggle button:
**Explore** (default) and **Combat**. The toggle does not navigate to a different
screen — it **transforms the same roster list**. The DM's mental model is
"this is my table, now sorted for combat."

### 1.1 Explore mode

A list of the current party, one row per player character, each showing:

- Avatar/initials, character name, race + class + level
- **HP** (current / max, color-coded: green > 50%, yellow 25–50%, red < 25%)
- **AC**
- **Passive Perception** (shown in explore mode only — it matters for ambushes
  and hidden things while traveling, becomes noise in combat)

PC data is a **read-only live projection of the players' character sheets**.
When a player levels up, takes damage, or updates their sheet, the DM's view
updates automatically without manual intervention. The DM never edits PC data here.

A **+ Add NPC** button lets the DM add an NPC to the current scene
(see NPC section for the quick-create form).

A **Notes** button opens the session notes panel (see Notes section).

### 1.2 Combat mode

Triggered by the toggle ("Start combat" / "End combat"). When active:

- The roster **re-sorts by initiative** (descending). PC rows and enemy/NPC rows
  are interleaved in one list.
- Each row gains an **initiative input field**. The DM enters values manually —
  players roll physical dice and call out their numbers. No auto-rolling for PCs.
- The Passive Perception column is hidden; the initiative value is shown prominently.
- A combat bar appears with:
  - **Round counter** (starts at 1)
  - **Next turn** button — advances the active-turn highlight down the initiative
    order; wrapping past the last combatant increments the round.
  - The currently acting combatant's row is visually highlighted.
- **Initiative ties must be handled.** Tiebreaker: higher Dex modifier goes first;
  additionally allow the DM to manually drag/reorder rows to resolve ties or house-rule
  the order. Do not leave tie order undefined — ties happen every session.
- An **Add enemy from compendium** button appears in combat mode:
  - Reuses the "from compendium" NPC creation flow (section 3.1 A): search the
    bestiary, snapshot the stat block, set count — then prompts for initiative
    and drops the instances straight into the fight.
  - Adding the same monster multiple times creates **one shared stat block reference
    but independent instances** — e.g., 4 goblins = Goblin A/B/C/D, each with its own
    HP pool, initiative, and conditions. Auto-suffix instance names (A, B, C…).
- **Enemy/NPC rows are DM-editable:** the DM can apply damage/healing (adjust HP)
  and toggle conditions. PC rows remain read-only projections (players manage their
  own HP on their sheets; it syncs in).
- **Conditions:** each combatant (PC display included, enemy editable) can show
  condition tags (poisoned, prone, stunned, concentrating, etc.). For enemies/NPCs,
  the DM toggles these. Support an optional "expires at end of round N" so
  duration-based effects clear automatically or at least visibly flag when they lapse.
- Enemy stat access: tapping an enemy row opens/links to its compendium stat block
  for quick reference (attacks, abilities). Display only — no roll automation.

### 1.3 Combat state persistence — critical

The active encounter state (combat on/off, round number, current turn index, full
initiative list, per-instance enemy HP and conditions, NPCs in scene) **must persist
across page refresh / browser crash**. Losing a fight's state mid-session destroys
trust in the tool. Persist on every mutation, restore on load.

---

## 2. Data model guidance

Follow the existing codebase conventions, but respect this separation (SOLID —
the combat tracker should depend on an abstraction, not on where HP lives):

- A `Combatant` abstraction with two implementations:
  - **PlayerCombatant** — wraps/delegates to the live-synced player character.
    HP, AC, conditions come from the player's sheet. Read-only from the DM side.
    Combat-only fields the DM owns for it: initiative value, turn order position.
  - **NonPlayerCombatant** — owns its own mutable state (current HP, max HP,
    initiative, conditions). References a stat block (compendium monster or
    custom NPC) but instance state lives in the encounter.
- The combat tracker/UI talks only to the `Combatant` interface.
- **NPCs and enemies are the same entity type** with a disposition flag
  (friendly / neutral / hostile), not separate concepts. The barkeep who turns
  out to be a spy must not require re-creation as an "enemy." Disposition affects
  default row styling (e.g., hostile = red accent) but nothing structural.

---

## 3. NPCs tab

NPCs are organized into **Settings** — named groups representing a location or
prepared encounter (e.g., "Goblin village," "Dragon lair"). This is the DM's
prep tool: build the scene ahead of time, deploy it in one tap when it becomes
relevant.

### 3.0 Settings (NPC groups)

- The NPCs tab shows a list of settings. A **+ button creates a new setting**
  with a DM-chosen name. Settings can be renamed and deleted (deleting a setting
  asks whether to delete its NPCs or move them to Unassigned).
- Expanding/opening a setting shows the NPCs it contains; NPCs are created
  inside a setting.
- A built-in **"Unassigned"** group holds NPCs that don't belong to any setting
  (recurring NPCs, allies, one-off barkeeps). NPCs can be moved between settings.
- **Quantity per NPC:** an NPC entry within a setting has an optional count
  (default 1). "2 melee goblins" is ONE definition with count 2 — not two
  hand-created copies. Example setting contents:
  - Goblin village: Melee goblin ×2, Goblin ranger ×3, Goblin shaman ×1,
    Goblin lord ×1
  - Dragon lair: Thief ×5, Red dragon ×1
- **Deploy to scene:** each setting has a **"Add to Home"** button that pushes
  all of its NPCs onto the DM Home roster (the current scene). On deploy,
  counts expand into independent instances (Melee Goblin A, Melee Goblin B…),
  each with its own HP pool and, once combat starts, its own initiative and
  conditions — same instance mechanism as adding compendium monsters.
  When the barbarian punches the goblin lord, the DM toggles combat and the
  enemies are already in the list.
- **Deploying is additive**, not a replacement — reinforcements from a second
  setting can join an ongoing scene without wiping it. A separate
  **"Clear scene"** action on Home removes all deployed NPC instances
  (PCs always remain).
- Individual NPCs can still be added to the scene one at a time from their
  detail view, regardless of setting.
- Setting definitions are templates: deploying does not consume or modify the
  setting. Damage dealt to deployed instances never writes back to the
  definition, so the same setting can be deployed again later at full strength.

### 3.1 NPC creation — two sources

Creating an NPC (inside a setting, or in Unassigned) starts with a choice
between two paths:

**A. From compendium** (the fast path — the bestiary already has ~4,500 entries):
- Opens a search box querying the existing Compendium bestiary.
- Selecting an entry **copies the stat block into the new NPC as a snapshot**
  — it does NOT merely link to the compendium entry. The NPC owns its own
  editable data from that point: the DM can rename it ("Goblin Boss" →
  "Grix the Goblin Lord"), adjust HP/AC, add or change attacks, and set
  disposition, all without affecting the compendium or other NPCs made from
  the same entry.
- Keep a `source` reference to the original bestiary entry for provenance
  (display "based on: Goblin Boss" in the detail view, link back to the
  compendium page).
- After selection: name (pre-filled with the monster name, editable, name
  generator available), disposition, count, setting assignment. Done —
  this path should take seconds.

**B. Custom** (build from scratch):
- Full character creation for an NPC — reuse the app's existing character
  creation structures/flow where practical, since an NPC is in essence a
  character the DM controls.
- Supports the two-tier approach:
  - **Quick create** (the mid-session path — must take ~10 seconds):
    - Fields: name, race, one-line description/personality note, disposition.
    - The **random name generator is embedded inline in this form** — a
      "generate" button next to the name field that produces race-appropriate
      names based on the selected race. (Also expose the generator in Tools as
      a standalone, but the form integration is the important one.)
    - Optional: quick combat stats (AC, HP, one attack line) without full
      stat block.
  - **Full create / expand later:**
    - Any quick-created NPC can be expanded into a full stat block (abilities,
      attacks, skills, senses, etc. — mirror the structure the compendium
      monsters use so a custom NPC and a compendium-sourced NPC are
      structurally identical once expanded, and both add to combat the same way).
    - Full creation is also available directly for prep-time work.

Regardless of source, the resulting NPC is the same entity type — settings,
deployment, combat, and the detail view treat compendium-sourced and custom
NPCs identically.

### 3.2 NPC detail view

- Shows all info entered for the NPC.
- Actions: edit, delete, **move to another setting**, **add to current scene**
  (appears on DM Home roster), and if combat is active, **add to combat**
  (prompts for initiative).
- Free-text notes field on each NPC ("what they know," secrets, voice reminders).

---

## 4. Session Notes

Accessible via the Notes button on DM Home (panel/drawer, not a nav tab).

- Notes are organized **per session** (create "Session N" entries, or date-based).
- Plain free-text is sufficient; simple formatting (line breaks at minimum) is fine.
- Persist automatically (autosave on change — a DM mid-session will not press save).
- List of past sessions viewable and searchable.
- Nice-to-have (only if cheap): ability to link/mention an NPC in a note.

---

## 5. Tools additions

- **Random name generator** (standalone version): pick a race → generate names.
  Same generator that's embedded in the NPC quick-create form — one implementation,
  two entry points.
- The existing timer is considered low-value; do not invest further in it.
  Do not remove existing functionality.

---

## 6. Sync rules (Player ↔ DM)

- **Players own their sheets.** DM views of PC data are read-only, live-updating.
  Level-ups, HP changes, stat changes made by players propagate to the DM dashboard
  without DM action.
- **DM owns NPCs, enemies, encounters, and session notes.** Players do not see these.
- Future/out-of-scope for now (do not build yet, but don't architect against it):
  DM pushing XP/loot to players as a pending item the player accepts, and DM
  revealing handouts/content to player screens.

---

## 7. Non-goals (do not build)

- No dice-roll automation for players or automatic attack/damage resolution.
- No rules enforcement engine (the app informs; humans adjudicate).
- No changes to the existing Compendium, Settings, or Player mode beyond what
  the sync rules above require.
- No payment, accounts for strangers, or multi-party support — this is for one group.

---

## Suggested build order

1. DM Home explore mode (party dashboard with live PC sync) — exercises the
   existing character data model.
2. NPC entity + quick create + settings (groups) + NPCs tab + deploy-to-scene
   (needed before combat can include NPCs).
3. Combat mode: toggle, manual initiative, sorting + tiebreak, turn/round tracking,
   enemy instances from compendium, HP/condition editing.
4. Combat state persistence.
5. Session notes.
6. Name generator (form-embedded + Tools entry).

---

## Naming note

The app already has a **Settings** nav tab (app configuration). To avoid
collision, use a distinct identifier for NPC groups in code — e.g.
`EncounterGroup` or `Scene` — even if the DM-facing label in the NPCs tab
remains "Setting." Do not reuse any existing settings/config types or routes.
