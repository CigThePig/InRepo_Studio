# Phase 4: Entity System — Plan (Tracks 19-22 Bundle)

## Overview

This plan breaks the Entity System bundle into implementation phases with verification checklists and stop points. Each phase delivers a functional increment.

**Bundle Type**: Full Track Bundle
**Estimated Phases**: 8
**Tracks Covered**: 19 (Entity Palette), 20 (Entity Placement), 21 (Entity Manipulation), 22 (Property Inspector)

---

## Recon Summary

### Files Likely to Change

**New Files:**
- `src/editor/panels/entityPalette.ts` - Entity browsing UI
- `src/editor/tools/entity.ts` - Entity placement tool
- `src/editor/canvas/entityRenderer.ts` - Entity rendering
- `src/editor/entities/entityManager.ts` - Entity CRUD
- `src/editor/entities/entitySelection.ts` - Selection state
- `src/editor/panels/propertyInspector.ts` - Property editing

**Modified Files:**
- `src/editor/panels/bottomPanel.ts` - Add entity tool
- `src/editor/tools/select.ts` - Entity selection mode
- `src/editor/canvas/renderer.ts` - Entity layer integration
- `src/storage/hot.ts` - Entity editor state
- `src/editor/history/operations.ts` - Entity undo/redo
- `src/editor/init.ts` - Wire entity system

### Key Modules/Functions Involved

- Existing: Tool system, panel system, renderer, storage
- New: Entity manager, entity selection, property editors

### Invariants to Respect

- Hot/Cold boundary: Entity data saved to IndexedDB
- Touch-first interaction: Touch-friendly entity selection/placement
- No data loss: Auto-save after entity operations
- Schema compliance: EntityInstance matches schema in scene.ts

### Apply/Rebuild Semantics

- Entity changes: Live-applying (immediate render update)
- Property changes: Live-applying (immediate value update)

### Data Migration Impact

- Adding entity-related fields to EditorState
- Use defaults if missing on load

---

## Phase 1: Entity Palette Foundation (Track 19 - Part 1)

**Goal**: Create entity palette UI component with category tabs.

### Tasks

- [ ] Create `src/editor/panels/entityPalette.ts`
  - [ ] Define EntityPaletteConfig interface
  - [ ] Define EntityPalette interface
  - [ ] Create `createEntityPalette()` factory function
  - [ ] Implement palette container with header
  - [ ] Implement category tabs (derived from entityTypes)
  - [ ] Implement tab switching logic
  - [ ] Style consistent with existing panels
- [ ] Create category grouping utility
  - [ ] `groupEntityTypesByCategory()` function
  - [ ] Handle entities without category (use "All")
- [ ] Add entity palette state to `src/storage/hot.ts`
  - [ ] Add `selectedEntityType: string | null` to EditorState
  - [ ] Add `entityPaletteExpanded: boolean` to EditorState
  - [ ] Add defaults in getDefaultEditorState()

### Files Touched

- `src/editor/panels/entityPalette.ts` (new)
- `src/storage/hot.ts` (modify)

### Verification

- [ ] Entity palette renders with project entity types
- [ ] Category tabs display correctly
- [ ] Tab switching updates displayed entities
- [ ] Palette state initializes with defaults
- [ ] TypeScript compiles without errors
- [ ] `npm run build` succeeds

### Stop Point

Pause for review. Palette structure complete, selection not yet wired.

---

## Phase 2: Entity Palette Selection (Track 19 - Part 2)

**Goal**: Complete entity type selection and palette integration.

### Tasks

- [ ] Implement entity type list in palette
  - [ ] Entity type item component
  - [ ] Entity icon/placeholder rendering
  - [ ] Selection highlight
  - [ ] Touch-friendly sizing (≥44px)
- [ ] Implement entity type selection
  - [ ] `onEntitySelect` callback
  - [ ] Update EditorState.selectedEntityType
  - [ ] Visual selection feedback
