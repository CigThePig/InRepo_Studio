# InRepo Studio — Animation UI/UX Upgrade: Agent Prompt (v2)

> **Verified against actual codebase.** All file references, line numbers, type names, and current-state descriptions below reflect the real code.

---

## Context & Goal

You are continuing work on InRepo Studio, a mobile-first browser-based game editor. The animation backend is mature and well-typed. This prompt covers 5 phases of UI-only upgrades — no backend rewrites, no new tabs.

**Before writing any code for each phase**, read every file listed in that phase's "Files to read first" section. Do not assume current structure — the actual code differs from what you might expect.

---

## Critical Constraints

### No new top-level tabs
The left berry panel already has 5 tabs defined in `src/editor/panels/leftBerryTabs.ts`:
`sprites | animation | assets | tools | presets`

Do not add a 6th. The correct two-tab flow is Assets (browse/manage) → Animation (edit one) → back to Assets.

### No `window.prompt()`, `window.alert()`, or `window.confirm()`
Every one of these currently in the codebase must be replaced with an inline UI. The exact locations of each are listed under the relevant phase.

### Mobile-first, 320px panel width
Every touch target must be at least 44px. No hover-only paths to features. Test every new element mentally against a 320px panel width.

---

## Phase 1 — Upgrade the Assets Tab Animation Section

**Target file:** `src/editor/panels/assetLibraryTab.ts`

**Files to read first:**
- `src/editor/panels/assetLibraryTab.ts` — full file (~1627 lines)
- `src/editor/canvas/animationClock.ts` — full file (212 lines)
- `src/editor/assets/assetRegistry.ts` — lines 47–90 (AnimationAsset type), 698–720 (getAnimations), 1251–1270 (onChange/onAnimationsChanged)
- `src/editor/assets/animationRefs.ts` — full file (80 lines)

### What currently exists in this file (do NOT rebuild):
- `renderAnimations()` function renders a 2-column grid (`.asset-library__animations`) of all animations
- Each card shows: `posterDataUrl` as a static `<img>`, name, "N frames · Y fps" meta, plus Rename / Duplicate / Where Used / Delete action buttons
- The Duplicate action is fully functional — do not touch it
- Animation Sets section exists below with a "Create Animation Set" button and a set grid
- `assetRegistry.onChange(callback)` fires on every registry change and already drives the main `refresh()` call
- `assetRegistry.onAnimationsChanged(callback)` fires specifically when animations change
- The sheet/scrim system (`renderSheet()`) handles the existing sprite asset action sheets
- The `asset-library__group-toggle` / `asset-library__group-count` collapse pattern already exists for sprite groups

### What to change — surgical upgrades only:

**1. Animated thumbnails (replace static `<img>` with live `<canvas>`)**

The `AnimationAsset` type is:
```typescript
interface AnimationAsset {
  id: string;
  name: string;
  frames: AnimationFrameRef[];  // each has sourceAssetId, rect, optional durationMs
  fps: number;
  loopMode: AnimationLoopMode;
  pivot: { x: number; y: number };
  posterDataUrl?: string;       // static fallback only
  createdAt: number;
}
```

Important: `AnimationFrameRef` stores `sourceAssetId` + `rect` — it does NOT store a pre-cropped image. To render a live frame, you must:
1. Call `assetRegistry.getAsset(frame.sourceAssetId)` to get the `AssetEntry`
2. Load its `dataUrl` into an `HTMLImageElement` (cache by `sourceAssetId`)
3. Call `drawImage(img, rect.x, rect.y, rect.w, rect.h, dx, dy, dw, dh)` to crop onto the canvas

Implementation approach:
- Create a module-level source image cache (`Map<string, HTMLImageElement>`) within the `createAssetLibraryTab` closure
- Import and call `createAnimationClock()` from `@/editor/canvas/animationClock` once per tab instance — one shared clock for all thumbnails
- For each animation card, replace the `<img>` element with a `<canvas>` sized to fill the card's thumbnail area
- Call `clock.register(animation.id, animation)` for each visible animation
- Drive the clock via a single shared `requestAnimationFrame` loop that calls `clock.tick(deltaMs)` and redraws only the canvases whose animation IDs appear in the dirty set returned by `tick()`
- Use `IntersectionObserver` to call `clock.unregister(id)` for off-screen cards and re-register when they scroll back in
- When the tab is destroyed, call `clock.destroy()` and cancel the rAF loop
- Show `posterDataUrl` as a static fallback while the source image is loading; if `posterDataUrl` is absent, use the existing SVG placeholder

