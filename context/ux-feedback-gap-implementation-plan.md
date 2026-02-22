# UX Feedback Gap — Audit Verdict & Implementation Plan

**Authority:** `context/ux-polish-rules.md` · `src/editor/uxFeedback.ts`
**Phase:** Phase 6 (Integration + Polish) — Tracks 43–46 continuation
**Date:** 2026-02-21

---

## Audit Verdict

The submitted report is **substantially correct but contains one significant factual error** and one area of overstatement. Before implementing anything, the record must be set straight.

### ✅ Confirmed Gaps (report is accurate)

| # | Claim | Verdict |
|---|---|---|
| 1 | Canvas tool operations (tile paint, erase) produce no motion feedback | **Confirmed** — `paint.ts` and `erase.ts` make zero calls to `uxFeedback` |
| 2 | Tile deletion is a silent success path with no undo signal | **Confirmed** — `erase.ts` `end()` only calls `history.endGroup()`, no `uxFeedback.undo.show()` |
| 4 | `gestures.ts` provides no visual feedback during the 150–500ms pending window | **Confirmed** — no `onPendingStart` callback exists anywhere in the gesture system |
| 5 | Canvas tile erasure provides no visible undo availability | **Confirmed** — only entity/sprite removal calls `uxFeedback.undo.show()` in `init.ts`; tilemap erase is silent |

### ❌ Factual Error (report is wrong)

**Gap #3 — Storage Safety.** The report states that "neither `topPanel.ts` nor `bottomPanel.ts` contains any UI nodes or state variables related to storage status" and concludes that storage safety is entirely absent.

This is **incorrect**. Storage safety was implemented in Track 43 and lives in `topBar.ts`:

```
// topBar.ts — already wired
markDirty() { uxFeedback.storage.markDirty(saveButton); }
markSaved() { uxFeedback.storage.markSaved(saveButton); }
```

`init.ts` calls `topBar.markDirty()` on unsaved changes and `uxFeedback.combos.saved()` on successful save. The report confused `topPanel.ts` (layer tabs/scene name only) with `topBar.ts` (the actual save/status bar). **Gap #3 is already closed. Do not reimplement it.**

### ⚠️ Overstated Gap (report implies "build from scratch" when infrastructure exists)

The report frames all five gaps as if no feedback infrastructure exists. In reality, `uxFeedback.ts` is a **complete, production-ready feedback driver** already imported and used in 11 files. The remaining gaps are entirely about **wiring** — calling existing APIs in the right places, not building new systems.

---

## Root Cause Summary

Every remaining gap shares one root cause: **canvas tool operations are outside the `uxFeedback` call graph.** Panels, tabs, and the deploy flow are wired. The canvas tools (`paint.ts`, `erase.ts`) and the gesture system (`gestures.ts`) are not.

There is also one structural gap: `gestures.ts` exposes no callback hook for the pending state, so no caller — even a wired one — could display "I heard you" feedback during the 150ms confirmation window.

---

## Implementation Plan

### Track 47 — Canvas Tool Feedback + Gesture Acknowledgement

**Goal:** Close all four confirmed gaps by wiring `uxFeedback` into canvas tool operations and adding a pending-state feedback hook to the gesture system.

**Scope:** Four focused changes. No new systems, no new files required. All changes are additive.

---

### Task 1 — Gesture Pending State Feedback

**File:** `src/editor/canvas/gestures.ts`

**Problem:** During the `pending` state (0–150ms after `pointerdown`), no callback is fired. The screen is visually silent. This violates the rule: "Reaction must begin within the same frame or animation tick."

**Implementation:**

Add an `onPendingStart` callback to `GestureCallbacks`:

```typescript
export interface GestureCallbacks {
  // ... existing callbacks ...

  /**
   * Called immediately when a single pointer goes down and enters
   * the pending state. Use to show a visual "I heard you" signal
   * (e.g. a pulse ripple at the touch point) before the intent
   * is confirmed as a tool action or pan/zoom.
   */
  onPendingStart?: (x: number, y: number) => void;

  /**
   * Called when the pending state resolves or is cancelled.
   * Use to dismiss any pending-state visual.
   */
  onPendingEnd?: () => void;
}
```

In `handlePointerDown`, fire the callback immediately when `pointerCount === 1` and `gestureState` is being set to `'pending'`:

```typescript
// After: gestureState = 'pending';
callbacks.onPendingStart?.(e.clientX, e.clientY);
```

Call `onPendingEnd` at the start of `startTool()`, `startPanZoom()`, and `triggerLongPress()`:

```typescript
function startTool(x: number, y: number): void {
  callbacks.onPendingEnd?.();   // ← add this
  gestureState = 'tool';
  clearAllTimeouts();
  callbacks.onToolStart?.(x, y);
}
```

Also call it in `handlePointerUp` when `pointerCount === 0` and `gestureState === 'pending'` (cancelled tap):

```typescript
if (pointerCount === 0) {
  if (gestureState === 'pending') {
    callbacks.onPendingEnd?.();  // cancelled before confirming
  }
  // ... rest of existing code ...
}
```

**Acceptance:** `onPendingStart` fires on every single-pointer touch down. `onPendingEnd` fires when the intent resolves or is cancelled. Existing behaviour is unchanged when callbacks are not provided.

---

### Task 2 — Wire Pending Feedback in Canvas.ts

**File:** `src/editor/canvas/Canvas.ts`

**Problem:** Even after Task 1 adds the callbacks, nobody calls them. `Canvas.ts` creates the gesture handler and is the correct place to wire the visual response.

**Implementation:**

In the `createGestureHandler` call inside `Canvas.ts`, add handlers for the new callbacks. The pending visual should be a `uxFeedback.motion.pulse` applied to the canvas element itself (or a small overlay element positioned at the touch point):

```typescript
import { uxFeedback } from '@/editor/uxFeedback';

// In createGestureHandler({ ... }):
onPendingStart: (x, y) => {
  // Pulse the canvas container as acknowledgement
  uxFeedback.motion.pulse(canvas);
},
onPendingEnd: () => {
  // No cleanup needed — pulse is fire-and-forget
},
```

**Note:** If a more precise "ripple at touch point" is desired in future, a small absolutely-positioned overlay element can be created and removed here. For this track, pulsing the canvas element satisfies the rule at minimum cost.

**Acceptance:** A visible pulse acknowledges finger-down within one animation frame. No blocking of input. No stacking with tool-action feedback (pending ends before tool starts).

---

### Task 3 — Erase Tool Feedback (Deletion Contract)

**File:** `src/editor/tools/erase.ts`

**Problem:** The erase `end()` method silently closes the history group. Tile deletion requires 3 feedback classes per the Feedback Contract (Acknowledgement + State Change + Safety/Reassurance). Currently it delivers 0.

**Implementation:**

The erase tool's `EraseToolConfig` interface needs one new optional callback to notify callers that a destructive operation completed:

```typescript
export interface EraseToolConfig {
  // ... existing fields ...

  /**
   * Optional: called at end() if at least one tile was erased in this stroke.
   * Callers use this to trigger undo-bar and motion feedback.
   */
  onEraseComplete?: (tilesErased: number) => void;
}
```

Track the tile-erased count during the stroke. In `end()`:

```typescript
end(): void {
  const count = erasedThisStroke;  // track this internally
  erasedThisStroke = 0;
  erasing = false;
  lastTileX = null;
  lastTileY = null;
  history.endGroup();

  if (count > 0) {
    config.onEraseComplete?.(count);
  }
},
```

**File:** `src/editor/init.ts`

Wire the callback when the erase tool is created:

```typescript
// When constructing createEraseTool({}):
onEraseComplete: (count) => {
  const label = count === 1 ? '1 tile erased.' : `${count} tiles erased.`;
  uxFeedback.undo.show(label, () => {
    history.undo();
    canvasController?.invalidateScene();
  }, { destructive: true });
},
```

**Feedback classes delivered after this task:**

| Class | Signal | Delivered by |
|---|---|---|
| 1 — Acknowledgement | Gesture pulse (Task 2) | `gestures.ts` pending feedback |
| 2 — State Change | Canvas re-renders with tiles removed | Existing canvas render loop |
| 3 — Safety/Reassurance | Undo bar appears immediately | `onEraseComplete` → `uxFeedback.undo.show()` |

**Acceptance:** After erasing one or more tiles and lifting the finger, a destructive-emphasis undo bar appears within one frame. Tapping Undo restores the tiles and invalidates the canvas.

