# InRepo Studio — UX Polish Implementation Plan
## Tracks 43–46

**Authority:** `context/ux-polish-rules.md` + `src/editor/uxFeedback.ts`

> Every rule in `ux-polish-rules.md` is non-negotiable. This document is the execution plan for wiring `uxFeedback` into all editor systems so those rules are satisfied.

---

## Background

`src/editor/uxFeedback.ts` is a complete, fully implemented UX feedback driver. It exports:

| API | Purpose |
|---|---|
| `uxFeedback.toast.*` | Success / error / warning / info toasts |
| `uxFeedback.motion.*` | Pulse, glow, expand, shrink, slide animations |
| `uxFeedback.selection.*` | Single-primary-selection state manager |
| `uxFeedback.storage.*` | Hot (dirty) / cold (saved) state indicators |
| `uxFeedback.undo.*` | Global floating undo bar |
| `uxFeedback.emptyState.*` | Empty state invitations with one action |
| `uxFeedback.combos.*` | Pre-wired multi-class combos (created, deleted, saved, committed) |
| `uxFeedback.init()` | Pre-inject styles at app boot |

**Current state:** `uxFeedback.ts` exists but is **not imported anywhere**. All panels roll their own (inconsistent) feedback.

**Scope of this plan:** Wire `uxFeedback` into every editor system that handles user-initiated actions.

---

## Systems In Scope

| System | Primary file(s) | Actions requiring feedback |
|---|---|---|
| **Foundation / Boot** | `src/editor/init.ts` | Style injection at startup |
| **Save / Deploy** | `src/editor/panels/topBar.ts`, `deployPanel.ts` | Save (dirty → saved), commit |
| **Asset Library** | `src/editor/panels/assetLibraryTab.ts` | Upload, create set, delete, select |
| **Animations** | `src/editor/panels/animationTab.ts` | Create animation, add frame, delete, select |
| **Sprite Slicer** | `src/editor/panels/spriteSlicerTab.ts` | Slice action |
| **Entities** | `src/editor/panels/entitiesTab.ts` | Place entity, delete, select |
| **Tile Picker** | `src/editor/panels/tilePicker.ts` | Tile selection |
| **Context Strip** | `src/editor/panels/bottomContextStrip.ts` | Delete button |
| **State Machine** | `src/editor/panels/animStateMachine.ts` | Create/delete state, select |
| **Empty States** | All panels above | Empty → invitation pattern |

### Out of scope for these tracks

- The Blockly cockpit and its top bar — covered by Track 42 (in progress).
- The runtime and playtest system — runtime does not emit editor-facing actions.
- Automated tests for UX feedback — tracked in `context/planned-tests.md`.
- Any new UI features — these tracks wire feedback into existing actions only.

---

## Track Overview

| Track | Name | Systems touched |
|---|---|---|
| **43** | UX Polish — Foundation + Save/Deploy | `init.ts`, `topBar.ts`, `deployPanel.ts` |
| **44** | UX Polish — Assets + Animations | `assetLibraryTab.ts`, `animationTab.ts`, `spriteSlicerTab.ts` |
| **45** | UX Polish — Entities + Tilemap | `entitiesTab.ts`, `tilePicker.ts`, `bottomContextStrip.ts` |
| **46** | UX Polish — State Machine + Empty States | `animStateMachine.ts`, empty states across all panels, cross-system audit |

Execute in order. Each track is a bounded, shippable improvement.

---

## Track 43 — UX Polish: Foundation + Save/Deploy

### Intent

Inject `uxFeedback` styles at editor boot and wire the two highest-value feedback points: the save button and the deploy flow. After this track, saving and deploying will feel like confirmed, safe actions rather than silent state changes.

### Scope

**In scope:**

1. `src/editor/init.ts` — call `uxFeedback.init()` once at editor startup to pre-inject styles before any panel renders.
2. `src/editor/panels/topBar.ts`
   - Call `uxFeedback.storage.markDirty(saveButtonEl)` whenever hot storage records an unsaved change (subscribe to the existing dirty event / callback from hot storage).
   - Call `uxFeedback.combos.saved(saveButtonEl, 'Project saved.')` when save completes successfully.
   - Call `uxFeedback.toast.error('Save failed.')` if save throws.
3. `src/editor/panels/deployPanel.ts`
   - Call `uxFeedback.combos.committed(deployButtonEl, 'Changes committed to repository.')` when deploy succeeds.
   - Call `uxFeedback.toast.error('Deploy failed. Check your connection.')` on failure.