**2. Inline Rename (replace `window.prompt()` — line ~1497 in `renderAnimations()`)**

The current rename button calls:
```typescript
const nextName = window.prompt('Rename animation', animation.name);
```

Replace with: on click of the Rename button, swap the card's name `<div>` with an `<input>` pre-filled with the current name. Commit on Enter or blur. Cancel on Escape. Revert to the name div on cancel.

**3. Where Used — inline result list (replace `window.alert()` — line ~1513 in `renderAnimations()`)**

The current code calls `window.alert(...)` after running `collectAnimationReferences()`. The scan logic itself works correctly — do not touch it.

Replace the `window.alert()` with: a collapsible panel that appears directly below the card when "Where Used" is tapped. Shows each reference as a readable line (e.g. "Scene main → Entity player", "Animation Set walk-set (left)", "State Machine enemy-sm → State run"). If zero references, show "Not used anywhere" inline. Tapping "Where Used" again collapses the panel.

**4. Delete — inline confirmation (replace `window.confirm()` — line ~1527 in `renderAnimations()`)**

The current delete (`×` button) calls `window.confirm(...)`. Replace with: tapping `×` reveals an inline confirmation row on the card showing the reference count from `collectAnimationReferences()` and two buttons — "Cancel" (dismisses) and "Delete" (executes). If references exist, label it "Used by N — delete anyway?".

**5. Animation Sets — inline Create (replace `window.prompt()` — line ~1549 in `renderAnimations()`)**

The "Create Animation Set" button calls `window.prompt()`. Replace with: tapping the button shows an inline text input and "Create" / "Cancel" buttons that appear in the sets section. Commit on Enter or the "Create" button.

**6. Animation Sets — "Assign Directions" (replace `window.prompt()` loop — line ~1577)**

The "Assign Directions" button currently runs a `window.prompt()` loop for each facing. Replace with: a mobile-friendly bottom sheet (reusing the existing `.asset-library__sheet-scrim` / `.asset-library__sheet` system already present in the file) showing 4 rows (Up / Down / Left / Right), each a `<select>` populated from `assetRegistry.getAnimations()`. Save or Cancel buttons at the bottom.

**7. Animation Sets — inline Rename (replace `window.prompt()` — line ~1589)**

Same pattern as animation Rename above.

**8. Animation Sets — inline Delete confirmation (replace `window.confirm()` — line ~1598)**

Same pattern as animation Delete above. Show "Used by N entities — delete anyway?" based on `clearAnimationSetEntityReferences` count.

**9. Search/filter input**

Add a text `<input>` at the top of the Animations section (above the card grid). Filter cards in real time by animation name (case-insensitive substring). Show a "No animations match" empty state if the filter produces zero results.

**10. Collapsible Animations section**

Wrap the entire Animations block (clips grid + sets grid) under a collapsible section header using the existing `.asset-library__group-toggle` / `.asset-library__group-count` CSS classes and pattern already present in `renderGroups()`. Default to expanded.

---

## Phase 2 — Visual Timeline & Frame Editing

**Target file:** `src/editor/panels/animationTab.ts`

**Files to read first:**
- `src/editor/panels/animationTab.ts` — full file (~2423 lines). Pay particular attention to:
  - Lines 114–205: existing filmstrip CSS (`.animation-tab__frames-strip` — already horizontal `display:flex overflow-x:auto`)
  - Lines 1930–1990: `renderFrames()` — uses `frame.thumbnailDataUrl` which is a pre-cropped data URL generated at frame-add time
  - Lines 1836–1870: `tick()` — the current playback loop (does NOT use AnimationClock; uses uniform FPS only)
  - Lines 1607–1620: save sheet loop toggle (only `loop ↔ once`, no pingpong)
  - Line 1968: `window.prompt()` for per-frame duration
- `src/editor/canvas/animationClock.ts` — full file (supports per-frame `durationMs` and `pingpong` correctly)

### Current state — what already exists:

The filmstrip **already is** a horizontal scrollable strip (`display: flex; overflow-x: auto; -webkit-overflow-scrolling: touch`). Frame cards are 56×56px buttons with `frame.thumbnailDataUrl` as an `<img>`. Drag-to-reorder already works (long-press activates, pointerMove reorders). Do not rebuild any of this.

**Data integrity clarification (important):** `durationMs` is **already correctly preserved** in `cloneAnimation()` (line 251 of assetRegistry.ts), **already compiled** in `buildProjectPack.ts` (line 377), and **already handled** in `projectLoader.ts` (lines 179–187). No data-layer fixes are needed.

**What is NOT working:**

The `tick()` loop (line ~1836) is a simple uniform-FPS loop that ignores per-frame `durationMs` and does not handle `pingpong`. This means if a user sets per-frame durations or pingpong mode, the preview will not play them correctly.

The loop mode save sheet toggle (line ~1613) only cycles `loop ↔ once`. The `'pingpong'` loopMode exists in types but has no UI anywhere.

### What to build:

**1. Fix the preview tick to use AnimationClock**

Replace the hand-rolled `tick()` / `startPlayback()` / `stopPlayback()` with `createAnimationClock()` from `@/editor/canvas/animationClock`. Register the current animation when loading, tick on rAF, and re-render the preview canvas on each dirty frame. This makes the preview correctly respect per-frame `durationMs` and `pingpong`. The `AnimationClock.getCurrentFrameSnapshot()` returns the current `AnimationFrameRef` and pivot — use these to drive the existing canvas draw logic.

**2. Per-frame duration — inline badge inputs (replace `window.prompt()` — line 1968)**

Currently, clicking any frame cell triggers `window.prompt()` to set `durationMs`. Replace with: a small badge on each frame cell showing the duration — either the frame's own `durationMs` (shown in a distinct colour, e.g. amber) or the computed default (`Math.round(1000 / state.fps)` ms, shown in muted grey). Tapping the badge reveals a small inline number input directly on the cell. Commit on Enter or blur, cancel on Escape. The badge reverts to showing the committed value.

**3. Add pingpong to the loop mode toggle**

In the save sheet (`openSaveSheet` / `loopToggle`), change the current binary `loop ↔ once` toggle to a 3-way cycle: `Loop → Once → Pingpong → Loop`. Update the label text and the loopChip in the overlay to reflect all three states. Make sure the loopChip outside the sheet (`.animation-tab__chip`) also cycles through all three on tap.

**4. Timeline scrubber**

Add a horizontal scrubber bar below the preview canvas. It shows a draggable playhead whose position maps to the current frame index. Dragging it manually seeks to a frame. When playback is active, it advances automatically. This is display-only time-axis feedback — it does not need to be pixel-accurate to individual frame durations, just proportional.

**5. Batch operations toolbar**

Add multi-select to the filmstrip: long-press on a frame not already selected adds to selection (distinct from the drag-reorder long-press — use a separate visual mode, e.g. a "Select" toggle button that enters selection mode). While in selection mode, show a contextual toolbar with: "Set Duration", "Duplicate", "Delete". "Set Duration" shows an inline input that applies the value to all selected frames. Exit selection mode via a "Done" or "×" button.

**6. FPS slider**

Alongside the existing FPS number input in the save sheet, add a `<input type="range">` slider (min 1, max 60). Keep the number input and slider in sync — changing either updates the other. This gives tactile control on mobile.

---

## Phase 3 — Directional Animation Sets UI

**Target files:** `src/editor/panels/assetLibraryTab.ts`, `src/editor/assets/assetRegistry.ts`, `src/editor/panels/entitiesTab.ts`, `src/pack/buildProjectPack.ts`

**Files to read first:**
- `src/editor/panels/assetLibraryTab.ts` — the `renderAnimations()` function and set card rendering (~lines 1540–1620)
- `src/editor/panels/entitiesTab.ts` — lines 622–720 (the animation section of the entity inspector)
- `src/editor/assets/assetRegistry.ts` — AnimationSetAsset type (lines 65–75), addAnimationSet/updateAnimationSet/removeAnimationSet methods

### Current state — what already exists:

- `AnimationSetAsset` type is fully defined: `{ id, name, directions: Partial<Record<Facing4, string>>, createdAt }`
- `assetRegistry` has `addAnimationSet`, `updateAnimationSet`, `removeAnimationSet`, `getAnimationSets`, `getAnimationSet`
- The Assets tab already renders set cards with name and text list of direction assignments
- **The entity inspector in `entitiesTab.ts` already has both an `animationSetSelect` and an `animationSelect` dropdown** — entities can already be assigned a set ID. Phase 1's inline upgrades (replacing prompts in set Create/Rename/AssignDirections/Delete) address the main gaps.

