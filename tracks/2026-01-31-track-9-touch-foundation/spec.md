# Track 9: Touch Foundation — Spec

## Goal

Establish core touch handling infrastructure that all tools build on, including touch offset calibration, brush cursor display, and refined gesture disambiguation.

## User Story

As a mobile game developer using InRepo Studio, I want precise touch controls that show where my actions will take effect so that I can paint and edit tiles accurately despite my finger covering the target area.

## Scope

### In Scope

1. **Touch Event Routing**: Consistent routing from canvas to UI to tools
2. **Touch Offset Calibration**: Adjustable offset for different user preferences
3. **Brush Cursor Display**: Visual indicator showing paint/action position
4. **Gesture Disambiguation**: Refined distinction between tool use and pan
5. **Long-press Detection**: Foundation for future context menus

### Out of Scope (deferred)

- Full touch offset settings UI (Track 28)
- Haptic feedback (Track 25)
- Edge panning (Track 25)
- Loupe/magnifier mode (Track 25)

## Acceptance Criteria

1. **Touch Routing**
   - [ ] Single finger on canvas triggers tool action
   - [ ] Two fingers on canvas trigger pan/zoom
   - [ ] Touch on UI elements (panels, buttons) does not trigger canvas actions
   - [ ] Touch transitions from 1→2 fingers cancels tool, starts pan

2. **Brush Cursor**
   - [ ] Visible cursor shows where paint/action will occur
   - [ ] Cursor appears above finger by configurable offset
   - [ ] Cursor matches current tile size
   - [ ] Cursor shows tile preview for paint tool (optional)
   - [ ] Cursor disappears when touch ends

3. **Gesture Disambiguation**
   - [ ] Short delay before confirming single-finger as tool gesture
   - [ ] Movement above threshold confirms tool without delay
   - [ ] No accidental paints when starting two-finger gesture
   - [ ] Smooth transition between modes

4. **Touch Offset**
   - [ ] Default offset: 48px above touch point
   - [ ] Offset applies consistently to hover, cursor, and actions
   - [ ] Offset is exported as configurable constant

5. **Long-press**
   - [ ] Long-press detected after 500ms hold without movement
   - [ ] Long-press callback available (for future context menu)
   - [ ] Long-press does not trigger tool action

## Risks

1. **Offset Feels Wrong for Some Users**: Different hands/devices may need different offsets
   - Mitigation: Make offset configurable; add settings in Track 28

2. **Gesture Timing Conflicts**: Delay may feel laggy
   - Mitigation: Movement threshold for instant confirmation

3. **Performance**: Cursor rendering may affect frame rate
   - Mitigation: Lightweight canvas drawing; use requestAnimationFrame

## Verification

- Manual: Touch canvas, cursor appears above finger
- Manual: Tap quickly, tool action occurs
- Manual: Start with one finger, add second → no accidental paint
- Manual: Long-press → no paint, callback fires
- Automated: Gesture state machine tests

## Dependencies

- Track 5 (Canvas System): gesture handler
- Track 7 (Tilemap Rendering): hover highlight foundation
- Track 8 (Paint Tool): tool gesture callbacks

## Notes

- Touch offset should be consistent with Track 7's TOUCH_OFFSET_Y
- Brush cursor can reuse hover highlight rendering
- Long-press is foundation for future features (e.g., tile picker quick-switch)
