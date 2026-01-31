# Track 18: Layer System — Spec

## Goal

Implement full layer management in the top panel, including visibility toggle, lock toggle, active layer selection, and visual layer ordering display.

## User Story

As a mobile game developer using InRepo Studio, I want to control layer visibility and locking so that I can focus on specific layers while editing without accidentally modifying others.

## Scope

### In Scope

1. **Layer Visibility Toggle**: Show/hide individual layers
2. **Layer Lock Toggle**: Prevent editing on locked layers
3. **Active Layer Selection**: Select which layer receives edits
4. **Layer List UI**: Visual representation of all layers
5. **Layer State Persistence**: Save visibility/lock states
6. **Tool Behavior with Locks**: Painting/erasing respects locks

### Out of Scope (deferred)

- Layer reordering (fixed order for now)
- Custom layer names (use standard names)
- Layer opacity adjustment (use existing dimming)
- Additional layer types
- Layer groups/folders
- Layer-specific colors beyond existing

## Acceptance Criteria

1. **Layer Visibility Toggle**
   - [ ] Eye icon toggles layer visibility
   - [ ] Hidden layers not rendered on canvas
   - [ ] Visibility state persists across reload
   - [ ] Hidden layers dimmed in layer list

2. **Layer Lock Toggle**
   - [ ] Lock icon toggles layer lock state
   - [ ] Locked layers cannot be painted/erased
   - [ ] Locked layers cannot receive selection operations
   - [ ] Visual indicator for locked state
   - [ ] Lock state persists across reload

3. **Active Layer Selection**
   - [ ] Tapping layer name makes it active
   - [ ] Active layer highlighted in list
   - [ ] Tools affect only active layer
   - [ ] Cannot select locked layer as active

4. **Layer List UI**
   - [ ] All four layers displayed (ground, props, collision, triggers)
   - [ ] Each layer shows: name, visibility toggle, lock toggle
   - [ ] Active layer visually distinguished
   - [ ] Appropriate icons for layer types

5. **Tool Integration**
   - [ ] Paint tool skips locked layers
   - [ ] Erase tool skips locked layers
   - [ ] Select tool skips locked layers
   - [ ] Feedback when attempting to edit locked layer

6. **Canvas Rendering**
   - [ ] Hidden layers not drawn
   - [ ] Visible layers render normally
   - [ ] Active layer render unchanged (existing dimming behavior)

## Risks

1. **UI Space Constraints**: Layer panel may be too tall
   - Mitigation: Compact design, collapsible if needed

2. **Lock Confusion**: User may not realize layer is locked
   - Mitigation: Visual feedback, toast messages

3. **State Complexity**: More state to track and persist
   - Mitigation: Clear EditorState schema updates

## Verification

- Manual: Toggle layer visibility, verify canvas updates
- Manual: Lock layer, attempt to paint, verify blocked
- Manual: Change active layer, verify tools affect correct layer
- Manual: Reload page, verify states persist
- Automated: Unit tests for layer state management
- Automated: Tool behavior with locked layers

## Dependencies

- Track 6 (Panels): Existing layer tabs in top panel
- Track 7 (Tilemap Rendering): Layer rendering control
- Tracks 8, 14, 15 (Tools): Lock behavior integration

## Notes

- Layer order is fixed: ground → props → collision → triggers
- Visibility affects rendering but not data
- Lock affects editing tools but not visibility
- Consider hover state indicators for touch
- Clear visual distinction between visibility and lock icons