- [ ] Integrate palette with bottom panel
  - [ ] Add entity tool button to tool list
  - [ ] Toggle palette visibility on entity tool select
  - [ ] Close palette when switching tools
- [ ] Update `src/editor/init.ts`
  - [ ] Wire entity palette creation
  - [ ] Connect selection to editor state
  - [ ] Persist palette state

### Files Touched

- `src/editor/panels/entityPalette.ts` (modify)
- `src/editor/panels/bottomPanel.ts` (modify)
- `src/editor/init.ts` (modify)

### Verification

- [ ] Entity types display with icons/names
- [ ] Tapping entity type selects it
- [ ] Selection visually highlighted
- [ ] Entity tool button appears in toolbar
- [ ] Selecting entity tool shows palette
- [ ] Switching tools hides palette
- [ ] Selection persists across reload
- [ ] `npm run build` succeeds

### Stop Point

Pause for review. Entity Palette (Track 19) functionally complete.

---

## Phase 3: Entity Rendering (Track 20 - Part 1)

**Goal**: Render entities on the canvas.

### Tasks

- [ ] Create `src/editor/canvas/entityRenderer.ts`
  - [ ] Define EntityRendererConfig interface
  - [ ] Implement `renderEntities()` function
  - [ ] Implement `renderEntity()` for single entity
  - [ ] Entity placeholder rendering (colored box + letter)
  - [ ] Scale with viewport zoom
  - [ ] Culling for off-screen entities
- [ ] Modify `src/editor/canvas/renderer.ts`
  - [ ] Import entityRenderer
  - [ ] Call renderEntities after tile layers
  - [ ] Pass entity data from scene
- [ ] Test entity rendering
  - [ ] Manually add entity to scene data
  - [ ] Verify entity appears on canvas
  - [ ] Verify zoom/pan behavior

### Files Touched

- `src/editor/canvas/entityRenderer.ts` (new)
- `src/editor/canvas/renderer.ts` (modify)

### Verification

- [ ] Entities render on canvas
- [ ] Entity placeholder shows type initial
- [ ] Entities scale with zoom
- [ ] Off-screen entities not rendered (culling)
- [ ] Entities render above tile layers
- [ ] TypeScript compiles without errors
- [ ] `npm run build` succeeds

### Stop Point

Pause for review. Entity rendering verified before placement tool.

---

## Phase 4: Entity Placement Tool (Track 20 - Part 2)

**Goal**: Implement entity placement via touch.

### Tasks

- [ ] Create `src/editor/tools/entity.ts`
  - [ ] Define EntityToolConfig interface
  - [ ] Define EntityTool interface
  - [ ] Implement `createEntityTool()` factory
  - [ ] Handle pointer down (place entity)
  - [ ] Handle pointer move (preview position)
  - [ ] Handle pointer up
  - [ ] Apply touch offset
- [ ] Create `src/editor/entities/entityManager.ts`
  - [ ] Define EntityManager interface
  - [ ] Implement `addEntity()` function
  - [ ] Implement `getEntity()` function
  - [ ] Auto-save integration
- [ ] Implement grid snap
  - [ ] `snapToGrid()` utility function
  - [ ] Add `entitySnapToGrid` to EditorState
  - [ ] Snap toggle in UI (optional)
- [ ] Implement entity instance creation
  - [ ] Generate unique entity ID
  - [ ] Copy default properties from type
  - [ ] Add to scene.entities array
- [ ] Wire entity tool to editor
  - [ ] Register entity tool in tool system
  - [ ] Connect to palette selection
  - [ ] Update renderer to show preview

### Files Touched

- `src/editor/tools/entity.ts` (new)
- `src/editor/entities/entityManager.ts` (new)
- `src/storage/hot.ts` (modify)
- `src/editor/init.ts` (modify)

### Verification

