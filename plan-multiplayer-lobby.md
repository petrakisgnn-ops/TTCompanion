# Multiplayer Lobby / Session — Plan

Status: **PLAN — not yet implemented.** A real-time "session lobby": a DM creates a lobby with a
random 5-digit code, players join by typing the code, and joined players appear live on the DM's
home. Built on the branch `feature/multiplayer-lobby`; `master` stays the finished single-player app.

---

## 1. Vision & scope (v1)

- A button **near Settings** (header) opens a **Session** screen.
- **DM mode:** "Create Lobby" → a random **5-digit code**; the DM sees players join in real time.
- **Player mode:** "Join Lobby" → type the code (+ pick which of your local characters to bring) →
  you appear in the DM's lobby.
- **DM home** shows the joined players live (name + character summary), feeding the existing DM view.
- **Leave / close:** a player can leave; the DM can close the lobby. Presence auto-clears on disconnect.

**Out of scope for v1** (see §12): live HP/turn sync, chat, dice-roll broadcast, combat tracker sync,
accounts/login beyond anonymous. Start with presence + a character snapshot; richer sync is v2.

---

## 2. Why a backend, and the architecture

GitHub Pages is **static-only** — no server, DB, or realtime. The lobby needs shared online state
that two devices see update live, so we add **Firebase Realtime Database (RTDB)** while the app keeps
living on GitHub Pages:

```
GitHub Pages (the existing static PWA)
        │  Firebase Web SDK (WebSocket)
        ▼
Firebase Realtime Database  ──  Anonymous Auth
  lobbies/{code}  →  DM + players (live)
```

