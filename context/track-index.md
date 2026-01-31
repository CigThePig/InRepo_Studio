# Track Index (Roadmap → Tracks)

Purpose:
- Defines the ordered track sequence for building InRepo Studio.
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

## Phase 0: Foundation Architecture

### Track 1 — Data Structures (0.1)
Goal: Define the JSON schemas that everything else reads and writes.
Includes:
1. Define `project.json` schema (metadata, tile categories, entity types, settings)
2. Define scene JSON schema (metadata, layers, tileset refs, entity instances)
3. Define entity definition schema (type, properties, constraints)
4. Create example project files for testing
Acceptance:
- TypeScript types exist for all schemas
- Example files validate against schemas
- Schemas documented in schema-registry.md
Risks:
- Schema changes later require migrations
Verification:
- Manual: Review schema completeness
- Automated: Type-check example files

### Track 2 — Hot Storage / IndexedDB (0.2)
Goal: Implement browser-side persistence for instant saves and offline editing.
Includes:
1. IndexedDB initialization with versioning
2. Project save/load functions
3. Scene save/load functions
4. Editor state persistence (tool, viewport, panel states)
5. Storage quota check and warning
6. Data export/import (JSON blob)
Acceptance:
- Save → refresh → load restores state
- Export → import round-trips cleanly
- Quota warning appears when approaching limits
Risks:
- IndexedDB corruption handling
- Browser storage limits vary
Verification:
- Manual: Full save/load cycle
- Automated: Round-trip test

### Track 3 — Cold Storage / Fetch (0.3)
Goal: Implement reading published project data from the repository.
Includes:
1. project.json loader via fetch
2. Scene loader via fetch
3. Asset URL resolver
4. Cold-to-hot migration (initial load)
5. Freshness check (ETag/Last-Modified)
Acceptance:
- Can load project from /game/project.json
- Migration populates IndexedDB on first run
- Freshness check detects remote changes
Risks:
- CORS issues on some hosting
- Cache invalidation
Verification:
- Manual: Load from deployed site
- Automated: Mock fetch tests

### Track 4 — Boot System (0.4)
Goal: Implement the entry point that routes to editor or game mode.
Includes:
1. Query string parser (?tool=editor)
2. Mode router (editor vs game)
3. Editor initialization sequence
4. Game initialization sequence
5. Shared asset preloading
Acceptance:
- ?tool=editor opens editor mode
- No query string plays game
- Editor restores last state on reload
Risks:
- Mode switching edge cases
Verification:
- Manual: Test both modes
- Automated: Boot sequence tests

---

## Phase 1: Editor Shell

### Track 5 — Canvas System (1.1)
Goal: Create the central workspace with pan/zoom and grid.
Includes:
1. Canvas container (responsive sizing)
2. Pan gesture (two-finger drag)
3. Zoom gesture (pinch)
4. Viewport state (pan offset, zoom level, coordinate transforms)
5. Grid rendering (toggle, color, opacity)
6. Viewport persistence
Acceptance:
- Smooth pan/zoom on mobile
- Grid scales correctly with zoom
- Viewport restored on reload
Risks:
- Touch gesture conflicts
- Performance at high zoom
Verification:
- Manual: Test on actual mobile device
- Automated: Coordinate transform tests

### Track 6 — Panels + Tile Picker (1.2, 1.3, 2.1 minimal)
Goal: Create the collapsible panels and minimal tile selection.
Includes:
1. Top panel container (collapsed/expanded)
2. Bottom panel container (collapsed/expanded, toolbar)
3. Panel state persistence
4. Tile category tabs
5. Tile grid display
6. Tile selection
Acceptance:
- Panels expand/collapse smoothly
- Can select a tile from picker
- Panel states persist across reload
Risks:
- Panel height vs keyboard
- Touch targets too small
Verification:
- Manual: Test expand/collapse, tile selection
- Automated: State persistence test

### Track 7 — Tilemap Rendering (2.2)
Goal: Display the current map state on canvas.
Includes:
1. Tilemap renderer (visible tiles only)
2. Layer rendering order
3. Collision/trigger layer visualization
4. Layer opacity (dim inactive)
5. Tile hover highlight
Acceptance:
- All layers render in correct order
- Culling works (only visible tiles drawn)
- Hover highlight follows finger with offset
Risks:
- Performance with many tiles
- Layer z-ordering bugs
Verification:
- Manual: Visual inspection of layers
- Automated: Render call count test

### Track 8 — Paint Tool (2.3 minimal)
Goal: Place tiles on the map with touch.
Includes:
1. Single tile paint (tap to place)
2. Drag painting (continuous)
3. Paint to active layer
4. Touch offset system
5. Auto-save after paint
Acceptance:
- Tap places tile at offset position
- Drag paints continuous line
- Changes persist to IndexedDB
Risks:
- Touch offset feels wrong
- Accidental paints when panning
Verification:
- Manual: Paint, refresh, verify tiles present
- Automated: Paint operation test

