# Track Index (Roadmap → Tracks)

Purpose:
- Defines the ordered track sequence for building InRepo Studio. Tracks are added as phases expand — do not assume a fixed count.
- Each Track is a bounded unit of work that produces a verifiable improvement.

Each Track must produce:
- spec.md (intent + acceptance)
- blueprint.md (technical design: files/APIs/state/risks; **NO CODE**)
- plan.md (phases + verification per phase + stop points)

Rules:
- Follow track order unless explicitly overridden.
- Tracks should be achievable without touching too many systems at once.
- Update `INDEX.md`, `context/repo-map.md`, and `context/schema-registry.md` when relevant.

---

## Critical Path (Vertical Slice)

The minimum to prove the architecture:

```
Track 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 10 → 11 → 12 → 13
```

| Step | Track | Name | Phase |
|------|-------|------|-------|
| 1 | Track 1 | Data Structures | 0.1 |
| 2 | Track 2 | Hot Storage | 0.2 |
| 3 | Track 3 | Cold Storage | 0.3 |
| 4 | Track 4 | Boot System | 0.4 |
| 5 | Track 5 | Canvas System | 1.1 |
| 6 | Track 6 | Panels + Tile Picker | 1.2, 1.3, 2.1 |
| 7 | Track 7 | Tilemap Rendering | 2.2 |
| 8 | Track 8 | Paint Tool | 2.3 |
| 9 | Track 10 | Playtest Bridge | 4.1 |
| 10 | Track 11 | Runtime Loader | 4.2 |
| 11 | Track 12 | Authentication | 5.1 |
| 12 | Track 13 | Deploy Flow | 5.2 |

**Note on Track 9**: Touch Foundation (1.4) refines gesture disambiguation and touch offset calibration. It's recommended before Track 10 for polish, but basic painting works without it. Include it if touch interactions feel imprecise.

This gets you to: open editor → paint tiles → playtest locally → deploy → verify on live site.

---

> Completed tracks are archived. Full docs in /tracks/archive/ and /context/history.md.

## Phase 0 — Foundation Architecture

- Track 1 — Data Structures ✅ (TypeScript schemas for project, scene, and entity JSON)
- Track 2 — Hot Storage ✅ (IndexedDB save/load for projects, scenes, and editor state)
- Track 3 — Cold Storage ✅ (GitHub fetch operations with migration support)
- Track 4 — Boot System ✅ (mode router for editor vs game, Vite/Phaser scaffolding)

## Phase 1 — Editor Shell

- Track 5 — Canvas System ✅ (viewport with pan/zoom gestures, grid overlay, coordinate transforms)
- Track 6 — Panels + Tile Picker ✅ (panel layout, tile picker UI, tileset display)
- Track 7 — Tilemap Rendering ✅ (Phaser tilemap rendering with culling)
- Track 8 — Paint Tool ✅ (tile painting with drag support)
- Track 9 — Touch Foundation ✅ (gesture disambiguation, touch offset calibration)

## Phase 2 — Playtest & Deploy

- Track 10 — Playtest Bridge ✅ (editor→game handoff via hot storage)
- Track 11 — Runtime Loader ✅ (game runtime loads scenes from hot storage)
- Track 12 — Authentication ✅ (GitHub OAuth token flow)
- Track 13 — Deploy Flow ✅ (publish hot storage → GitHub Pages with SHA conflict check)

## Phase 3 — Full Tilemap Editing

- Track 14 — Erase Tool ✅ (tile erasing with drag support)
- Track 15 — Select Tool ✅ (rectangular tile selection, copy/paste/fill)
- Track 16 — Undo/Redo System ✅ (command history for all edit operations)
- Track 17 — Scene Management ✅ (create/rename/delete/switch scenes)
- Track 18 — Layer System ✅ (layer visibility and lock controls)

## Phase 4 — Entity System

- Track 19 — Entity Palette ✅ (browse and select entity types for placement)
- Track 20 — Entity Placement ✅ (place entities on canvas with snap-to-grid)
- Track 21 — Entity Manipulation ✅ (select, move, delete, duplicate entities)
- Track 22 — Property Inspector ✅ (edit all entity property types with validation)
- Tracks 23–30 — Editor Architecture Migration ✅ (mode-driven UI: bottom bar, berries, Right Berry modes, asset library, upload; see /context/editor-architecture.md)

## Phase 5 — Presets + Blockly

- Track 31 — Game API Contract ✅ (command/event/state surface types and naming conventions)
- Track 32 — Preset Schema ✅ (PresetDefinition shape and category types)
- Track 33 — Script Envelope ✅ (logic script JSON format and storage paths)
- Track 34 — Preset Registry ✅ (PresetManager with import.meta.glob loading)
- Track 35 — SceneHost + ApiContext ✅ (runtime attachment model and API context wiring)
- Track 36 — ScriptHost Engine ✅ (script execution engine with error isolation)
- Track 37 — Schema-Driven Block Generation ✅ (Blockly blocks generated from PresetDefinition schemas)
- Track 38 — Core Block Definitions ✅ (controls, movement, camera, animation block defs)
- Track 39 — Blockly Workspace UI ✅ (cockpit layout, workspace panel, toolbar)
- Track 40 — Right Berry Blocks Palette ✅ (block category browser in right berry)
- Track 41 — Presets UI + Blockly Hooks ✅ (left berry presets tab, knob editor, category detail, undo toast)

---

## Phase 6 — Integration + Polish

### Track 42 — Inspect/Errors Panel + Integration Polish
Goal: Implement the inspector/errors panel and polish cross-system integration.
Includes:
1. Inspect/Errors tab in right berry
2. Script status, error display with block highlight
3. End-to-end integration: edit → run → inspect → stop
Acceptance:
- Errors displayed with block ID and Logic Target
- Full edit → run → inspect cycle works
Verification:
- Manual: Trigger errors, verify display and recovery
