# Track 6: Panels + Tile Picker — Plan

## Overview

This plan breaks Track 6 into phases with verification checklists and stop points.

**Track Type**: Full
**Estimated Phases**: 3

---

## Phase 1: Panel Containers + Layout

**Goal**: Create the expandable top and bottom panel containers with proper layout.

### Tasks

- [ ] Update `src/storage/hot.ts` with new EditorState fields
  - [ ] Add `activeLayer: LayerType` field
  - [ ] Add `selectedTile: { category, index } | null` field
  - [ ] Update `DEFAULT_EDITOR_STATE` with new defaults
- [ ] Create `src/editor/panels/topPanel.ts`
  - [ ] Create panel container with header and content area
  - [ ] Implement expand/collapse toggle
  - [ ] Display scene name
  - [ ] Return `TopPanelController` interface
- [ ] Create `src/editor/panels/bottomPanel.ts`
  - [ ] Create panel container with header and content area
  - [ ] Implement expand/collapse toggle
  - [ ] Return `BottomPanelController` interface
- [ ] Create `src/editor/panels/index.ts` with exports
- [ ] Update `src/editor/init.ts`
  - [ ] Replace placeholder panels with real panel components
  - [ ] Wire up expand/collapse persistence
  - [ ] Pass scene name to top panel
- [ ] Update `INDEX.md` with new panel files

### Files Touched

- `src/storage/hot.ts` (modify)
- `src/editor/panels/topPanel.ts` (new)
- `src/editor/panels/bottomPanel.ts` (new)
- `src/editor/panels/index.ts` (new)
- `src/editor/init.ts` (modify)
- `INDEX.md` (modify)

### Verification

- [ ] Top panel renders with scene name
- [ ] Top panel expands/collapses on tap
- [ ] Bottom panel renders
- [ ] Bottom panel expands/collapses on tap
- [ ] Panel states save to IndexedDB
- [ ] Panel states restore on reload
- [ ] TypeScript compiles without errors

### Stop Point

Pause for review. Verify panels work on mobile before adding content.

---

## Phase 2: Toolbar + Layer Tabs

**Goal**: Add tool selection buttons and layer tabs.

### Tasks

- [ ] Create `src/editor/panels/toolbar.ts`
  - [ ] Render tool buttons (Select, Paint, Erase, Entity)
  - [ ] Implement active tool highlighting
  - [ ] Handle tool selection events
  - [ ] Return `ToolbarController` interface
- [ ] Update `src/editor/panels/topPanel.ts`
  - [ ] Add layer tab buttons (Ground, Objects, Collision, Trigger)
  - [ ] Implement active layer highlighting
  - [ ] Handle layer selection events
  - [ ] Add `onLayerChange` callback
- [ ] Update `src/editor/panels/bottomPanel.ts`
  - [ ] Integrate toolbar component
  - [ ] Wire up tool change events
- [ ] Update `src/editor/panels/index.ts` with toolbar exports
- [ ] Update `src/editor/init.ts`
  - [ ] Wire up tool change persistence
  - [ ] Wire up layer change persistence

### Files Touched

- `src/editor/panels/toolbar.ts` (new)
- `src/editor/panels/topPanel.ts` (modify)
- `src/editor/panels/bottomPanel.ts` (modify)
- `src/editor/panels/index.ts` (modify)
- `src/editor/init.ts` (modify)

### Verification

- [ ] Tool buttons render with correct icons
- [ ] Tapping tool button updates active state
- [ ] Tool selection persists across reload
- [ ] Layer tabs render with labels
- [ ] Tapping layer tab updates active state
- [ ] Layer selection persists across reload
- [ ] Touch targets are 44x44px minimum
- [ ] No horizontal overflow on narrow screens

### Stop Point

Pause for review. Test tool and layer selection on mobile device.

---

## Phase 3: Tile Picker

**Goal**: Add tile category tabs and tile grid with selection.

### Tasks