- [ ] Selecting entity + tapping canvas places entity
- [ ] Entity appears at correct position
- [ ] Touch offset applied correctly
- [ ] Grid snap works when enabled
- [ ] Entity gets unique ID
- [ ] Default properties populated
- [ ] Entity persists after reload
- [ ] `npm run build` succeeds

### Stop Point

Pause for review. Entity Placement (Track 20) complete.

---

## Phase 5: Entity Selection (Track 21 - Part 1)

**Goal**: Implement single entity selection and visual feedback.

### Tasks

- [ ] Create `src/editor/entities/entitySelection.ts`
  - [ ] Define EntitySelectionState interface
  - [ ] Implement selection state management
  - [ ] `selectEntity()`, `deselectEntity()`, `clearSelection()`
  - [ ] `isEntitySelected()` helper
- [ ] Refactor `src/editor/canvas/renderer.ts` (file >450 lines)
  - [ ] Extract entity rendering helpers into a dedicated module
- [ ] Add selection state to EditorState
  - [ ] Add `selectedEntityIds: string[]`
  - [ ] Add defaults
- [ ] Implement hit testing
  - [ ] `hitTestEntity()` function
  - [ ] Consider entity size for hit area
  - [ ] Add tolerance for easier touch selection
- [ ] Modify select tool for entities
  - [ ] Detect entity vs tile tap
  - [ ] Call entity selection on entity tap
  - [ ] Clear selection on empty tap
- [ ] Update entity renderer for selection
  - [ ] Draw selection box around selected entities
  - [ ] Selection visual (blue border or glow)

### Files Touched

- `src/editor/entities/entitySelection.ts` (new)
- `src/storage/hot.ts` (modify)
- `src/editor/tools/select.ts` (modify)
- `src/editor/canvas/entityRenderer.ts` (modify)

### Verification

- [ ] Tapping entity selects it
- [ ] Selected entity shows selection visual
- [ ] Tapping empty space deselects
- [ ] Tapping different entity switches selection
- [ ] Selection state in EditorState updated
- [ ] Selection persists briefly (or clears on tool switch)
- [ ] `npm run build` succeeds

### Stop Point

Pause for review. Single selection working before move/delete.

---

## Phase 6: Entity Move and Delete (Track 21 - Part 2)

**Goal**: Implement entity drag-to-move and delete operations.

### Tasks

- [ ] Implement drag-to-move
  - [ ] Detect drag start on selected entity
  - [ ] Track entity start positions
  - [ ] Move entities with pointer
  - [ ] Apply grid snap if enabled
  - [ ] Apply touch offset
  - [ ] Finalize position on pointer up
- [ ] Implement delete
  - [ ] `removeEntity()` in entityManager
  - [ ] Delete button/action for selected entity
  - [ ] Remove from scene.entities array
  - [ ] Clear selection after delete
  - [ ] Trigger auto-save
- [ ] Implement duplicate
  - [ ] `duplicateEntity()` in entityManager
  - [ ] Generate new ID for duplicate
  - [ ] Offset duplicate position
  - [ ] Copy all properties
- [ ] Implement multi-select (stretch for this phase)
  - [ ] Long-press to add to selection
  - [ ] Box selection (if time permits)
  - [ ] Move all selected entities together
  - [ ] Delete all selected entities

### Files Touched

- `src/editor/entities/entityManager.ts` (modify)
- `src/editor/entities/entitySelection.ts` (modify)
- `src/editor/tools/select.ts` (modify)
- `src/editor/panels/bottomPanel.ts` (modify - delete button)

### Verification

- [ ] Dragging selected entity moves it
- [ ] Entity position updates in real-time
- [ ] Position persists after release
- [ ] Grid snap works during move
- [ ] Delete removes entity from scene
- [ ] Delete triggers canvas redraw
- [ ] Duplicate creates offset copy
- [ ] Multi-select move works (if implemented)
- [ ] `npm run build` succeeds

### Stop Point

Pause for review. Core manipulation complete before undo/redo.

