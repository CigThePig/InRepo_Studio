# CLAUDE.md — InRepo Studio

> AI assistant guide for Claude Code. Read this before touching any files.
> For deeper rules, see `/AGENTS.md` (authoritative) and `/context/` docs.

---

## Quick Start

```bash
npm install          # Install dependencies
npm run dev          # Dev server at http://localhost:5173
npm run build        # TypeScript check + Vite build
npm run lint         # ESLint on src/
npm test             # Vitest unit tests
npm run test:e2e     # Playwright E2E tests
npm run validate:project  # Validate project/scene contract
npm run preview      # Serve built dist/
```

---

## What This Project Is

**InRepo Studio** is a mobile-first, browser-based game editor built on Phaser 3 and Blockly. It lets users paint tilemaps, place entities, write visual scripts with Blockly, and deploy to GitHub Pages — all from a touch device.

Two runtime modes:
- **Editor mode** (`?tool=editor`) — tilemap painting, entity placement, Blockly scripting
- **Game mode** (default) — loads and plays the published game

---

## Required Reading Order

Before doing any work, read these in order:

**For planning (spec/blueprint/plan):**
1. `/AGENTS.md` — rules, risk gates, workflow gates
2. `/INDEX.md` — canonical file inventory
3. `/context/active-track.md` — current track status and next task
4. `/context/track-index.md` — official roadmap
5. `/context/architecture.md` — invariants, apply/rebuild semantics
6. `/context/schema-registry.md` — lists of truth

**For implementation (add these):**
7. `/context/repo-map.md` — module boundary map
8. `/context/code-style.md` — TypeScript conventions, boundaries
9. `/context/ux-polish-rules.md` — required before marking any feature complete

**For Blockly/Presets work (add this):**
10. `/context/Blockly_Plan_Revised.md` — Blockly + Presets constitution

**Before editing files in any folder**: read the nearest local `AGENTS.md` for that folder. There are 18 module-scoped `AGENTS.md` files. They have priority for their directories.

---

## Project Structure

```
/
├── src/
│   ├── boot/          # Entry point, mode detection, loading screen
│   ├── types/         # TypeScript schemas (project, scene, entity, gameApi, preset, script)
│   ├── storage/       # IndexedDB (hot) + fetch (cold) + migration
│   ├── editor/        # Editor-only: canvas, panels, tools, blockly UI, presets UI
│   │   ├── canvas/    # Viewport, pan/zoom, grid, tile cache, rendering
│   │   ├── panels/    # Top/bottom panels, asset UI, inspectors
│   │   ├── tools/     # Paint, erase, select, entity placement
│   │   ├── blockly/   # Blockly workspace UI, Logic Target switching
│   │   ├── presets/   # Presets tab UI, preset config mutations
│   │   ├── history/   # Undo/redo stack
│   │   ├── core/      # EditorMode, feature flags, event bus, tab registry
│   │   ├── entities/  # Entity inspector, property editors
│   │   ├── scenes/    # Scene management UI
│   │   └── assets/    # Asset library, upload, sprite slicing
│   ├── runtime/       # Game runtime: loader, spawner, Phaser scenes
│   │   ├── presets/   # PresetManager, preset definitions
│   │   ├── blockly/   # ScriptHost, block definitions, code generators
│   │   ├── apiContext/# Game API context implementation
│   │   └── tiles/     # Tileset registry
│   ├── deploy/        # GitHub OAuth, commit publishing, SHA conflict checks
│   ├── shared/        # Theme CSS, paths, atlas naming, shared UI helpers
│   └── utils/         # File download utilities
├── game/              # Runtime content (project.json, scenes/, logic/, assets/)
├── context/           # Architecture docs, planning docs, track index
├── tracks/            # Per-track folders (spec.md, blueprint.md, plan.md)
├── tests/             # Playwright E2E test specs
├── tools/             # Utility scripts
├── AGENTS.md          # Authoritative AI agent rules
├── INDEX.md           # Canonical file inventory (update when files change)
└── index.html         # App entry point
```

---

## Core Architecture Invariants

**Never violate these.** If a requested change conflicts with one, stop and report it.

| Invariant | Rule |
|-----------|------|
| **Hot/Cold boundary** | IndexedDB is the only write target. Fetch (`/game/`) is read-only. |
| **Editor/Runtime separation** | Editor code never runs in game mode. Runtime code works independently. |
| **Schema compliance** | All persisted JSON must validate against schemas in `schema-registry.md`. |
| **No data loss** | Auto-save to IndexedDB on every meaningful change. |
| **Touch-first interaction** | Canvas operations must account for touch offset (finger occlusion). |
| **Offline-after-load** | All editing works without network after initial load. |
| **Unified Game API** | Presets and Blockly both go through the same Game API (`api.on/call/read/time/log`). No split brain. |
| **Blockly JSON is source of truth** | Generated JS is derived/disposable. Never persist it as canonical state. |
| **Event-first scripting** | No unrestricted per-frame loops in v1. "Every frame" blocks need Advanced toggle + throttling. |
| **No raw Phaser in Blockly** | Scripts use only safe Game API wrappers. Presets may use raw Phaser internally. |
| **Logic Target always visible** | In Blockly Mode, the Logic Target dropdown is always shown. |
| **Presets are global** | Presets are game-wide systems, not per-Logic-Target. |
| **Script errors don't crash** | Runtime errors enter Error state for that script only, with clear reporting. |

---

## Apply / Rebuild Semantics

Settings have explicit semantics — never make them silent no-ops:

| Setting category | Semantic |
|-----------------|----------|
| Grid visibility/color/opacity | **Live-applying** |
| Touch offset distance | **Live-applying** |
| Theme (dark/light) | **Live-applying** |
| Preset enable/disable, knob changes | **Live-applying** |
| Blockly workspace changes | **Live-applying** (auto-save) |
| Default tile size, grid dimensions | **Requires rebuild** (new scenes only) |
| Scene dimensions | **Requires rebuild** |
| Tileset references | **Requires apply** (reload images) |
| Logic Target switching | **Requires apply** (workspace save + load) |
| Deploy to GitHub Pages | **Requires explicit commit action** |

---

## Track-Based Development Workflow

Work is organized into **Tracks**. Always check `/context/active-track.md` first.

### Full Track (high-risk work)
Required when touching: JSON schemas, IndexedDB layout, boot routing, GitHub auth, deploy logic, Game API contract, preset/script envelope formats, SceneHost/ScriptHost lifecycle, Blockly block definitions.

Artifacts required:
- `spec.md` — what/why/acceptance
- `blueprint.md` — technical design, no code
- `plan.md` — phases with verification and stop points

### Micro Track (low-risk/local work)
Allowed for: UI polish, tool UX tweaks, small bug fixes, isolated perf work (no schema changes).

Minimum artifact: a Micro Plan (goal, files touched, steps, verification, stop point).

### Track Closeout
When done:
1. Append summary to `/context/history.md`
2. Clear `/context/active-track.md`
3. Update `INDEX.md`, `repo-map.md`, `schema-registry.md` if relevant

---

## Risk Gates

**HIGH RISK — must ask before proceeding:**
- Deleting files
- Changing schemas or persistence formats (`project.json`, scene schemas, export/import)
- Changing hot/cold routing or IndexedDB storage layout
- Changing boot/mode routing or GitHub Pages base path behavior
- Changing build/deploy pipeline
- Changing GitHub authentication or token storage logic
- Wide refactors across many files
- Changing Game API contract (command/event/state names or signatures)
- Changing preset schema format (`PresetDefinition` shape)
- Changing logic script envelope format (`/game/logic/*.json`)
- Changing SceneHost/ScriptHost lifecycle
- Changing Blockly block type IDs (renames require aliasing)

**MEDIUM RISK — notify user:**
- Changing module boundaries
- Changing performance-critical paths (tilemap rendering, IndexedDB ops)
- Adding/removing Blockly block categories or preset categories
- Changing Logic Target dropdown behavior

**LOW RISK — proceed:**
- Adding tests
- Adding small pure helper functions
- Improving comments/docs

---

## Key Registry Files (keep in sync)

These files must be updated whenever their content changes:

| File | Purpose |
|------|---------|
| `/INDEX.md` | Canonical file inventory — update when adding/changing files |
| `/context/schema-registry.md` | All "lists of truth" (schemas, enums, config keys) |
| `/context/repo-map.md` | Module boundary map — update when modules change |
| `/context/active-track.md` | Current track pointer — update after completing a track |
| `/context/history.md` | Append-only track completion log |

---

## Code Conventions

**TypeScript:**
- Strict mode, no `any` (use `unknown` instead)
- `interface` for object shapes, `type` for unions and computed types
- `readonly` for immutable data
- Path alias: `@/` → `src/`
- Unused vars must be prefixed with `_` (or remove them)

**File size:**
- Soft limit: ~450 lines
- Hard limit: ~600 lines
- If a file exceeds 450 lines during a phase, the next phase must split it

**Module boundaries:**
- No cross-module private access
- UI code, domain logic, and I/O are separated
- `src/runtime/` must never import from `src/editor/`
- New subsystem = new module/file

**Mobile-first:**
- Touch targets ≥ 44×44px
- All touch handlers must account for touch offset
- Canvas operations should batch to avoid frame drops
- Bottom sheets over tiny side panels

**Async:**
- Always `async/await` for IndexedDB operations (never synchronous)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Game engine | Phaser 3.80 |
| Visual scripting | Blockly 12.3 |
| Build tool | Vite 5.1 |
| Language | TypeScript 5.3 (strict) |
| Storage | IndexedDB via `idb` (hot) + fetch (cold) |
| Unit tests | Vitest 1.3 |
| E2E tests | Playwright 1.56 |
| Linting | ESLint 8.56 + TypeScript plugin |
| Hosting | GitHub Pages (base path `/<repo>/`) |

---

## Data Flow Summary

```
Editor Mode:   User touch → Tool handler → IndexedDB → Canvas re-render
Playtest Mode: IndexedDB → Runtime loader → Phaser scene → SceneHost → PresetManager + ScriptHost → ApiContext
Game Mode:     GitHub fetch → Runtime loader → Phaser scene → Game loop
Deploy:        IndexedDB → SHA conflict check → GitHub API → Repository → Pages rebuild
```

---

## Current Status

- **Active track**: Track 53 — Asset Grouping: Painting Palette — **COMPLETE**
- **Next track**: Track 54 (see `/context/track-index.md`)
- **Current phase**: Phase 7 (Touch + Interaction) — in progress

Completed phases: Foundation (1–4), Editor Shell (5–9), Playtest & Deploy (10–13), Full Tilemap Editing (14–18), Entity System (19–22), Editor Architecture Migration (23–30), Presets + Blockly (31–42), Integration + Polish (43–46), Touch + Interaction tracks 51–53.

---

## Context Refresh (use when resuming after a break)

Paste this to Claude when resuming a stalled track or switching agents:

```
Read /AGENTS.md first. Then read:
- /INDEX.md
- /context/repo-map.md
- /context/schema-registry.md
- /context/architecture.md
- /context/active-track.md
- the active track's spec.md / blueprint.md / plan.md

Respond with:
1) Current track + phase + next task.
2) Relevant invariants for this work.
3) Files you intend to touch and why.
4) Verification steps for this phase.
5) Any conflicts, missing info, or risks you see before coding.
```
