# Phase 4: Entity System — Spec (Tracks 19-22 Bundle)

## Overview

This bundle covers the complete Entity System for InRepo Studio, enabling users to browse, place, manipulate, and configure game entities on scenes. The entity system builds on the existing tilemap editing foundation (Phase 3) to provide a full game object authoring workflow.

**Bundled Tracks:**
- Track 19: Entity Palette (3.1)
- Track 20: Entity Placement (3.2)
- Track 21: Entity Manipulation (3.3)
- Track 22: Property Inspector (3.4)

---

## Track 19: Entity Palette

### Goal

Enable users to browse and select entity types for placement from a categorized palette.

### User Story

As a mobile game developer, I want to browse available entity types in an organized palette so that I can quickly find and select the entity I want to place in my scene.

### Scope

**In Scope:**
1. Entity category tabs (group entity types by category)
2. Entity type list (display entities within selected category)
3. Entity type selection (select entity for placement)
4. Entity preview (show entity visual/icon before placing)

**Out of Scope (deferred):**
- Custom entity type creation (uses project.json definitions)
- Entity type search/filter
- Entity favorites/recents
- Drag-to-place from palette

### Acceptance Criteria

1. **Entity Category Tabs**
   - [ ] Tabs display all entity categories from project.entityTypes
   - [ ] Tapping tab switches to that category
   - [ ] Active tab is visually highlighted
   - [ ] Tabs are touch-friendly (≥44px targets)

2. **Entity Type List**
   - [ ] Displays all entity types in selected category
   - [ ] Shows entity name and icon/preview
   - [ ] Scrollable if many entities
   - [ ] Empty state shown for categories with no entities

3. **Entity Type Selection**
   - [ ] Tapping entity type selects it for placement
   - [ ] Selected entity visually highlighted
   - [ ] Selection persists until changed or tool switched
   - [ ] Selection triggers entity place mode

4. **Entity Preview**
   - [ ] Preview shows entity icon or placeholder
   - [ ] Preview visible in palette item
   - [ ] Clear visual distinction from tiles

### Verification

- Manual: Browse all entity categories and types
- Manual: Select entity, verify highlighted
- Manual: Test on mobile device for touch targets
- Automated: Entity list population test

---

## Track 20: Entity Placement

### Goal

Enable users to place selected entity types onto the scene canvas.

### User Story

As a mobile game developer, I want to tap on the canvas to place entities at specific locations so that I can populate my scenes with game objects.

### Scope

**In Scope:**
1. Entity place mode (distinct from tile painting)
2. Default properties from entity type schema
3. Entity rendering on canvas
4. Selection visual for placed entities
5. Snap to grid option
6. Free positioning option

**Out of Scope (deferred):**
- Multi-entity stamp placement
- Entity rotation on placement
- Entity scaling on placement
- Batch entity placement

### Acceptance Criteria

1. **Entity Place Mode**
   - [ ] Selecting entity in palette activates place mode
   - [ ] Place mode visually indicated in UI
   - [ ] Single tap places entity at position
   - [ ] Touch offset respected (cursor above finger)
   - [ ] Mode deactivates when switching to other tools

2. **Default Properties**
   - [ ] New entity instances get default values from type schema
   - [ ] All required properties populated
   - [ ] Properties stored in entity instance

3. **Entity Rendering**
   - [ ] Placed entities visible on canvas
   - [ ] Entity icon/sprite rendered at position
   - [ ] Entities render above tile layers
   - [ ] Entities scale with zoom
   - [ ] Entities visible when panning

4. **Selection Visual**
   - [ ] Newly placed entity briefly highlighted
   - [ ] Selection box or glow effect
   - [ ] Clear visual distinction from background

5. **Snap to Grid**
   - [ ] Toggle for grid snapping
   - [ ] When enabled, entities snap to tile grid
   - [ ] Snap position shown during placement
   - [ ] Grid size matches scene tile size

6. **Free Positioning**
   - [ ] When snap disabled, pixel-perfect placement
   - [ ] Entity placed at exact touch position (with offset)
   - [ ] No grid constraint

### Verification

- Manual: Place entities with snap enabled and disabled
- Manual: Verify default properties populated
- Manual: Check entity rendering at various zoom levels
- Automated: Entity instance creation test

---

## Track 21: Entity Manipulation

### Goal

Enable users to select, move, and delete existing entities on the scene.

### User Story

As a mobile game developer, I want to select and move entities I've placed so that I can adjust their positions, and delete entities I no longer need.

### Scope

**In Scope:**
1. Tap selection (select single entity)
2. Drag to move (reposition selected entity)
3. Multi-entity selection
4. Delete entity (remove from scene)
5. Duplicate entity
6. Undo/redo integration

**Out of Scope (deferred):**
- Entity rotation
- Entity scaling
- Entity grouping
- Cut/copy/paste entities across scenes
- Alignment/distribution tools

### Acceptance Criteria

1. **Tap Selection**
   - [ ] Tapping entity selects it
   - [ ] Selected entity shows selection indicator
   - [ ] Tapping empty space deselects
   - [ ] Tapping different entity switches selection
   - [ ] Selection works when in select tool mode

