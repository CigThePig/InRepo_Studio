# Tracks 23-30: Editor V2 Migration — Spec

## Goal

Transform InRepo Studio from a layer-centric, popup-based editor into a mode-driven, intent-based editor following the Editor V2 Architecture specification. This migration consolidates scattered UI controls into purposeful regions (top bar, bottom bar, right berry, left berry) and establishes a single `editorMode` state as the primary editing model.

## Authority

All implementation must follow `/context/editor-v2-architecture.md`. If any existing system conflicts with that spec, the spec wins.

---

## User Story

As a mobile game developer using InRepo Studio, I want to edit my game world by choosing what I'm working on (ground, props, entities, collision, triggers) rather than juggling separate "layer" and "tool" concepts, so that the editing workflow feels natural and intent-driven.

---

## Scope Summary

### Track 23 — Bottom Interaction Strip
Replace floating selection popups with a contextual action strip in the bottom bar.

### Track 24 — Top Bar Globalization
Make the top bar global-only (Undo/Redo/Settings/Play); remove tool/layer controls from it.

### Track 25 — Right Berry Shell + Mode State
Introduce the right berry slide-out panel and convert the editor to mode-driven architecture.

### Track 26 — Entities Mode + Move-First Behavior
Implement entity interaction consistent with Editor V2 (no popup inspector, move-first selection).

### Track 27 — Left Berry Shell + Sprite Slicing MVP
Introduce the left berry slide-out panel with sprite sheet slicing capability.

### Track 28 — Asset Library + Grouping System
Make asset grouping a first-class concept with an Assets Library in the left berry.

### Track 29 — GitHub Folder ↔ Group Mirroring
Map UI asset groupings directly to GitHub repository folder structure.

### Track 30 — Asset Upload + Editor V2 Completion
Complete the asset pipeline (import → slice → group → upload → use) and finalize Editor V2.

---

## Detailed Scope

### Track 23 — Bottom Interaction Strip

**In Scope:**
- Add bottom context strip area to bottom bar
- Show tile selection actions (copy, paste, delete, fill, cancel) when tiles selected
- Show entity selection actions (duplicate, delete, clear) when entities selected
- Keep floating selection bars behind feature flag (temporary fallback)

**Out of Scope:**
- Trigger selection actions (future)
- Full bottom bar redesign beyond context strip

**Legacy Systems Replaced:**
- `selectionBar.ts` (tile selection popup)
- `entitySelectionBar.ts` (entity selection popup)

### Track 24 — Top Bar Globalization

**In Scope:**
- Move Undo/Redo into top bar
- Add Settings button to top bar
- Add Test/Play button to top bar
- Remove layer UI from top bar
- Ensure no editing tools depend on top bar

**Out of Scope:**
- Layer panel redesign (handled by right berry)
- Scene selector changes

**Legacy Systems Replaced:**
- Undo/Redo UI in bottom panel
- Layer control elements in top panel

### Track 25 — Right Berry Shell + Mode State

**In Scope:**
- Add right berry slide-out panel
- Add tabs: Ground, Props, Entities, Collision, Triggers
- Implement single `editorMode` state variable
- Switching tabs sets editorMode
- Map existing tools internally to each mode
- Berry open/close behavior (Option A: closing forces select mode)

**Out of Scope:**
- Full palette redesign per mode (progressive enhancement)
- Props and Triggers full implementation (skeleton only)

**Legacy Systems Replaced:**
- Tool + layer dual-state system

### Track 26 — Entities Mode + Move-First Behavior

**In Scope:**
- Formalize "Entities mode" as an editor mode
- Selecting entity allows immediate movement (no popup)
- Remove popup property inspector
- Show entity parameters inside Entities berry tab
- Multi-select entity support

**Out of Scope:**
- Complex entity property types (future)
- Entity prefabs

**Legacy Systems Replaced:**
- Popup entity inspector on selection

### Track 27 — Left Berry Shell + Sprite Slicing MVP

**In Scope:**
- Add left berry slide-out panel
- Add Sprites/Slices tab
- Import image (sprite sheet)
- Slice grid (16×16, 32×32, custom)
- Preview overlay for slice grid
- Output sprites to in-editor asset library

**Out of Scope:**
- Animation tool
- Prefabs
- Advanced sprite editing

### Track 28 — Asset Library + Grouping System

**In Scope:**
- Add Assets Library tab in left berry
- Group assets by name (trees, goblin, etc.)
- View groups in library
- Select asset from library for placement/paint
- Delete asset entries (local)
- Right berry palettes pull from these groupings

**Out of Scope:**
- Drag-and-drop reordering
- Bulk operations

### Track 29 — GitHub Folder ↔ Group Mirroring

**In Scope:**
- Define canonical asset paths (`game/assets/props/<group>/`, etc.)
- Scan repo folders to build group list
- Slugify group names for safe folder creation
- Ensure UI group names sync with folder names

**Out of Scope:**
- Rename operations on existing folders
- Folder deletion

### Track 30 — Asset Upload + Editor V2 Completion

**In Scope:**
- Upload grouped assets to GitHub via existing auth system
- Commit files to correct folders
- Refresh editor asset registry from repo
- Hide layer panel by default (optional/advanced)
- Full end-to-end workflow: import → slice → group → upload → use

**Out of Scope:**
- Asset versioning
- Bulk upload optimization

---