---

### Task 4 — Paint Tool Feedback (Creation Contract)

**File:** `src/editor/tools/paint.ts`

**Problem:** Tile placement is also a silent success path. Creation requires 2 feedback classes (Acknowledgement + State Change). State change is covered by the render loop. Acknowledgement is not delivered at the panel level when the intent button is first selected.

**Implementation:**

This is a lighter gap than erase because placement is non-destructive, but the intent button tap itself must pulse.

**File:** `src/editor/panels/bottomPanel.ts`

The Place button currently fires `placeClickCallback?.()` on click with no motion. Add a pulse on the active-state button when intent changes to `'place'`:

```typescript
// In setCurrentIntent():
setCurrentIntent(intent: IntentType) {
  if (state.currentIntent === intent) return;
  state.currentIntent = intent;
  updateIntentButtons();

  // Acknowledge the intent switch
  if (intent === 'place') uxFeedback.motion.pulse(placeButton);
  if (intent === 'remove') uxFeedback.motion.pulse(removeButton);
  if (intent === 'interact') uxFeedback.motion.pulse(interactButton);
},
```

This requires importing `uxFeedback` at the top of `bottomPanel.ts`:

```typescript
import { uxFeedback } from '@/editor/uxFeedback';
```

**Feedback classes delivered after this task:**

| Class | Signal | Delivered by |
|---|---|---|
| 1 — Acknowledgement | Button pulse on intent change | `bottomPanel.ts` `setCurrentIntent` |
| 2 — State Change | Active button highlighted, canvas preview cursor | Existing CSS + canvas hover |

**Acceptance:** Tapping Place, Remove, or Interact causes the selected button to visibly pulse at the moment of selection. No double-pulse, no stacking with gesture feedback.

---

## Task Execution Order

Execute in this order — each task unblocks the next:

1. **Task 1** (gestures.ts) — add callback hooks. No imports, no dependencies.
2. **Task 2** (Canvas.ts) — wire the callbacks. Depends on Task 1.
3. **Task 3** (erase.ts + init.ts) — erase feedback. Independent of Tasks 1–2.
4. **Task 4** (bottomPanel.ts) — intent acknowledgement. Independent of all above.

All four tasks can be shipped as a single PR.

---

## Verification Checklist

Before marking this track complete, verify every item manually on a mobile-width viewport:

- [ ] Touch the canvas — a pulse appears on finger-down before any tile is modified
- [ ] Erase a single tile — undo bar appears with "1 tile erased." and emphasis border
- [ ] Erase a brush stroke — undo bar appears with correct count
- [ ] Tap Undo in the bar — tiles are restored, canvas re-renders
- [ ] Tap Place in the bottom panel — Place button pulses
- [ ] Tap Remove in the bottom panel — Remove button pulses
- [ ] Tap Interact — Interact button pulses
- [ ] Two-finger pinch — NO pending pulse fires (gesture went directly to pan/zoom)
- [ ] Tap and immediately lift (< 150ms) — pulse fires, then `onPendingEnd` clears with no tool action
- [ ] Save the project — dirty indicator and save confirmation still work (regression check)

---

## Out of Scope for This Track

The following are real gaps but are addressed in the existing Track 43–46 plan in `context/ux-polish-tracks.md`:

- Empty state invitations across panels (Track 46)
- State machine create/delete feedback (Track 46)
- Cross-system consistency audit (Track 46)

Do not address those here. This track is narrowly scoped to canvas tools and gestures.

---

## Files Changed

| File | Change type | Reason |
|---|---|---|
| `src/editor/canvas/gestures.ts` | Additive | Add `onPendingStart` / `onPendingEnd` callbacks |
| `src/editor/canvas/Canvas.ts` | Additive | Wire pending callbacks to `uxFeedback.motion.pulse` |
| `src/editor/tools/erase.ts` | Additive | Add `onEraseComplete` callback, track erase count |
| `src/editor/init.ts` | Additive | Wire `onEraseComplete` to `uxFeedback.undo.show` |
| `src/editor/panels/bottomPanel.ts` | Additive | Import `uxFeedback`, pulse on intent change |

No files are deleted. No schemas are changed. No storage contracts are modified. All changes are purely additive wiring of the existing `uxFeedback` driver.