**Out of scope:**

- Save on keypress / autosave — not yet implemented.
- Granular per-scene dirty tracking — tracked separately.

### Feedback classes satisfied

| Action | Classes delivered |
|---|---|
| Unsaved change exists | Safety (yellow dirty dot on save button) |
| Save completes | Safety + Completion (glow + toast) |
| Save fails | Completion/Error (error toast) |
| Deploy completes | Safety + Completion (glow + 6 s toast) |
| Deploy fails | Completion/Error (error toast) |

### Implementation phases

**Phase 1 — Init injection**

- [ ] In `src/editor/init.ts`, add `uxFeedback.init()` as the first call in `initEditor()`, before any panel is created.
- [ ] Confirm styles appear in the DOM (inspect `#irs-ux-feedback-styles`) — no visual regressions.

Files touched: `src/editor/init.ts`

**Phase 2 — Save button feedback**

- [ ] In `topBar.ts`, locate the save button element reference.
- [ ] Find where hot storage notifies the editor of unsaved changes (event or callback); call `uxFeedback.storage.markDirty(saveButtonEl)` there.
- [ ] Find the save success handler; replace or augment with `uxFeedback.combos.saved(saveButtonEl, 'Project saved.')`.
- [ ] Find the save error handler; add `uxFeedback.toast.error(...)`.
- [ ] Verify yellow dirty dot appears on any edit, clears with glow on save.

Files touched: `src/editor/panels/topBar.ts`

**Phase 3 — Deploy feedback**

- [ ] In `deployPanel.ts`, find the deploy success path; call `uxFeedback.combos.committed(deployButtonEl, 'Changes committed to repository.')`.
- [ ] Find the deploy error path; call `uxFeedback.toast.error('Deploy failed. Check your connection.')`.

Files touched: `src/editor/panels/deployPanel.ts`

**Phase 4 — Verification + closeout**

- [ ] `tsc --noEmit` passes.
- [ ] `npm run build` succeeds.
- [ ] Manual: make a canvas edit → save button shows yellow dot → save → glow + success toast.
- [ ] Manual: deploy → committed toast (6 s).
- [ ] Update `INDEX.md` if any new imports change the public surface.

### Risks

- **Dirty event source** — the exact hook for "hot storage changed" needs to be confirmed in `src/storage/hot.ts` or the editor event bus. If no event exists, a simple callback at the call site of each edit operation suffices. (LOW)
- **Button element reference** — `topBar.ts` may create the button element locally; ensure the reference is captured at construction time. (LOW)

---

## Track 44 — UX Polish: Assets + Animations

### Intent

Make asset and animation creation, deletion, and selection feel immediate and tangible. Every add and remove gets the correct multi-class feedback combo. Selection is always visually clear.

### Scope

**In scope:**

**`assetLibraryTab.ts`:**
- Upload asset → `uxFeedback.combos.created(uploadButtonEl, newRowEl)` (pulse + expand)
- Create animation set → `uxFeedback.combos.created(createButtonEl, newRowEl)`
- Delete asset → `uxFeedback.combos.deleted(deleteButtonEl, rowEl, 'Asset removed.', restoreFn, { destructive: true })`
- Select asset row → `uxFeedback.selection.mark(rowEl)`, clear previous on re-select

**`animationTab.ts`:**
- Create animation → `uxFeedback.combos.created(createButtonEl, newAnimRowEl)`
- Add frame to animation → `uxFeedback.motion.expand(newFrameEl)` + `uxFeedback.motion.pulse(addFrameButtonEl)`
- Delete animation → `uxFeedback.combos.deleted(deleteButtonEl, animRowEl, 'Animation deleted.', restoreFn)`
- Delete frame → `uxFeedback.motion.shrink(frameEl, () => frameEl.remove())` + undo bar
- Select animation in list → `uxFeedback.selection.mark(animRowEl)`
- Select frame → `uxFeedback.selection.focus(frameEl)`

**`spriteSlicerTab.ts`:**
- Slice action (generates frames) → `uxFeedback.toast.success('Sprite sliced into N frames.')` + `uxFeedback.motion.pulse(sliceButtonEl)`

**Out of scope:**

- Drag-and-drop reordering of frames — no feedback wiring until drag-reorder exists.
- Batch delete — not yet implemented.

### Feedback classes satisfied