## Acceptance Criteria

### Track 23 — Bottom Interaction Strip
- [ ] No selection actions appear as floating popups during normal use
- [ ] Bottom strip dynamically changes based on current selection
- [ ] Tile selection shows: Move, Copy, Paste, Delete, Fill, Cancel
- [ ] Entity selection shows: Duplicate, Delete, Clear
- [ ] Feature flag can restore floating bars for testing

### Track 24 — Top Bar Globalization
- [ ] Top bar contains only: Undo, Redo, Settings, Test/Play
- [ ] Top bar never changes based on editing mode
- [ ] Undo/Redo work from top bar
- [ ] Settings button opens settings (existing or placeholder)
- [ ] Test/Play launches playtest

### Track 25 — Right Berry Shell + Mode State
- [ ] Right berry slides out from right side
- [ ] Five tabs visible: Ground, Props, Entities, Collision, Triggers
- [ ] Switching tabs changes `editorMode`
- [ ] `editorMode` is single source of truth for editing context
- [ ] Closing berry returns to Select mode
- [ ] User can edit ground/props/collision/triggers via berry tabs

### Track 26 — Entities Mode + Move-First Behavior
- [ ] Selecting entity allows immediate drag/move
- [ ] No popup opens when selecting entity
- [ ] Entity parameters editable in Entities tab
- [ ] Multi-select works with move-first behavior
- [ ] Undo/redo works for entity operations

### Track 27 — Left Berry Shell + Sprite Slicing MVP
- [ ] Left berry slides out from left side
- [ ] Sprites/Slices tab available
- [ ] Can import an image file
- [ ] Can select slice size (16×16, 32×32, custom)
- [ ] Preview overlay shows slice grid
- [ ] Sliced sprites appear in asset library

### Track 28 — Asset Library + Grouping System
- [ ] Assets Library tab shows grouped assets
- [ ] Groups have names (e.g., "trees", "goblin")
- [ ] Can select asset from library
- [ ] Selected asset usable in right berry palettes
- [ ] Props, entities, paint palettes driven by asset groups

### Track 29 — GitHub Folder ↔ Group Mirroring
- [ ] Group names map to folder structure
- [ ] Folder structure: `game/assets/{tilesets,props,entities}/<group>/`
- [ ] Scanning repo folders builds group list
- [ ] Group names slugified safely
- [ ] UI groupings reflect repo state

### Track 30 — Asset Upload + Editor V2 Completion
- [ ] Can upload assets to GitHub
- [ ] Files committed to correct group folders
- [ ] Asset registry refreshes after upload
- [ ] Full workflow works: import → slice → group → upload → use
- [ ] Layer panel hidden by default (accessible via advanced)
- [ ] Editor V2 acceptance tests pass (see editor-v2-architecture.md §9)

---

## Global Acceptance (End of Track 30)

By the end of Track 30, a user can:

1. Use top bar for Undo/Redo/Settings/Play and nothing else
2. Use bottom-left selection tool as the main selection anchor
3. See selection actions in the bottom bar context strip, not floating popups
4. Open right berry and switch modes via tabs
5. Select and move an entity without any popup opening
6. Edit entity parameters inside Entities tab UI
7. Open left berry, import a sprite sheet, slice it, and see results in asset library
8. Assign assets to groups and have those groups mirror GitHub folders
9. Commit new assets to GitHub under the correct group folder paths
10. Reload and see groupings and assets rehydrated from repo structure

---

## Risks

### High Risk
1. **State Migration Complexity**: Converting from layer+tool to mode-driven requires careful state management
   - Mitigation: Phased migration, clear mapping from old to new state
2. **Legacy System Entanglement**: Existing tools depend on layer/tool dual-state
   - Mitigation: Create adapter layer, remove legacy incrementally
3. **Asset Pipeline Scope Creep**: Slicing/library could grow unbounded
   - Mitigation: MVP scope strictly defined, defer advanced features

### Medium Risk
4. **UI Layout Space**: Berry panels on mobile may feel cramped
   - Mitigation: Collapsible by default, touch-optimized sizing
5. **GitHub API Rate Limits**: Asset uploads could hit limits
   - Mitigation: Batch commits, use existing rate limit handling

### Low Risk
6. **Feature Flag Cleanup**: Forgetting to remove legacy code
   - Mitigation: Explicit cleanup task in Track 30

---

## Verification Summary

- Manual: Test each track's completion criteria on mobile device
- Manual: Full end-to-end workflow test after Track 30
- Automated: `npm run build` succeeds after each phase
- Automated: `npm run lint` passes
- Automated: TypeScript strict mode compliance

---

## Dependencies

- Tracks 1-22 must be complete (schemas, storage, basic editor, entity system)
- GitHub authentication (Track 12) for asset upload
- Deploy flow (Track 13) for commit operations

---

## Non-Goals (explicitly out of scope)

Per `/context/editor-v2-architecture.md` §10:
- Full pixel art editor
- Advanced animation timeline
- Complex prefab system
- Autotiling rules
- Major rendering engine rewrite
- Multiplayer collaboration

---

## Notes

- All tracks share the authority of `/context/editor-v2-architecture.md`
- Legacy systems may coexist temporarily behind feature flags
- Once a new system reaches parity, legacy must be removed
- Core editing flows must never regress: paint, place props, place/move entities, collision, triggers, undo/redo
