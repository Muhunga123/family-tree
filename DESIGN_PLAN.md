# The Living Lineage — Design & Build Plan

> A plan to turn this family tree from a clean, generic chart into a one-of-a-kind,
> artful, heritage-rooted experience — while keeping it dead simple to use.

---

## 0. North Star

**Concept:** *The Living Lineage* — a family tree you can **hear** and **feel**, rooted in
oral tradition, not a database you read.

This family is **Congolese**, with **Lingala (LN)** and **Swahili (SW)** already in the data
(`ndeko`, `ndugu`). That heritage is the unfair advantage no generic Western genealogy app can
copy. Every decision below reinforces three feelings:

1. **Reverence** — ancestors are honored, not just listed.
2. **Presence** — the tree feels alive and breathing, voices can be heard.
3. **Clarity** — anyone, any age, understands who is who in seconds.

**Design tension to respect:** every artful addition must be *ambient* (it just feels alive) or
*one extra tap* (hear a voice, play the story). No new complexity in the core flow.

---

## 1. Research Basis (why these choices)

From auditing standout products and award winners:

| Product | What it proves |
|---|---|
| **KinTree** | Craft wins: one bold visual metaphor + high-fidelity motion + relationships rendered with total clarity (dashed = divorce, elbows scale across 6+ generations). |
| **airluum / Genealogic** | Story-first beats chart-first. Memories, collaborative voices, narrative; the chart is a byproduct. |
| **TreeAlive** | A tree as a *3-minute film* (animated across historical maps) is more moving than any static diagram. |
| **Awwwards SOTD ("The Power of Storytelling", "The Empty Glass")** | Win on a *single emotional metaphor + motion*, never on feature lists. |

**Conclusion:** technical structure is already solid. The gap is **soul + signature**. We add an
emotional core (voice/heritage), cinematic craft, and story — not more chart features.

---

## 2. Current State (baseline)

Stack: React 19, Vite 8, Tailwind 4, Motion, Supabase, PWA.

- **Views:** Lineage (focus neighborhood) + Overview (full tree), shared pan/zoom viewport.
- **Data:** `people` + `relationships` (`parent`, `partner`); siblings derived. Multilingual
  `role`/`story` (EN/FR/LN/SW).
- **Editing:** owner-only; add links but **cannot unlink**; single photo.
- **Design:** dark glass UI, Instrument Serif + Inter, 8 hashed gradient accents, radial bg.
- **Gaps found:** UI chrome is English-only; no public-access toggle in app; `editor` role unused;
  `lineage` field never populated; `getPersonColor` dead code; minor `photoPath` bug in editor.

Key files:
- Views: `src/components/TreeCanvas.jsx`, `OverviewCanvas.jsx`, `ViewToggle.jsx`
- Layout engines: `src/utils/lineageLayout.js`, `src/utils/fullTreeLayout.js`
- Viewport: `src/hooks/useTreeViewport.js`
- State: `src/context/TreeProvider.jsx`
- Person: `src/components/PersonSheet.jsx`, `PersonEditor.jsx`, `PersonCard.jsx`
- Data: `src/data/cloudBackend.js`, `familyRepository.js`, `normalizeFamily.js`
- Design tokens: `src/index.css`, `src/utils/personColor.js`

---

## 3. Design System Evolution

Foundational visual language upgrades that everything else builds on.

### 3.1 Generational light (warmth by depth)
- Ancestors render **warmer/golden**; living generations **cooler**. Encodes depth as light
  temperature, an instant "up = older/roots" read.
- Implementation: derive a `generationDepth` per person (distance from root ancestors) in
  `normalizeFamily.js`; map depth → a warmth multiplier applied to accent + glow in `personColor.js`.

### 3.2 Memorial treatment (reverence, not morbidity)
- Deceased (`deathYear != null`): a soft, quiet halo ring + lifespan always shown; subtle, never
  gray/sad. A small candle/flame glyph optional.
- Implementation: branch in `PersonCard.jsx` / `OverviewCanvas` node on `person.deathYear`.

### 3.3 Motion language
- **Gliding camera:** navigation animates `{x,y,scale}` via a spring instead of snapping
  (`useTreeViewport` gains an `animateTo(target)` using `requestAnimationFrame` or Motion values).
- **Breathing:** background radial gradients drift slowly toward the focused person's accent color.
- **Path light-up:** on focus, the connector chain from root → focal animates a brighter stroke.

### 3.4 Tokens
- Promote magic numbers in `index.css` to tokens (warm/cool accent ramps, halo color, line weights).
- Remove dead `getPersonColor`; keep `getAccent` as the single source.