---

## Phase 7: Entity Undo/Redo (Track 21 - Part 3)

**Goal**: Integrate entity operations with undo/redo system.

### Tasks

- [ ] Define entity operation types
  - [ ] Add entity operations to OperationType enum
  - [ ] Define EntityOperation interface
  - [ ] Capture old/new state for each operation type
- [ ] Implement undo for entity operations
  - [ ] Undo add (remove entity)
  - [ ] Undo delete (restore entity)
  - [ ] Undo move (restore position)
  - [ ] Undo duplicate (remove duplicate)
- [ ] Implement redo for entity operations
  - [ ] Redo add (re-add entity)
  - [ ] Redo delete (re-delete entity)
  - [ ] Redo move (re-apply position)
  - [ ] Redo duplicate (re-duplicate)
- [ ] Push operations to history stack
  - [ ] After entity add
  - [ ] After entity delete
  - [ ] After entity move (on drag end)
  - [ ] After entity duplicate
- [ ] Update `src/editor/history/operations.ts`
  - [ ] Add entity operation handlers
  - [ ] Register with history system

### Files Touched

- `src/editor/history/operations.ts` (modify)
- `src/editor/entities/entityManager.ts` (modify)
- `src/editor/tools/entity.ts` (modify)
- `src/editor/tools/select.ts` (modify)

### Verification

- [ ] Undo reverses entity add
- [ ] Undo reverses entity delete
- [ ] Undo reverses entity move
- [ ] Undo reverses entity duplicate
- [ ] Redo reapplies all operations
- [ ] Multiple undo/redo cycles work correctly
- [ ] History integrates with existing undo/redo UI
- [ ] `npm run build` succeeds

### Stop Point

Pause for review. Entity Manipulation (Track 21) complete.

---

## Phase 8: Property Inspector (Track 22)

**Goal**: Implement property inspector panel for editing entity properties.

### Tasks

- [ ] Create `src/editor/panels/propertyInspector.ts`
  - [ ] Define PropertyInspectorConfig interface
  - [ ] Define PropertyInspector interface
  - [ ] Create `createPropertyInspector()` factory
  - [ ] Inspector panel layout (header, properties list)
  - [ ] Display entity type name and ID
  - [ ] Scrollable property list
  - [ ] Close button/dismiss handler
- [ ] Implement property editors
  - [ ] String property editor (text input)
  - [ ] Number property editor (numeric input)
  - [ ] Boolean property editor (toggle switch)
  - [ ] Asset reference editor (dropdown/picker)
- [ ] Implement property validation
  - [ ] Validate on change using existing `validatePropertyValue()`
  - [ ] Show error state for invalid values
  - [ ] Prevent saving invalid values
  - [ ] Display constraint hints (min, max, etc.)
- [ ] Implement multi-select editing
  - [ ] Detect multiple selected entities
  - [ ] Show common properties only
  - [ ] Handle mixed values (placeholder)
  - [ ] Apply changes to all selected
- [ ] Add property change to undo/redo
  - [ ] Track old/new values
  - [ ] Push operation on value commit
  - [ ] Undo restores old values
- [ ] Wire inspector to selection
  - [ ] Show inspector when entity selected
  - [ ] Update inspector on selection change
  - [ ] Hide inspector when deselected
- [ ] Update schema-registry.md
  - [ ] Document new EditorState fields
  - [ ] Document entity operation types
- [ ] Update INDEX.md with new files
  - [ ] Add all new entity system files

### Files Touched

- `src/editor/panels/propertyInspector.ts` (new)
- `src/editor/entities/entitySelection.ts` (modify)
- `src/editor/history/operations.ts` (modify)
- `src/editor/init.ts` (modify)
- `context/schema-registry.md` (modify)
- `INDEX.md` (modify)

### Verification