### Track 9 — Touch Foundation (1.4)
Goal: Establish core touch handling that tools build on.
Includes:
1. Touch event routing (canvas vs UI)
2. Touch offset calibration
3. Brush cursor display
4. Gesture disambiguation (tool vs pan)
5. Long-press detection
Acceptance:
- Single finger uses tool, two fingers pan
- Cursor shows paint position above finger
- No accidental paints when starting pan
Risks:
- Gesture timing too sensitive
Verification:
- Manual: Test gesture transitions
- Automated: Event routing tests

---

## Phase 2: Playtest & Deploy (Vertical Slice Completion)

### Track 10 — Playtest Bridge (4.1)
Goal: Launch the game from editor with hot data.
Includes:
1. Playtest trigger (button saves state)
2. Runtime data source flag
3. Hot mode data loading in runtime
4. Playtest viewport/overlay
5. Return to editor
6. Start at current scene option
Acceptance:
- Playtest shows current edits
- Return to editor preserves state
- Can start from any scene
Risks:
- State sync issues
Verification:
- Manual: Edit → playtest → verify changes visible
- Automated: Data source switching test

### Track 11 — Runtime Loader (4.2)
Goal: Phaser integration that loads InRepo Studio data.
Includes:
1. Project loader (hot or cold)
2. Scene loader
3. Tilemap instantiation in Phaser
4. Entity registry and spawner
5. Scene transition support
Acceptance:
- Game runs with loaded data
- Entities spawn with correct properties
- Scene transitions work
Risks:
- Phaser API compatibility
- Memory management
Verification:
- Manual: Play through multiple scenes
- Automated: Loader unit tests

### Track 12 — Authentication (5.1)
Goal: Manage GitHub access for deployment.
Includes:
1. PAT input UI with instructions
2. Token validation (test API call)
3. Session storage (default)
4. Persistent storage option
5. Forget token function
6. Token scope guidance
Acceptance:
- Can enter and validate token
- Token persists per user preference
- Clear feedback on invalid token
Risks:
- Token security on shared devices
Verification:
- Manual: Full token flow
- Automated: Validation logic test

### Track 13 — Deploy Flow (5.2)
Goal: Commit changes to GitHub.
Includes:
1. Change detection (hot vs cold)
2. SHA fetching for files
3. Conflict detection
4. Conflict resolution UI
5. File commit (single and multi)
6. Deploy success/error feedback
Acceptance:
- Detects which files changed
- Commits to correct branch
- Handles conflicts gracefully
Risks:
- GitHub API rate limits
- Partial commit failures
Verification:
- Manual: Full deploy cycle
- Automated: Mock API tests

---

## Phase 3: Full Tilemap Editing

### Track 14 — Erase Tool (2.4)
Goal: Remove tiles from the map.
Includes:
1. Single tile erase
2. Drag erasing
3. Erase brush size
4. Undo/redo integration
Acceptance:
- Erase works on active layer
- Undo restores erased tiles
Verification:
- Manual: Erase and undo

### Track 15 — Select Tool (2.5)
Goal: Select and manipulate tile regions.
Includes:
1. Rectangular selection
2. Move selection
3. Copy/paste selection
4. Delete selection
5. Flood fill
Acceptance:
- Can select, move, copy, paste regions
- Flood fill respects boundaries
Verification:
- Manual: Full selection workflow

### Track 16 — Undo/Redo System (2.3.4, 2.3.5)
Goal: Track and reverse editing operations.
Includes:
1. Undo stack with grouping
2. Redo stack
3. Undo/redo buttons
4. History limit
Acceptance:
- Undo reverses last operation
- Drag paints group as single undo
Verification:
- Manual: Multiple undo/redo cycles

### Track 17 — Scene Management (2.6)
Goal: Create and manage multiple scenes.
Includes:
1. Create new scene (with dialog)
2. Rename scene
3. Delete scene
4. Duplicate scene
5. Scene resize
6. Scene switching
Acceptance:
- Can create/delete/rename scenes
- Switching saves current scene first
Verification:
- Manual: Full scene lifecycle

### Track 18 — Layer System (1.2.4)
Goal: Full layer management in top panel.
Includes:
1. Layer visibility toggle
2. Layer lock toggle
3. Active layer selection
4. Layer reordering (stretch)
Acceptance:
- Can toggle visibility/lock per layer
- Painting respects locked layers
Verification:
- Manual: Layer operations

---

## Phase 4: Entity System

### Track 19 — Entity Palette (3.1)
Goal: Select entity types for placement.
Includes:
1. Entity category tabs
2. Entity type list
3. Entity type selection
4. Entity preview
Acceptance:
- Can browse and select entity types
Verification:
- Manual: Browse all entity types