### What to build:

**1. Direction dropdowns in the set card (replace `window.prompt()` loop in "Assign Directions")**

This is covered in Phase 1 item 6 above (the bottom sheet with 4 `<select>` dropdowns populated from `assetRegistry.getAnimations()`). Complete that before moving further.

**2. Inline mini-preview per direction slot**

Once the direction bottom sheet exists (from Phase 1 item 6), add a small live `<canvas>` preview in each direction row showing the currently assigned animation playing (reusing the same `AnimationClock` + source image pattern from Phase 1). If no animation is assigned to that direction, show the muted placeholder.

**3. Build pipeline — compile animationSets**

Read `src/pack/buildProjectPack.ts` lines 269–295 before editing. The `compiledAnimationSets` value is currently passed through — verify it actually maps `AnimationSetAsset[]` to `ProjectAnimationSet[]` format. If the current output is an empty array despite sets existing, fix the mapping to use the correct field names from `AnimationSetAsset`.

---

## Phase 4 — Inline Previews & Contextual Animation Access

**Target files:** `src/editor/panels/entitiesTab.ts`, `src/editor/panels/animStateMachine.ts`

**Files to read first:**
- `src/editor/panels/entitiesTab.ts` — full file (~986 lines)
- `src/editor/panels/animStateMachine.ts` — full file (~1289 lines)

### What to build:

**1. Entity inspector inline preview**

In `entitiesTab.ts`, after the `animationSelect` dropdown (line ~636), when an `animationId` is set on the entity, render a small looping `<canvas>` preview driven by `AnimationClock`. Use the same source-image-cache pattern as Phase 1. Register the animation on the clock when the entity changes, unregister on cleanup. Sized ~56×56px, compact.

**2. Poster thumbnails in animation dropdowns**

The `animationSelect` and `animationSetSelect` in `entitiesTab.ts` are plain `<select>` elements. Replace them with custom dropdown components that show the `posterDataUrl` thumbnail as a leading icon next to each animation name. Keep the same `value` / `onChange` semantics. Sized to the full 44px min-height touch target.

**3. State machine node thumbnails**

In `animStateMachine.ts`, each state node is drawn on a `<canvas>` via `ctx.drawImage` / `ctx.fillText`. After reading the node rendering section, add code to draw the `posterDataUrl` of the node's assigned animation as a small thumbnail within the node rectangle (top portion of the node), with the state name below it. Use `posterDataUrl` only — no live animation clock needed here.

**4. Hover-to-preview (desktop only)**

In the animation dropdowns in the entity inspector, on `mouseenter` of a dropdown option (not touch), show a small floating `<canvas>` preview near the dropdown playing the hovered animation via `AnimationClock`. Dismiss on `mouseleave`. This feature is desktop-only — touch devices have no hover. Do not build it as the only path to previewing; the inline preview from item 1 already covers touch.

**5. "Jump to animation" link**

In the entity inspector's animation row, add a small icon button (e.g. `▶ Edit`) next to the `animationSelect`. Tapping it calls `config.onEditAnimation?.(animationId)` (which already exists on the `entitiesTab` config at line 222) to open that animation in the Animation tab.

---

## Phase 5 — State Machine Editor UX Polish & Simulation Mode

**Target files:** `src/editor/panels/animStateMachine.ts`, new `src/editor/panels/smSimulator.ts`

**Files to read first:**
- `src/editor/panels/animStateMachine.ts` — full file (~1289 lines). Understand the canvas node/transition rendering, pan/zoom state, hit-testing logic, and the data structures `AnimStateMachineAsset`, `AnimStateMachineState`, `AnimStateMachineTransition` before adding anything.
- `src/runtime/presets/defs/state-machine-driver.ts` — read for the state machine evaluation logic to mirror in the simulator (no Phaser imports).
- `src/types/animStateMachine.ts` — full file for type definitions.

### What to build:

**1. Simulation mode**

