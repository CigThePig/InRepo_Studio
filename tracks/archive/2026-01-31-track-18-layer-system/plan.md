# Track 18: Layer System — Plan

## Overview

This plan breaks Track 18 into phases with verification checklists and stop points.

**Track Type**: Full
**Estimated Phases**: 3

---

## Recon Summary

### Files Likely to Change

- `src/editor/panels/layerPanel.ts` (new) - Layer management UI
- `src/editor/panels/topPanel.ts` - Replace layer tabs with panel
- `src/storage/hot.ts` - Add layer visibility/lock to EditorState
- `src/editor/canvas/renderer.ts` - Respect visibility
- `src/editor/tools/paint.ts` - Respect locks
- `src/editor/tools/erase.ts` - Respect locks
- `src/editor/tools/select.ts` - Respect locks
- `src/editor/init.ts` - Wire layer panel

### Key Modules/Functions Involved

- `createLayerPanel()` - Layer UI factory
- Existing layer rendering in renderer.ts
- Tool start/paintAt/eraseAt functions

### Invariants to Respect

- Hot/Cold boundary: States go to IndexedDB
- Touch-first interaction: Touch-friendly toggles
- No data loss: Visibility/lock don't affect data

### Cross-Module Side Effects

- Renderer needs visibility config
- All tools need lock checking
- Top panel layout changes

### Apply/Rebuild Semantics

- Visibility: Live-applying (immediate visual)
- Lock: Live-applying (immediate tool behavior)

### Data Migration Impact

- Adding layerVisibility and layerLocks to EditorState
- Use defaults if missing on load

### File Rules Impact

- New file: layerPanel.ts
- Top panel modifications should stay within size limits

### Risks/Regressions

- Top panel layout may need adjustment
- Tool behavior changes could affect existing workflows
- State initialization for new fields

### Verification Commands/Checks

- `npm run build` - TypeScript compilation
- `npm run lint` - Code style
- Manual testing on mobile device

---

## Phase 1: Layer State + Visibility

**Goal**: Add layer visibility state and canvas integration.

### Tasks

- [ ] Update `src/storage/hot.ts`
  - [ ] Add `layerVisibility: Record<LayerType, boolean>` to EditorState
  - [ ] Add `layerLocks: Record<LayerType, boolean>` to EditorState
  - [ ] Add default values in getDefaultEditorState()
  - [ ] Handle missing fields on load (migration)
- [ ] Update `src/editor/canvas/renderer.ts`
  - [ ] Accept layerVisibility in render config
  - [ ] Skip rendering hidden layers
  - [ ] Update renderTilemap() signature
- [ ] Update `src/editor/init.ts`
  - [ ] Pass layerVisibility to canvas
  - [ ] Add method to update visibility
- [ ] Create basic visibility toggle test
  - [ ] Toggle via console/API
  - [ ] Verify canvas updates

### Files Touched

- `src/storage/hot.ts` (modify)
- `src/editor/canvas/renderer.ts` (modify)
- `src/editor/init.ts` (modify)

### Verification

- [ ] EditorState has layerVisibility field
- [ ] EditorState has layerLocks field
- [ ] Default visibility is all true
- [ ] Default locks is all false
- [ ] Hidden layer not rendered
- [ ] Visible layer rendered normally
- [ ] States persist across reload
- [ ] TypeScript compiles without errors
- [ ] `npm run build` succeeds

### Stop Point

Pause for review. Test visibility before adding lock behavior.

---

## Phase 2: Layer Locks + Tool Integration

**Goal**: Implement lock behavior in all tools.

### Tasks

- [ ] Update `src/editor/tools/paint.ts`
  - [ ] Check lock before painting
  - [ ] Skip if layer locked
  - [ ] Call onLockedLayerAction callback
- [ ] Update `src/editor/tools/erase.ts`
  - [ ] Check lock before erasing
  - [ ] Skip if layer locked
  - [ ] Call onLockedLayerAction callback
- [ ] Update `src/editor/tools/select.ts`
  - [ ] Check lock before operations
  - [ ] Skip move/delete/paste on locked layer
  - [ ] Call onLockedLayerAction callback
- [ ] Update `src/editor/init.ts`
  - [ ] Add onLockedLayerAction handlers
  - [ ] Show toast/feedback when locked
  - [ ] Add method to update locks
- [ ] Add lock toggle test
  - [ ] Lock layer, attempt to paint
  - [ ] Verify blocked

### Files Touched

- `src/editor/tools/paint.ts` (modify)
- `src/editor/tools/erase.ts` (modify)
- `src/editor/tools/select.ts` (modify)
- `src/editor/init.ts` (modify)

### Verification