| Action | Classes |
|---|---|
| Upload asset | Acknowledgement + State Change |
| Delete asset | Acknowledgement + Safety + Completion |
| Select asset | Acknowledgement |
| Create animation | Acknowledgement + State Change |
| Add frame | Acknowledgement + State Change |
| Delete animation | Acknowledgement + Safety + Completion |
| Delete frame | Acknowledgement + Safety + Completion |
| Select animation | Acknowledgement |
| Sprite slice | Acknowledgement + Completion |

### Implementation phases

**Phase 1 — Selection wiring (assetLibraryTab + animationTab)**

- [ ] In `assetLibraryTab.ts`, wrap row click handlers: call `uxFeedback.selection.mark(rowEl)` on each asset/set selection. Previous selection auto-clears via `selection.mark`.
- [ ] In `animationTab.ts`, call `uxFeedback.selection.mark(animRowEl)` on animation select; `uxFeedback.selection.focus(frameEl)` on frame select.
- [ ] Confirm only one selection is active at a time across each list (`.irs-selected` visible, no doubles).

Files touched: `assetLibraryTab.ts`, `animationTab.ts`

**Phase 2 — Creation combos**

- [ ] `assetLibraryTab.ts`: upload success → `combos.created(uploadButtonEl, newRowEl)`.
- [ ] `assetLibraryTab.ts`: create animation set → `combos.created(createButtonEl, newRowEl)`.
- [ ] `animationTab.ts`: create animation → `combos.created(createButtonEl, newAnimRowEl)`.
- [ ] `animationTab.ts`: add frame → `motion.expand(newFrameEl)` + `motion.pulse(addFrameButtonEl)`.
- [ ] `spriteSlicerTab.ts`: slice complete → `toast.success(...)` + `motion.pulse(sliceButtonEl)`.

Files touched: `assetLibraryTab.ts`, `animationTab.ts`, `spriteSlicerTab.ts`

**Phase 3 — Deletion combos**

- [ ] `assetLibraryTab.ts`: delete asset → `combos.deleted(...)` with undo callback restoring the row.
- [ ] `animationTab.ts`: delete animation → `combos.deleted(...)` with undo callback.
- [ ] `animationTab.ts`: delete frame → `motion.shrink(frameEl, cleanup)` + `undo.show('Frame removed.', restoreFn)`.

Files touched: `assetLibraryTab.ts`, `animationTab.ts`

**Phase 4 — Verification + closeout**

- [ ] `tsc --noEmit` passes.
- [ ] `npm run build` succeeds.
- [ ] Manual: upload → new row expands in with pulse on button.
- [ ] Manual: delete asset → row shrinks out → undo bar appears → undo restores.
- [ ] Manual: select asset → blue outline appears → select another → first clears.
- [ ] Manual: slice → toast confirms frame count.

### Risks

- **Undo callback implementation** — `combos.deleted` requires an `onUndo` callback that restores the item. If the data layer does not yet support instant in-memory restore, the undo bar should still appear (with the correct safety signal) and call the existing history manager's undo. Confirm which path exists. (MEDIUM)
- **DOM reference lifetime** — `newRowEl` must be captured before the async operation that creates it; confirm the row element reference is available in the success callback. (LOW)

---

## Track 45 — UX Polish: Entities + Tilemap

### Intent

Entity placement, deletion, and selection must feel as responsive as the assets system. Tile selection must show a clear active indicator. The shared delete button in `bottomContextStrip.ts` must emit the correct multi-class feedback for all deletion contexts.

### Scope

**In scope:**

**`entitiesTab.ts`:**
- Place entity on canvas → `uxFeedback.combos.created(paletteItemEl, placedEntityEl)` — pulse the palette item, expand the placed entity element (if DOM-represented in the panel list).
- Select entity → `uxFeedback.selection.mark(entityRowEl)` in the entity list panel.
- Delete entity → `uxFeedback.combos.deleted(deleteButtonEl, entityRowEl, 'Entity removed.', restoreFn, { destructive: true })`.
- Property edit (any field change) → `uxFeedback.motion.pulse(editedFieldEl)` as acknowledgement.

**`tilePicker.ts`:**
- Select tile → `uxFeedback.selection.mark(tileEl)`.
- Clear selection → `uxFeedback.selection.clear()`.

**`bottomContextStrip.ts`:**
- The delete button is shared across modes. The per-mode `onDelete` callback should be responsible for calling the correct `combos.deleted` or `motion.shrink` sequence. Ensure the strip passes the button element reference to `onDelete` so callers can use it as the `triggerEl`.

**Out of scope:**

- Entity duplication feedback — not yet implemented at the UI level.
- Multiselect — not yet implemented.