2. **Drag to Move**
   - [ ] Dragging selected entity moves it
   - [ ] Movement respects snap setting
   - [ ] Movement respects touch offset
   - [ ] Entity position updates in real-time
   - [ ] Position persists after release

3. **Multi-Entity Selection**
   - [ ] Long-press adds to selection
   - [ ] Box selection for multiple entities
   - [ ] Selected count shown in UI
   - [ ] Move affects all selected entities
   - [ ] Delete affects all selected entities

4. **Delete Entity**
   - [ ] Delete button removes selected entity(ies)
   - [ ] Confirmation for multiple entities (optional)
   - [ ] Entity removed from scene.entities array
   - [ ] Canvas updates immediately
   - [ ] Auto-save triggered

5. **Duplicate Entity**
   - [ ] Duplicate button creates copy of selected entity
   - [ ] Duplicate placed at offset position
   - [ ] Duplicate gets new unique ID
   - [ ] Duplicate has same properties as original

6. **Undo/Redo Integration**
   - [ ] Move operations are undoable
   - [ ] Delete operations are undoable
   - [ ] Duplicate operations are undoable
   - [ ] Undo restores entity positions/existence
   - [ ] Redo reapplies operations

### Verification

- Manual: Full entity selection, move, delete workflow
- Manual: Multi-select and batch operations
- Manual: Undo/redo for all entity operations
- Automated: Entity array manipulation tests

---

## Track 22: Property Inspector

### Goal

Enable users to view and edit the properties of selected entities.

### User Story

As a mobile game developer, I want to edit entity properties in an inspector panel so that I can configure entity behavior, appearance, and game logic parameters.

### Scope

**In Scope:**
1. Inspector panel layout (appears when entity selected)
2. String property editor
3. Number property editor
4. Boolean property editor
5. Asset reference editor
6. Property validation
7. Multi-select editing (edit common properties)

**Out of Scope (deferred):**
- Custom property types
- Property grouping/sections
- Property search
- Reset to default button
- Property copy/paste

### Acceptance Criteria

1. **Inspector Panel Layout**
   - [ ] Panel appears when entity selected
   - [ ] Panel shows entity type name
   - [ ] Panel shows entity instance ID
   - [ ] Panel lists all editable properties
   - [ ] Panel is scrollable for many properties
   - [ ] Panel dismissible (close or tap outside)

2. **String Property Editor**
   - [ ] Text input for string properties
   - [ ] Current value displayed
   - [ ] Editing updates value on blur/confirm
   - [ ] Placeholder for empty values
   - [ ] minLength/maxLength constraints enforced

3. **Number Property Editor**
   - [ ] Numeric input for number properties
   - [ ] Current value displayed
   - [ ] Editing updates value on confirm
   - [ ] min/max constraints enforced
   - [ ] Invalid input rejected with feedback

4. **Boolean Property Editor**
   - [ ] Toggle switch for boolean properties
   - [ ] Current state visible
   - [ ] Toggle updates value immediately
   - [ ] Clear on/off visual states

5. **Asset Reference Editor**
   - [ ] Dropdown or picker for asset references
   - [ ] Shows current asset selection
   - [ ] Lists available assets of correct type
   - [ ] Clear/remove option for optional assets

6. **Property Validation**
   - [ ] Validation runs on property change
   - [ ] Invalid values show error indicator
   - [ ] Error message explains constraint
   - [ ] Invalid values not saved
   - [ ] Valid values save immediately

7. **Multi-Select Editing**
   - [ ] Inspector shows when multiple entities selected
   - [ ] Shows "Multiple selected" indicator
   - [ ] Only common properties editable
   - [ ] Mixed values shown as placeholder
   - [ ] Editing applies to all selected

### Verification

- Manual: Edit each property type
- Manual: Verify constraints enforced
- Manual: Multi-select editing workflow
- Manual: Reload and verify properties persisted
- Automated: Property validation tests

---

## Dependencies

| Track | Depends On |
|-------|------------|
| Track 19 | Track 6 (Panels), Track 8 (Tool structure) |
| Track 20 | Track 19 (Entity Palette), Track 5 (Canvas) |
| Track 21 | Track 20 (Entity Placement), Track 16 (Undo/Redo) |
| Track 22 | Track 21 (Entity Manipulation) |

**Internal Dependencies:**
```
Track 19 → Track 20 → Track 21 → Track 22
```

---

## Risks

1. **Touch Target Size**: Entity selection may be difficult on small entities
   - Mitigation: Minimum selection area, selection tolerance

2. **Property Editor Complexity**: Many property types to support
   - Mitigation: Start with core types, extend later

3. **Canvas Performance**: Many entities may slow rendering
   - Mitigation: Render culling, instance batching

4. **Undo/Redo Complexity**: Entity operations involve multiple changes
   - Mitigation: Composite operations, careful state management

5. **Multi-Select UX**: Mobile multi-select is challenging
   - Mitigation: Long-press gesture, clear visual feedback

---

## Notes

- Entity types are defined in project.json (Track 1 schemas)
- Entity instances are stored in scene.entities array
- Entity IDs must be unique within a scene
- PropertyDefinition schema already exists in `/src/types/entity.ts`
- EntityInstance schema already exists in `/src/types/scene.ts`
- Touch offset system from Track 8/9 applies to entity operations