- [ ] Cannot paint on locked layer
- [ ] Cannot erase on locked layer
- [ ] Cannot select/move/delete on locked layer
- [ ] Feedback shown when blocked
- [ ] Unlocked layers work normally
- [ ] Lock state persists
- [ ] TypeScript compiles without errors
- [ ] `npm run build` succeeds

### Stop Point

Pause for review. Test lock behavior before adding UI.

---

## Phase 3: Layer Panel UI

**Goal**: Create layer panel component and integrate with top panel.

### Tasks

- [ ] Create `src/editor/panels/layerPanel.ts`
  - [ ] LayerPanelConfig interface
  - [ ] LayerPanel interface
  - [ ] `createLayerPanel()` factory
  - [ ] Layer row component
  - [ ] Visibility toggle (eye icon)
  - [ ] Lock toggle (lock icon)
  - [ ] Active layer indicator
  - [ ] Layer name display
  - [ ] Touch-friendly sizing
  - [ ] Styling consistent with panels
- [ ] Update `src/editor/panels/topPanel.ts`
  - [ ] Remove old layer tabs
  - [ ] Add layer panel section
  - [ ] Wire callbacks to panel
- [ ] Update `src/editor/init.ts`
  - [ ] Wire layer panel callbacks
  - [ ] Handle visibility toggle
  - [ ] Handle lock toggle
  - [ ] Handle layer selection
  - [ ] Handle "lock active layer" edge case
- [ ] Update `context/schema-registry.md`
  - [ ] Add layerVisibility to EditorStateSchema
  - [ ] Add layerLocks to EditorStateSchema
- [ ] Update `INDEX.md` with new files
  - [ ] Add `src/editor/panels/layerPanel.ts`
- [ ] Update `context/active-track.md` to mark Track 18 complete
- [ ] Append summary to `context/history.md`

### Files Touched

- `src/editor/panels/layerPanel.ts` (new)
- `src/editor/panels/topPanel.ts` (modify)
- `src/editor/init.ts` (modify)
- `context/schema-registry.md` (modify)
- `INDEX.md` (modify)
- `context/active-track.md` (modify)
- `context/history.md` (modify)

### Verification

- [ ] Layer panel displays all four layers
- [ ] Active layer is highlighted
- [ ] Visibility toggle works for each layer
- [ ] Lock toggle works for each layer
- [ ] Tapping layer selects it (if unlocked)
- [ ] Cannot select locked layer
- [ ] Locking active layer switches active
- [ ] Icons are clear and touch-friendly
- [ ] All states persist across reload
- [ ] Full manual test on mobile device
- [ ] INDEX.md lists layerPanel.ts
- [ ] schema-registry.md updated
- [ ] TypeScript compiles without errors
- [ ] `npm run build` succeeds
- [ ] `npm run lint` passes

### Stop Point

Phase complete. Track 18 done.

---

## Risk Checkpoints

### Before Phase 1

- Review existing layer rendering
- Plan state structure
- Consider migration strategy

### Before Phase 2

- Test visibility integration
- Plan lock check locations
- Design feedback UX

### Before Phase 3

- Test all lock behaviors
- Plan UI layout
- Review icon choices

### End of Track

- Full manual test cycle:
  1. Open layer panel
  2. Toggle visibility for each layer
  3. Verify canvas updates
  4. Toggle lock for ground layer
  5. Attempt to paint on ground
  6. Verify blocked with feedback
  7. Select props layer
  8. Paint successfully
  9. Lock props layer
  10. Verify active layer switches
  11. Try to select props (should fail)
  12. Unlock props
  13. Select props (should work)
  14. Reload page
  15. Verify all states persist

---

## Rollback Plan

If issues arise:
- Phase 1: Remove visibility from renderer, revert state
- Phase 2: Keep visibility, disable lock checks
- Phase 3: Keep lock behavior, use simple UI

---

## INDEX.md Updates

After Phase 3, add:

```markdown
- `src/editor/panels/layerPanel.ts`
  - Role: Layer visibility, lock, and selection UI.
  - Lists of truth: none
```

---

## schema-registry.md Updates

After Phase 3, update EditorStateSchema:

```markdown
- `EditorStateSchema` — persisted editor state
  - Keys: currentSceneId, currentTool, activeLayer, selectedTile{}, viewport{}, panelStates{}, brushSize, layerVisibility{}, layerLocks{}
  - Apply mode: live (restored on load)
```

---

## Notes

- Layer order is fixed (ground → props → collision → triggers)
- Visibility affects rendering only
- Lock affects editing tools only
- Cannot have all layers locked
- Locking active layer auto-switches
- Consider per-scene states (future)
- Consider show all/hide all buttons (future)