### Feedback classes satisfied

| Action | Classes |
|---|---|
| Place entity | Acknowledgement + State Change |
| Select entity | Acknowledgement |
| Delete entity | Acknowledgement + Safety + Completion |
| Edit entity property | Acknowledgement |
| Select tile | Acknowledgement |

### Implementation phases

**Phase 1 — Tile picker selection**

- [ ] In `tilePicker.ts`, on tile click: `uxFeedback.selection.mark(tileEl)`.
- [ ] On palette refresh (tileset change): `uxFeedback.selection.clear()` to avoid stale selection.

Files touched: `tilePicker.ts`

**Phase 2 — Entity selection + property acknowledgement**

- [ ] In `entitiesTab.ts`, on entity row click: `uxFeedback.selection.mark(entityRowEl)`.
- [ ] On property field change (input/select/toggle): `uxFeedback.motion.pulse(fieldEl)`.

Files touched: `entitiesTab.ts`

**Phase 3 — Entity creation + deletion**

- [ ] `entitiesTab.ts`: on entity placed → `uxFeedback.combos.created(paletteItemEl, newEntityRowEl)` (if entity list updates in the panel on placement).
- [ ] `entitiesTab.ts`: on entity delete → `uxFeedback.combos.deleted(deleteButtonEl, entityRowEl, 'Entity removed.', restoreFn, { destructive: true })`.
- [ ] `bottomContextStrip.ts`: expose `buttonEl` in the `onDelete` callback signature so callers can use it as `triggerEl` in `combos.deleted`.

Files touched: `entitiesTab.ts`, `bottomContextStrip.ts`

**Phase 4 — Verification + closeout**

- [ ] `tsc --noEmit` passes.
- [ ] `npm run build` succeeds.
- [ ] Manual: select a tile → blue outline persists when scrolling tile list.
- [ ] Manual: place entity → pulse on palette item → entity row expands into list.
- [ ] Manual: select entity row → blue outline → select another → first clears.
- [ ] Manual: delete entity → undo bar appears → undo restores.
- [ ] Manual: edit a property field → brief pulse on field element.

### Risks

- **Entity DOM row reference** — placement creates a canvas-layer entity. If the entity panel list row is not rendered at placement time, the `expand` motion target does not exist. In that case, fall back to `motion.pulse(paletteItemEl)` only, and `motion.expand(rowEl)` when the row renders. (MEDIUM)
- **`bottomContextStrip` callback signature change** — passing `buttonEl` to `onDelete` is a small API change. Audit all callers before changing the signature. (LOW)

---

## Track 46 — UX Polish: State Machine + Empty States + Audit

### Intent

Complete the UX polish rollout by wiring the animation state machine editor, implementing standardized empty states across all panels, and running a cross-system consistency audit to confirm the rules doc is fully satisfied.

### Scope

**In scope:**

**`animStateMachine.ts`:**
- Add state node → `uxFeedback.combos.created(addButtonEl, newNodeEl)`
- Delete state node → `uxFeedback.combos.deleted(deleteButtonEl, nodeEl, 'State removed.', restoreFn, { destructive: true })`
- Select state node → `uxFeedback.selection.mark(nodeEl)`
- Connect transition → `uxFeedback.motion.pulse(connectButtonEl)` + `uxFeedback.toast.info('Transition added.')`
- Save state machine → `uxFeedback.combos.saved(saveButtonEl, 'State machine saved.')`

**Empty states — all panels:**
Replace ad-hoc "nothing here" text or blank containers with `uxFeedback.emptyState.render(containerEl, { ... })`. Required for:

| Panel | Trigger condition | Message | Action |
|---|---|---|---|
| `assetLibraryTab` | No assets uploaded | 'No assets yet.' | 'Import Asset' → open import |
| `animationTab` | No animations | 'No animations yet.' | 'New Animation' → create |
| `entitiesTab` | No entities on scene | 'No entities placed.' | 'Select from palette' → focus palette |
| `tilePicker` | No tileset loaded | 'No tileset loaded.' | 'Open Asset Library' → open library tab |
| `animStateMachine` | No states defined | 'No states yet.' | 'Add State' → trigger add |

Clear each empty state with `uxFeedback.emptyState.clear(containerEl)` when items are added.

**Cross-system consistency audit:**

Walk through the Agent Implementation Checklist from `context/ux-polish-rules.md` for every system touched in Tracks 43–46:

- [ ] Every user action triggers minimum required feedback
- [ ] Selection and focus are always clearly visible
- [ ] No silent success paths
- [ ] Storage safety is surfaced (dirty dot, glow on save)
- [ ] Motion communicates meaning, not decoration
- [ ] Empty states invite action with a single next step
- [ ] Undo or reversibility clearly indicated after risky actions
- [ ] New UX matches feedback language of surrounding systems

**Out of scope:**

- `layerPanel.ts` — layer show/hide is a toggle; currently no creation/deletion flow that requires multi-class feedback. Low priority.
- `smSimulator.ts` — read-only; no user-initiated mutating actions.
- `berryControls.ts` — brush size slider; a `motion.pulse` on change is optional post-v1 polish.

### Implementation phases

**Phase 1 — State machine feedback**

- [ ] In `animStateMachine.ts`, wire `combos.created`, `combos.deleted`, `selection.mark`, `motion.pulse`, and `combos.saved` at the appropriate action handlers (see scope above).

Files touched: `animStateMachine.ts`

**Phase 2 — Empty states**

- [ ] Implement `uxFeedback.emptyState.render(...)` for each panel listed in the table above.
- [ ] Implement `uxFeedback.emptyState.clear(...)` when the first item is added in each panel.
- [ ] Confirm: one message, one action label, calm tone, no apologetic language.

Files touched: `assetLibraryTab.ts`, `animationTab.ts`, `entitiesTab.ts`, `tilePicker.ts`, `animStateMachine.ts`

**Phase 3 — Cross-system consistency audit**

- [ ] Walk through the Agent Implementation Checklist (reproduced above) for each system.
- [ ] For any gap found, create a fix task and resolve it before closing the track.
- [ ] Confirm: color tokens (`TOKEN.*`) are used consistently — no panel introduces its own ad-hoc colors for feedback states.
- [ ] Confirm: timing constants are used from `TOKEN` — no panel has hardcoded durations that differ from the shared timing scale.
- [ ] Confirm: terminology is consistent across toasts (e.g., "saved" not "saved successfully" or "done").

Files touched: varies by audit findings

**Phase 4 — Verification + closeout**

- [ ] `tsc --noEmit` passes.
- [ ] `npm run build` succeeds.
- [ ] Manual full walkthrough: every panel exercised (create, delete, select, save where applicable).
- [ ] Manual: empty state visible in each panel before first item added.
- [ ] Manual: empty state disappears when first item is added.
- [ ] Update `context/track-index.md` to list Tracks 43–46 under Phase 6.
- [ ] Update `context/active-track.md` when all four tracks complete.
- [ ] Append entries to `context/history.md` for Tracks 43–46.
- [ ] Confirm `INDEX.md` is complete.

### Risks

- **State machine node elements** — `animStateMachine.ts` may render nodes on a canvas or SVG layer rather than DOM elements. If nodes are not HTML elements, `uxFeedback.selection.mark()` and `motion.*` cannot be used directly. In that case: use `toast` for completion signals, and implement a CSS class on a DOM overlay or sidebar row instead. Confirm rendering approach before Phase 1 implementation. (HIGH — investigate first)
- **Empty state conflicts with loading spinners** — if a panel shows a loading state while fetching assets, the empty state must not render until loading is confirmed complete. Ensure empty state is only rendered in the confirmed-empty branch. (LOW)
- **Audit scope creep** — the audit may surface gaps that are large refactors. If a gap requires changes beyond the current panel wiring (e.g., a new event bus), log it in `context/planned-tests.md` as a future track rather than blocking Track 46 completion. (MEDIUM)

---

## Completion Definition

These four tracks together satisfy every item in the Agent Implementation Checklist from `context/ux-polish-rules.md` across all editor systems listed in scope.

A feature is not done until every checklist item is satisfied. That rule applies here too.

---

## Notes for Implementing Agents

- Import path: `import { uxFeedback } from '@/editor/uxFeedback';`
- Never roll a custom toast, motion, or selection indicator. Always use `uxFeedback`.
- Never stack more than two motions on the same element simultaneously.
- Motion must never block input — all `uxFeedback.motion.*` calls are fire-and-forget.
- Toast messages: use sentence case, past tense, ≤ 5 words where possible (e.g., "Animation saved." not "Your animation has been successfully saved.").
- Undo callbacks must restore the exact data and DOM state as they were before the action. If restoration is not yet possible, still show the undo bar — it signals reversibility even if the callback is a no-op that calls the history manager.

---

*Last updated: 2026-02-20*