The frontend does not move. Only the lobby's data + realtime go through Firebase. This fits the
existing architecture: `data/repositories/` are interfaces (CLAUDE.md: *"a future sync backend is a
swap, not a rewrite"*), so the lobby lives behind a new `LobbyRepository` with a Firebase impl.

---

## 3. What you set up in Firebase (one-time, free)

1. Create a Firebase project (console.firebase.google.com) — free "Spark" plan is enough.
2. **Realtime Database** → Create database (start in *locked* mode; we'll add rules in §8).
3. **Authentication** → enable **Anonymous** sign-in (each device gets a stable uid, no login).
4. Copy the **web app config** (apiKey, authDomain, databaseURL, projectId, appId).
   - Note: the Firebase `apiKey` is **not a secret** — it's a public project identifier. Security is
     enforced by Auth + Database Rules, not by hiding the key.
5. Hand me the config; it goes into a `.env` (`VITE_FIREBASE_*`) read at build time, with the values
   also set as GitHub Actions secrets for the Pages deploy.

---

## 4. Data model (RTDB)

```
lobbies/{code}:
  code:       "48213"
  dmUid:      "<firebase uid>"
  dmName:     "Giannis"
  status:     "open" | "closed"
  createdAt:  <server timestamp>
  players/{uid}:
    name:          "Alex"
    joinedAt:      <server timestamp>
    character:                       # a snapshot the player brings (resolved, not a live ref)
      name:    "Thren"
      race:    "Elf"
      classes: "Rogue 5"
      level:   5
      hp:      { current: 32, max: 38 }
      ac:      15
```

- The character block is a **snapshot** written on join (and updatable) — the DB never stores the
  player's whole local character, just the summary the DM needs to see. This keeps the two data
  domains separate (reference vs user) and the payload tiny.
- **Presence:** each player write attaches an `onDisconnect().remove()` so leaving/closing the tab
  clears them from the DM's view automatically.

---

## 5. Real-time flow

**Create (DM):** sign in anonymously → generate a 5-digit code → a **transaction** on `lobbies/{code}`
that writes only if the node is empty (retry on the rare collision) → subscribe to
`lobbies/{code}/players`.

**Join (player):** sign in anonymously → read `lobbies/{code}` (exists & open?) → write
`lobbies/{code}/players/{uid}` with name + character snapshot → register `onDisconnect`.

**DM home:** subscribes to `lobbies/{code}/players`; the party list re-renders as players join/leave.

**Close (DM):** set `status: "closed"` and/or remove the lobby node; players get notified and the
Session screen returns to idle.

---

## 6. UI

- **Entry point:** a header button beside the Settings gear (e.g. a `group`/`groups` icon) → route
  `/session`. Visible in both modes; content depends on Player/DM mode.
- **Session screen:**
  - *DM:* idle → "Create Lobby". Active → big code display, share affordance, live player list, "Close".
  - *Player:* idle → 5-digit code input + a picker for which local character to bring → "Join".
    Joined → the lobby view (who else is here), "Leave".
  - *Offline:* a clear "You're offline — sessions need a connection" state (the rest of the app still works).
- **DM home integration:** the existing DM home / party view gains a "live session" section that lists
  the joined players (reusing the party-card styling), updating in real time.

---

## 7. Repository integration

```ts
// domain/session/types.ts        — Lobby, LobbyPlayer, PlayerSnapshot (pure)
// data/repositories/LobbyRepository.ts  — interface:
//   createLobby(dm) → code
//   joinLobby(code, player) / leaveLobby(code)
//   subscribeLobby(code, cb) → unsubscribe
//   closeLobby(code)
// data/repositories/FirebaseLobbyRepository.ts  — the Firebase impl (only file that imports firebase)
// stores/sessionStore.ts          — zustand: current lobby, players, role, connection state
```

A **mock in-memory impl** can back local dev/tests so the UI is buildable without a live Firebase.
Only `FirebaseLobbyRepository` imports the `firebase` SDK, keeping the dependency contained.

---

## 8. Security rules (RTDB)

Friends-group scope — require auth, keep writes sane:

```json
{
  "rules": {
    "lobbies": {
      "$code": {
        ".read": "auth != null",
        // only the creator (dmUid) may create/close/delete the lobby
        ".write": "auth != null && (!data.exists() || data.child('dmUid').val() === auth.uid)",
        "players": {
          "$uid": {
            // a player may only write their own slot
            ".write": "auth != null && auth.uid === $uid"
          }
        }
      }
    }
  }
}
```

Tighten later (validate shapes, cap player count, TTL on stale lobbies). Codes are guessable (100k
space) — fine for casual play; a longer/alphanumeric code is a trivial future bump if needed.

---

## 9. PWA / offline

- Exclude Firebase endpoints from the service-worker cache (vite-plugin-pwa `navigateFallbackDenylist`
  / runtime-caching), so realtime traffic isn't intercepted.
- The Session screen is the only online-only surface; everything else keeps working offline.

---

## 10. Config & secrets

- `.env` with `VITE_FIREBASE_API_KEY`, `..._DATABASE_URL`, `..._PROJECT_ID`, `..._APP_ID`, etc.,
  read via `import.meta.env`. Add `.env` to `.gitignore`; commit a `.env.example`.
- For the GitHub Pages deploy, set the same values as **Actions secrets** and pass them as env in
  `deploy.yml`'s build step.

---

## 11. Implementation phases

1. **Phase 1 — Types + repository + mock.** `LobbyRepository` interface, domain types, an in-memory
   mock impl, and `sessionStore`. No Firebase yet. *UI buildable & testable.*
2. **Phase 2 — Session UI.** Header entry button + `/session` route; DM create + Player join screens
   driving the mock; live player list.
3. **Phase 3 — Firebase impl.** `FirebaseLobbyRepository` (anon auth, transaction create, presence
   via onDisconnect); wire config; swap the mock for it behind the interface.
4. **Phase 4 — DM home presence.** Surface joined players on the DM home, live.
5. **Phase 5 — Rules, PWA, deploy.** Security rules, SW denylist, Actions secrets, end-to-end test on
   two devices.

---

## 12. Non-goals / future (v2+)

Live HP/condition sync from player → DM; turn/initiative broadcast; shared dice rolls; chat; the DM
pushing updates to players; reconnection/rejoin by the same uid; named accounts. All build cleanly on
the same lobby once presence exists.

---

## 13. Open questions

1. **What does a joining player bring** — a required active character, or can they join "as a spectator"?
2. **DM without a lobby vs. multiple lobbies** — one active lobby per DM (simplest) vs. many.
3. **Code format** — 5-digit numeric (as envisioned) vs. 6-char alphanumeric (fewer collisions, easier
   to say). Recommend keeping 5-digit for v1 per your vision.
4. **Hosting** — stay on GitHub Pages + Firebase (recommended), or consolidate onto Cloudflare/Vercel later.