- [ ] Inspector appears when entity selected
- [ ] Inspector shows entity type and ID
- [ ] String properties editable
- [ ] Number properties editable with validation
- [ ] Boolean properties toggleable
- [ ] Asset ref properties show dropdown
- [ ] Invalid values rejected with error
- [ ] Multi-select shows common properties
- [ ] Mixed values show placeholder
- [ ] Property changes undoable
- [ ] All changes persist after reload
- [ ] `npm run build` succeeds
- [ ] `npm run lint` passes

### Stop Point

Phase complete. Track 22 and Phase 4 Bundle complete.

---

## Risk Checkpoints

### Before Phase 1
- Review existing panel architecture
- Confirm project.entityTypes structure

### Before Phase 3
- Test palette with various entity type configurations
- Plan entity rendering approach

### Before Phase 5
- Verify entity placement working correctly
- Plan selection UX for touch

### Before Phase 8
- Test all manipulation operations
- Plan property editor components

### End of Bundle

Full manual test cycle:
1. Open entity palette
2. Browse categories and types
3. Select entity type
4. Place multiple entities
5. Select placed entity
6. Move entity by dragging
7. Duplicate entity
8. Delete entity
9. Undo all operations
10. Redo all operations
11. Edit entity properties
12. Test all property types
13. Multi-select and batch edit
14. Reload and verify persistence
15. Test on mobile device

---

## Rollback Plan

If issues arise:
- Phase 1-2: Remove palette, revert state
- Phase 3-4: Keep palette, disable placement
- Phase 5-7: Keep placement, disable manipulation
- Phase 8: Keep manipulation, use console for properties

---

## INDEX.md Updates

After completion, add:

```markdown
- `src/editor/panels/entityPalette.ts`
  - Role: Entity type browsing and selection UI.
  - Lists of truth: EntityPaletteConfig

- `src/editor/tools/entity.ts`
  - Role: Entity placement tool handling.
  - Lists of truth: EntityToolConfig

- `src/editor/canvas/entityRenderer.ts`
  - Role: Entity rendering on canvas.
  - Lists of truth: EntityRendererConfig

- `src/editor/entities/entityManager.ts`
  - Role: Entity CRUD operations.
  - Lists of truth: EntityManager interface

- `src/editor/entities/entitySelection.ts`
  - Role: Entity selection state management.
  - Lists of truth: EntitySelectionState

- `src/editor/panels/propertyInspector.ts`
  - Role: Entity property editing UI.
  - Lists of truth: PropertyInspectorConfig
```

---

## schema-registry.md Updates

After completion, update EditorStateSchema:

```markdown
- `EditorStateSchema` — persisted editor state
  - Keys: currentSceneId, currentTool, activeLayer, selectedTile{}, viewport{}, panelStates{}, brushSize, layerVisibility{}, layerLocks{}, selectedEntityType, entityPaletteExpanded, selectedEntityIds[], entitySnapToGrid
  - Apply mode: live (restored on load)
```

Add new entries:

```markdown
### Entity System (Tracks 19-22)

- `/src/editor/entities/entityManager.ts`
  - `EntityManager` — entity CRUD operations interface
    - Methods: addEntity, removeEntity, moveEntity, duplicateEntity, getEntity
    - Invariant: entity IDs unique within scene

- `/src/editor/entities/entitySelection.ts`
  - `EntitySelectionState` — selection tracking
    - Keys: selectedIds[]
    - Apply mode: live

- `/src/editor/history/operations.ts`
  - `EntityOperationType` — entity undo/redo operations
    - Values: entity_add, entity_delete, entity_move, entity_duplicate, entity_property_change
```

---

## Notes

- Entity types must exist in project.entityTypes before placement
- Entity positions are in world pixels, not tile coordinates
- Touch offset from existing system applies to entity operations
- Undo/redo should group consecutive property edits
- Property inspector closes on entity deselection
- Multi-select uses long-press gesture for mobile
- Entity rendering uses simple placeholders initially (sprites later)