- [ ] Create `src/editor/panels/tilePicker.ts`
  - [ ] Render category tabs from project.tileCategories
  - [ ] Render tile grid for selected category
  - [ ] Load tile images from assets
  - [ ] Implement tile selection with highlight
  - [ ] Handle category switch
  - [ ] Return `TilePickerController` interface
- [ ] Update `src/editor/panels/bottomPanel.ts`
  - [ ] Integrate tile picker component
  - [ ] Show tile picker when Paint or Erase tool selected
  - [ ] Hide tile picker for Select and Entity tools
  - [ ] Wire up tile selection events
- [ ] Update `src/editor/panels/index.ts` with tile picker exports
- [ ] Update `src/editor/init.ts`
  - [ ] Wire up tile selection persistence
  - [ ] Expose selected tile for future paint tool
- [ ] Update `INDEX.md` with complete panel file list
- [ ] Update `context/schema-registry.md` with EditorState changes

### Files Touched

- `src/editor/panels/tilePicker.ts` (new)
- `src/editor/panels/bottomPanel.ts` (modify)
- `src/editor/panels/index.ts` (modify)
- `src/editor/init.ts` (modify)
- `INDEX.md` (modify)
- `context/schema-registry.md` (modify)

### Verification

- [ ] Category tabs render from project data
- [ ] Switching category shows correct tiles
- [ ] Tile images load and display correctly
- [ ] Tapping tile selects it (visual highlight)
- [ ] Tile selection persists across reload
- [ ] Tile picker shows only when Paint/Erase tool selected
- [ ] Tile grid scrolls for many tiles
- [ ] No console errors for missing images
- [ ] `INDEX.md` updated with new files
- [ ] `schema-registry.md` updated with EditorState changes

### Stop Point

Phase complete. Track 6 done. Ready for Track 7 (Tilemap Rendering) or Track 8 (Paint Tool).

---

## Risk Checkpoints

### Before Phase 1

- Confirm EditorState schema change is backward compatible
- Check that existing editorState records handle missing fields

### Before Phase 2

- Test panel animations on mobile
- Verify touch targets are reachable

### Before Phase 3

- Confirm asset paths resolve correctly
- Test with multiple tile categories

### End of Track

- Full manual test on mobile device
- Panel states persist correctly
- Tool and tile selection work
- Layout is usable in portrait mode

---

## Rollback Plan

If issues arise:
- Phase 1: Revert to placeholder panels
- Phase 2: Keep panels, hide tool buttons
- Phase 3: Keep toolbar, hide tile picker

---

## INDEX.md Updates

After Phase 3, update:

```markdown
### Editor Panels (Track 6 — exists)
- `src/editor/panels/topPanel.ts`
  - Role: Top panel with scene info and layer tabs.
  - Lists of truth: LayerType (from types/scene.ts)

- `src/editor/panels/bottomPanel.ts`
  - Role: Bottom panel with toolbar and tile picker.
  - Lists of truth: ToolType

- `src/editor/panels/toolbar.ts`
  - Role: Tool selection buttons.
  - Lists of truth: ToolType

- `src/editor/panels/tilePicker.ts`
  - Role: Tile category tabs and tile grid.
  - Lists of truth: none (uses TileCategory from types/project.ts)

- `src/editor/panels/index.ts`
  - Role: Public exports for panels module.
  - Lists of truth: none
```

---

## Schema Registry Updates

After Phase 3, add to `context/schema-registry.md`:

```markdown
### EditorState.activeLayer
- Owner: `src/storage/hot.ts`
- Type: enum
- Values: 'ground' | 'objects' | 'collision' | 'trigger'
- Default: 'ground'
- Apply: live (affects which layer receives paint operations)

### EditorState.selectedTile
- Owner: `src/storage/hot.ts`
- Type: schema
- Shape: { category: string, index: number } | null
- Default: null
- Apply: live (affects paint operations)
```

---

## Notes

- Entity palette (for Entity tool) is deferred to Track 19
- Deploy button in top panel is deferred to Track 13
- Layer visibility/lock toggles are deferred to Track 18
- Undo/redo buttons are deferred to Track 16