**Effort:** M. **Risk:** low. **Dependencies:** none. Pure visual; no data migration.

---

## 4. Feature Tracks

Each track: *why → UX → data → implementation → effort/risk*.

### Track A — Voice (the signature)
**Why:** No competitor for a family like this lets you *hear* grandma say her own name. Highest
emotional payoff per line of code.

**UX:**
- On `PersonSheet`: a play button next to the name → plays that person's recorded name/greeting.
- In `PersonEditor`: "Record voice" (in-browser `MediaRecorder`) or upload an audio file; pick the
  language of the recording.
- Avatar shows a tiny audio ripple when a voice exists.

**Data:**
- New optional columns on `people`: `voice_path` (storage), `voice_lang`.
- Reuse the existing `photos` Supabase bucket pattern (add `audio/` prefix or a `voices` bucket).
- Local backend: store as object URL / data URL (same approach as photos).

**Implementation:**
- `cloudBackend.uploadAudio(file)` mirroring `uploadPhoto`.
- `PersonSheet` audio player (native `<audio>` + custom minimal control).
- Storage RLS mirrors photo policy (owner write, public read).

**Effort:** M. **Risk:** low–med (mobile mic permissions). **Migration:** additive columns only.

---

### Track B — Story over chart
**Why:** Industry has converged on story-first. Turns a lookup tool into a keepsake.

**UX:**
- `PersonSheet` gains a **Memories** section: a vertical list of short entries, each with author +
  date + optional photo. "Add a memory" for anyone allowed.
- A **milestones timeline** per person (born, married, moved, passed) rendered as a small vertical
  rail.
- Optional AI "help me remember" prompt to unblock writers (deferred; optional).

**Data:**
- New table `memories`: `id, tree_id, person_id, author_member_id (nullable), author_name, body,
  lang, photo_path (nullable), happened_on (nullable), created_at`.
- RLS: members can read; insert allowed for members (or anyone if tree is public + editor opened).

**Implementation:**
- `cloudBackend` CRUD for memories + realtime subscription on the new table.
- `PersonSheet` Memories list + add form (reuse editor field styles).

**Effort:** M–L. **Risk:** med (new table, permissions). **Migration:** new table + RLS + realtime.

---

### Track C — Story Mode (cinematic tour)
**Why:** The "TreeAlive film" moment. A single Play button that narrates the family.

**UX:**
- A Play control (top bar). When pressed, the camera glides root → each branch, pausing on each
  person to surface name, role, lifespan, and (if present) their voice + a memory.
- Tap anywhere to exit; progress bar; respects reduced-motion.

**Data:** none new — derives an ordered walk from existing graph (BFS/DFS from root).

**Implementation:**
- `src/utils/storyTour.js` builds an ordered stop list with target transforms (reuse layout coords).
- Driver hook `useStoryTour` sequences `animateTo` calls from Track 3.3.
- Overlay UI for caption + controls.

**Effort:** M. **Risk:** low (built on camera motion). **Dependencies:** 3.3 gliding camera.

---

### Track D — New lenses: Timeline & Map
**Why:** Unlocks the *immigrant family* story. Two new ways to "see everyone."

**Timeline UX:** horizontal birth-year axis; each person a node on their lifespan bar; generations
visibly overlap. Tap → open person.

**Map UX:** birth/residence places plotted; migration lines (Congo → diaspora) drawn between life
locations; filter by decade.

**Data:**
- For map: add optional `birth_place`, `places[]` (lat/lng + label + year) to `people`. Requires a
  geocoding step (manual entry first; geocode later).
- Timeline needs only existing `birthYear`/`deathYear`.

**Implementation:**
- Add `viewMode: 'timeline' | 'map'` to `TreeProvider` + extend `ViewToggle` (becomes a small lens
  switcher; keep labels translated — see Track F).
- Timeline: new `src/utils/timelineLayout.js` + `TimelineCanvas.jsx` (reuse viewport).
- Map: lightweight map lib (e.g. MapLibre GL) or a stylized SVG world; start simple.

**Effort:** Timeline M; Map L. **Risk:** Map med–high (new dep, geo data entry). **Migration:**
additive place columns for map only.

---

### Track E — "How are we related?"
**Why:** The #1 question every family asks; almost no app answers it elegantly.

**UX:** pick two people (or "me" set once) → the exact path lights up across the tree with a plain-
language explanation ("Faila is your father's mother" / "second cousin once removed", localized).

**Data:** none new (graph BFS over `parentIds`/`partnerIds`/`childIds`). Optional `me` person id in
local settings.