### Track 20 — Entity Placement (3.2)
Goal: Add entities to scenes.
Includes:
1. Entity place mode
2. Default properties from schema
3. Entity rendering on canvas
4. Selection visual
5. Snap to grid option
6. Free positioning option
Acceptance:
- Entities appear at tap position
- Snap works correctly
Verification:
- Manual: Place entities with various settings

### Track 21 — Entity Manipulation (3.3)
Goal: Select, move, delete entities.
Includes:
1. Tap selection
2. Drag to move
3. Multi-entity selection
4. Delete entity
5. Duplicate entity
6. Undo/redo integration
Acceptance:
- Can select and move entities
- Undo works for entity operations
Verification:
- Manual: Full entity editing workflow

### Track 22 — Property Inspector (3.4)
Goal: Edit entity properties.
Includes:
1. Inspector panel layout
2. String property editor
3. Number property editor
4. Boolean property editor
5. Asset reference editor
6. Property validation
7. Multi-select editing
Acceptance:
- Can edit all property types
- Validation prevents invalid values
Verification:
- Manual: Edit properties of various types

---

## Phase 5: Export/Backup

### Track 23 — Export Functions (6.1)
Goal: Get data out of the browser.
Includes:
1. JSON export (project, scenes)
2. Full project export
3. ZIP export
4. Clipboard export
5. Export reminder system
Acceptance:
- Can export full project as download
- Reminder appears if not exported recently
Verification:
- Manual: Export and verify file contents

### Track 24 — Import Functions (6.2)
Goal: Restore from backups.
Includes:
1. JSON import with validation
2. Merge vs replace option
3. Import preview
4. ZIP import
5. Import validation errors
Acceptance:
- Import restores project state
- Invalid files show clear errors
Verification:
- Manual: Export → import round-trip

---

## Phase 6: Mobile UX Polish

### Track 25 — Touch Refinements (7.1)
Goal: Make interactions feel native.
Includes:
1. Touch offset calibration UI
2. Loupe/magnifier mode
3. Gesture tuning (sensitivity)
4. Haptic feedback
5. Edge panning
Acceptance:
- Touch offset feels natural
- Optional haptics work
Verification:
- Manual: Extended editing session

### Track 26 — Responsive Layout (7.2)
Goal: Adapt to different screens.
Includes:
1. Orientation detection
2. Landscape layout adjustment
3. Tablet layout
4. Safe area handling
5. Keyboard avoidance
Acceptance:
- UI works in portrait and landscape
- No content hidden by notches
Verification:
- Manual: Test various devices

### Track 27 — Performance (7.3)
Goal: Keep it smooth on mobile.
Includes:
1. Tile render batching
2. Lazy asset loading
3. Canvas resolution scaling
4. Throttled auto-save
5. Large scene handling
Acceptance:
- 60fps during normal editing
- Memory stays bounded
Verification:
- Manual: Performance profiling

---

## Phase 7: Settings

### Track 28 — Editor Settings (8.1)
Goal: User configuration.
Includes:
1. Settings panel
2. Grid settings
3. Touch settings
4. Display settings (theme, scale)
5. Workflow settings (auto-save, confirms)
6. Settings persistence
Acceptance:
- All settings work and persist
Verification:
- Manual: Change settings, verify effect

---

## Phase 8: Asset Upload (Stretch)

### Track 29 — Asset Upload (5.3)
Goal: Add new images to the repository.
Includes:
1. File picker
2. Image preview
3. Resize option
4. Category selection
5. Upload to GitHub
6. Update project.json
7. Progress feedback
Acceptance:
- Can upload new tiles to repo
- project.json updated correctly
Verification:
- Manual: Upload and use new tile

---

## Dependency Summary

Critical path tracks marked with ★

```
Track 1:  Data Structures (no deps) ★
Track 2:  Hot Storage (← 1) ★
Track 3:  Cold Storage (← 1) ★
Track 4:  Boot System (← 2, 3) ★
Track 5:  Canvas System (← 4) ★
Track 6:  Panels + Tile Picker (← 5) ★
Track 7:  Tilemap Rendering (← 5, 6) ★
Track 8:  Paint Tool (← 6, 7) ★
Track 9:  Touch Foundation (← 5) — not on critical path, but recommended before Track 10
Track 10: Playtest Bridge (← 2, 8) ★
Track 11: Runtime Loader (← 1, 2, 3) ★
Track 12: Authentication (← 6) ★
Track 13: Deploy Flow (← 2, 12) ★
Track 14-18: Full Editing (← 8)
Track 19-22: Entities (← 8)
Track 23-24: Export/Import (← 2)
Track 25-27: Polish (← Phase 3)
Track 28: Settings (← Phase 6)
Track 29: Asset Upload (← 13)
```