Add a toolbar toggle button "Simulate" that enters simulation mode. In simulation mode:
- Create `smSimulator.ts` as a pure TypeScript state evaluator (no Phaser, no DOM side effects) that accepts the `AnimStateMachineAsset` graph and exposes: `getCurrentStateId()`, `sendEvent(name: string)`, `setVariable(name: string, value: number | boolean)`, `reset()`
- The active state node is highlighted green on the canvas
- A row of "Send Event" buttons appears for each unique event name found in the transition conditions
- The active state's assigned animation plays in a small `<canvas>` thumbnail using `AnimationClock`
- Exiting simulation mode restores the normal canvas appearance

**2. Auto-layout**

Add a "Layout" button. On click, run a simple topological sort (or force-directed if cycles exist) to space nodes evenly and minimize edge crossings. Apply the new positions via `assetRegistry.updateAnimStateMachine(...)`. Animate the position change smoothly.

**3. Alignment guides and grid snap**

While dragging a node, snap its position to a 16px grid. Show dashed guide lines when the dragged node's centre or edges align within 4px of another node's centre or edge. Clear guides on drop.

**4. Condition chips on transition arrows**

Instead of the current text label on transition arrows, render each condition as a pill/chip directly on the arrow midpoint. Text format: `"velocity > 0"` or `"event: jump"`. Tapping a chip opens a small inline popover (positioned relative to the arrow) with editable fields for the condition — no modal, no browser dialog.

**5. Keyboard shortcuts (desktop)**

- `Delete` — remove the currently selected node or transition
- `Escape` — deselect
- `Ctrl+Z` / `Ctrl+Y` — undo/redo within the SM canvas (integrate with the existing history manager if available, or maintain a local stack)

**6. Zoom to fit**

Add a "Fit" button that calculates the bounding box of all nodes and sets the pan/zoom so all nodes are visible with padding.

**7. Entry state indicator**

Draw a distinct visual marker on the initial state (e.g. a small "▶ Start" arrow pointing at it, or a coloured border) so the entry point is self-evident.

---

## Implementation Rules (apply to all phases)

1. **Read before writing.** For every file listed in a phase, read the specific sections called out before touching them.

2. **No `window.prompt()`, `window.alert()`, or `window.confirm()`** anywhere. Replace all of them.

3. **Mobile-first.** 320px panel width. Touch targets ≥ 44px. No hover-only paths to features.

4. **Reuse `AnimationClock`** (`@/editor/canvas/animationClock`) for all live animation previews. Do not build a second animation tick system. One clock instance per UI area (one for the assets tab, one for the animation tab preview, one for the entities tab inspector). The clock's `register(id, animation)` and `unregister(id)` are cheap — call them freely.

5. **Source image loading pattern.** For any canvas that renders sprite frames, maintain a `Map<string, HTMLImageElement>` keyed on `sourceAssetId`. Load on demand via the asset's `dataUrl` from `assetRegistry.getAsset(sourceAssetId)`. Cache hits avoid re-loading. Show `posterDataUrl` (if available) while loading.

6. **No new top-level tabs.** If new UI surface is needed, use collapsible sections, sub-tabs within an existing tab, or the existing sheet/scrim pattern.

7. **Do not rebuild working functionality.** The Duplicate action, the reference scan logic in `animationRefs.ts`, the drag-reorder filmstrip, and the existing set assignment in `entitiesTab.ts` all work correctly. Only upgrade what the phase specifies.

8. **One phase at a time.** Complete and verify each phase before starting the next.

9. **Commit frequently.** After each meaningful working state within a phase, commit. Do not accumulate large uncommitted diffs.

---

## Recommended Phase Order

| Phase | Key reason for this position |
|-------|------------------------------|
| 1 — Assets Tab upgrade | Highest daily friction; removes all `window.prompt/alert/confirm` from the browse experience; establishes the inline UI patterns and AnimationClock thumbnail pattern reused everywhere |
| 2 — Visual Timeline | Fixes the preview tick (per-frame durations + pingpong); adds the remaining `window.prompt` replacement in the editor; FPS slider and batch ops improve the creation flow |
| 3 — Animation Sets | Unlocks directional characters; depends on the Phase 1 direction-assignment sheet being in place |
| 4 — Inline Previews | Ties the full editor together contextually; depends on Phase 1+2 clock patterns |
| 5 — SM Simulation | Highest payoff for advanced users; depends on Phase 4 animation thumbnails |