**Implementation:** `src/utils/kinship.js` (shortest path + relationship namer with EN/FR/LN/SW
labels) + highlight overlay reusing connector rendering.

**Effort:** M. **Risk:** med (relationship-naming correctness). **Dependencies:** none.

---

### Track F — Foundation polish
**Why:** The art shouldn't sit on cracks. These also remove friction for a 4-language family.

- **Translate UI chrome** (buttons, toggles, sheet labels) across EN/FR/LN/SW via a central strings
  map; `ViewToggle`/`TopBar`/`BottomBar`/editor labels pull from it.
- **In-app public-link toggle** for owner (writes `trees.public_access`).
- **Editor role usable** (`canEdit` honors `editor`, not just `owner`).
- **Unlink relationships** in `PersonEditor` (delete `relationships` rows).
- **PWA offline cache** of the last loaded tree (read-only when offline).
- **Cleanups:** populate/remove `lineage`, fix `photoPath` init bug, drop dead `getPersonColor`,
  remove `App.css`/`icons.svg` leftovers, restore/author `supabase/public-link-access.sql`.

**Effort:** M (spread). **Risk:** low. **Migration:** none (uses existing columns).

---

## 5. Data Model Changes (consolidated)

Additive only; nothing destructive.

```
people:                                  (new optional columns)
  + voice_path        text   null         -- Track A
  + voice_lang        text   null         -- Track A
  + birth_place       text   null         -- Track D (map)
  + places            jsonb  null         -- Track D (map): [{label,lat,lng,year}]

memories:                                 (new table — Track B)
  id, tree_id, person_id, author_member_id?, author_name,
  body, lang, photo_path?, happened_on?, created_at

derived (no DB):
  generationDepth   -- computed in normalizeFamily.js (Track 3.1, E, C)
```

RLS + realtime: mirror existing `people`/`relationships` policies; add `memories` to the
`supabase_realtime` publication.

---

## 6. Recommended Sequence

| Phase | Scope | Outcome |
|---|---|---|
| **P1 — Soul wins** | 3.1 generational light, 3.2 memorial halo, 3.3 gliding camera + path light-up, E-lite "Today's birthdays" | Instantly feels artful & alive. Low risk, no migration. |
| **P2 — Signature** | Track A (Voice) | One-of-a-kind. Emotional core. |
| **P3 — Story** | Track B (Memories) + Track C (Story Mode) | Becomes a keepsake / film. |
| **P4 — Lenses** | Track D Timeline, then Map | New ways to see; diaspora story. |
| **P5 — Relate + polish** | Track E path finder, Track F throughout | Answers the #1 question; removes cracks. |

Polish items from Track F can be slotted opportunistically into any phase.

---

## 7. Guardrails / Principles

- **Simplicity is sacred.** Core flow stays: open → see neighborhood → tap to navigate. New power
  is ambient or one tap deep.
- **Respect the dead.** Memorial styling is quiet and dignified; never gray or sad.
- **Accessibility:** honor `prefers-reduced-motion` (breathing, camera glide, story mode all degrade
  to instant). Maintain tap-target sizes; captions for audio where possible.
- **Performance:** Overview must stay smooth at 6+ generations; keep layout math pure and memoized.
- **Privacy:** voices/memories of living people are sensitive — respect existing owner/role +
  public-access model before exposing anything new publicly.
- **Additive migrations only;** never break the local `family.json` fallback.

---

## 8. Open Decisions (need your input later)

1. **Voice:** in-app recording, file upload, or both for v1?
2. **Memories:** can non-owner signed-in family add memories, or owner-only at first?
3. **Map:** worth the extra dependency + place-data entry now, or defer until after Voice/Story?
4. **"Me":** set a single "you" person to anchor "how are we related?" and birthday prompts?
5. **AI memory prompts:** include, or keep it fully human-written?

---

## 9. First Build Target (proposed)

**Phase 1 — Soul wins**, because it transforms the *feel* immediately, carries near-zero risk, needs
no database changes, and sets up the motion + depth systems that Voice, Story Mode, and the path
finder all reuse.

Concretely, P1 ships:
- `generationDepth` in `normalizeFamily.js`
- warmth ramp + memorial halo in `personColor.js` + `PersonCard.jsx` + Overview nodes
- `animateTo` gliding camera + reduced-motion support in `useTreeViewport.js`
- connector path light-up on focus in `lineageLayout.js` / `TreeCanvas.jsx`
- "Today" birthday/memorial surfacing (small, dismissible)
