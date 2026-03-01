# Asset DnD Gesture Debugging (Samsung S22 Chrome)

This guide explains how to enable the temporary gesture telemetry overlay and how to interpret it while reproducing the "lit then jump + cancel" drag symptom.

## Enable debug overlay

Use either option:

1. In DevTools console:
   - `window.__IRS_DEBUG_GESTURES = true`
   - Refresh the page.
2. Temporary local flag in `src/editor/panels/assetLibraryTab.ts`:
   - Set `ENABLE_GESTURE_OVERLAY_IN_DEV = true`
   - Run in dev mode.

The overlay is non-interfering (`pointer-events:none`) and can be removed by deleting the `gestureDebugOverlay.ts` import + creation call in `assetLibraryTab.ts`.

## Repro steps (S22 Chrome)

1. Open Asset Library with enough assets to allow reordering.
2. Long-press an asset capsule until it turns green (lit state).
3. Start dragging slowly.
4. Observe whether it briefly "jumps" (size/row shift) and then resets without reorder.

## What to inspect in overlay

1. **State progression**
   - Confirm `sortableState` enters `confirmed`, then `dragging`.
   - If it returns to `idle` too early, inspect recent event lines for `pointercancel` / `lostpointercapture`.

2. **Capture ownership**
   - Compare `capture.viewport` and `capture.document` around drag start.
   - Check event lines for `capture.document.before/after/error` and `drag.lostpointercapture`.

3. **Finish reason**
   - Read `finish.reason` (`pointerup`, `pointercancel`, `lostpointercapture`, or `exception`).
   - Correlate with nearby event lines to see which event terminated drag first.

4. **Hit-testing during drag**
   - Monitor `elementFromPoint` and `closest[group-key]` while moving.
   - If hit target is unexpected, inspect whether pointer is effectively over the desired grid.

5. **One-frame layout probe (jump detector)**
   - Compare `layout-probe.before` vs `layout-probe.after-raf` entries.
   - A non-zero `cardΔh`, `rowΔh`, or `phΔh` indicates a layout/class mutation between drag start and next frame.

## Notes

- `sortable.sample` and `drag.pointermove` are throttled to reduce log flood.
- Telemetry intentionally does not alter drag logic; this pass is instrumentation-only.
