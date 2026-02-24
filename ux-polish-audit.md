# InRepo Studio — UX Polish Rules Audit
**Date:** 2026-02-24 (refreshed)  
**Rules reference:** `context/ux-polish-rules.md`  
**Result: ❌ VIOLATIONS FOUND — features cannot be marked complete**

---

## Audit refresh status (2026-02-24)

### Completed in this pass ✅

- [x] Re-validated all previously flagged scene action feedback gaps in `src/editor/init.ts` (`rename`, `duplicate`, `resize`, `delete`) — still missing completion feedback.
- [x] Re-validated key hardcoded color/radius violations in runtime/editor/boot files listed below — violations still present.
- [x] Updated this audit document date/state to reflect current repository status.

### Still needs implementation work ❌

- [ ] Replace hardcoded color values in inline/component CSS with `--irs-*` tokens (Category A).
- [ ] Replace hardcoded `border-radius` pixel values with `--irs-radius-*` tokens (Category A3).
- [ ] Replace hardcoded `44px` touch-target values with `var(--irs-touch-target)` (Category B).
- [ ] Migrate non-compliant buttons to `.irs-btn` base classes (Category C1).
- [ ] Migrate deploy panel input to include `.irs-input` and remove duplicated custom input skinning (Category C2).
- [ ] Add completion/safety UX feedback to scene operations (`rename`, `duplicate`, `resize`, `delete`) (Category D1–D4).

### Progress tracker by category

| Category | Scope | Status | Notes |
|---|---|---|---|
| A1/A2 | Hardcoded hex/rgb/rgba values | ⏳ Not started | Violations still present in boot/editor/runtime CSS strings. |
| A3 | Hardcoded border-radius values | ⏳ Not started | Radius tokens exist in `theme.css` but are not yet adopted broadly. |
| B | Touch-target sizing tokens | ⏳ Not started | Several `44px` literals still need migration to `var(--irs-touch-target)`. |
| C1 | Button base class compliance (`.irs-btn`) | ⏳ Not started | Custom button classes still bypass shared button primitives in multiple panels. |
| C2 | Input base class compliance (`.irs-input`) | ⏳ Not started | Deploy panel input still lacks `.irs-input`. |
| D1–D4 | Scene action completion feedback | ⏳ Not started | `rename`, `duplicate`, `resize`, `delete` still need success/reassurance feedback. |

### Recommended implementation order

1. **Fix Category D first** (scene action feedback) to remove silent-success UX paths quickly.
2. **Fix Category C next** (button/input primitives) to standardize control behavior globally.
3. **Fix Category A/B in grouped sweeps** by module (boot/runtime/editor) to reduce regressions.
4. Re-run this audit and flip each tracker row from ⏳ to ✅ only after code+manual verification.

---

## Overview

The codebase has **three categories of violations**: (A) the Golden Rule on hardcoded values, (B) touch-target sizing, and (C) UX feedback gaps. Canvas 2D API calls (`ctx.fillStyle`, `ctx.strokeStyle`) are noted separately — they cannot technically read CSS variables, but they still violate the letter of the rule and should be addressed wherever a theme token equivalent exists.

---

## Category A — Golden Rule Violations (Hardcoded Colors & Border-Radius)

> **Rule:** Never use hardcoded hex codes, `rgb()`, `rgba()`, or static pixel values for `border-radius` in component-specific files. All values must come from `src/shared/theme.css` via CSS variables.

### A1 — Hardcoded Hex Colors in CSS Strings

These are CSS strings embedded in TypeScript, not Canvas 2D API calls, so there is no exemption.

| File | Lines | Values |
|------|-------|--------|
| `boot/main.ts` | 44–47 | `#ff6b6b`, `#888`, `#4a4a6a` (error overlay) |
| `editor/init.ts` | 2182, 2193, 2207, 2219, 2231, 2237, 2305, 2316, 2329, 2341, 2378, 2392 | `#ffddaa`, `#d6d0c2`, `#cfe6ff`, `#c9c9c9`, `#aab0d4`, `#ffd0d0`, `#e7c7c7`, `#1a1a2e`, `#0a0a1a` (notice banners, system panel styles) |
| `editor/blockly/blocklyWorkspace.ts` | 91 | `colour: '#333'` (Blockly workspace background) |
| `runtime/playtestOverlay.ts` | 24, 41 | `#fff` × 2 (overlay text) |
| `runtime/init.ts` | 50–51, 58, 171 | `#0a0a1a`, `#fff`, `#b0b0d0` (runtime error screen) |

**Fix:** Replace with the appropriate `--irs-*` tokens:
- `#ff6b6b` / `#ffd0d0` / danger reds → `var(--irs-accent-danger)` or `var(--irs-color-red)`
- `#ffddaa` / warning ambers → `var(--irs-accent-warning)` or `var(--irs-color-yellow)`
- `#cfe6ff` / `#aab0d4` / muted blues → `var(--irs-text-secondary)` or `var(--irs-text-muted)`
- `#c9c9c9` / `#d6d0c2` / muted grays → `var(--irs-text-muted)`
- `#fff` / `#ffffff` → `var(--irs-text-primary)`
- `#0a0a1a` / `#1a1a2e` backgrounds → `var(--irs-surface-base)` / `var(--irs-surface-modal)`
- `#333` (Blockly) → `var(--irs-surface-base)` passed as a resolved value via `getComputedStyle`

---

### A2 — Hardcoded rgba() Values in CSS Strings

| File | Lines | Notes |
|------|-------|-------|
| `editor/init.ts` | 2180–2229, 2303–2339 | Notice banner and system panel inline CSS (warning, info, error states) |
| `runtime/playtestOverlay.ts` | 23–76 | Entire overlay stylesheet — all colors hardcoded |
| `runtime/init.ts` | 58, 171 | Runtime error text and Phaser `backgroundColor` |

**Canvas 2D rendering files** (technically can't use CSS vars directly, but flagged for awareness):
`editor/canvas/brushCursor.ts:16`, `editor/canvas/renderer.ts:46–57`, `editor/canvas/entityRenderer.ts:27`, `editor/panels/assetLibraryTab.ts:2084,2127`, `editor/panels/animStateMachine.ts:295,309,310,919`, `editor/panels/spriteSlicerTab.ts:998–1083`.

These canvas files should define constants that *mirror* the theme tokens (read via `getComputedStyle` on boot and cached) rather than hard-coding their own colour palette.

---

### A3 — Hardcoded `border-radius` Pixel Values

The theme provides: `--irs-radius-xs:2px`, `--irs-radius-sm:8px`, `--irs-radius-md:10px`, `--irs-radius-lg:12px`, `--irs-radius-xl:14px`, `--irs-radius-pill:999px`. Every hardcoded pixel value below maps directly to one of these tokens.

| File | Hardcoded values | Correct replacement |
|------|-----------------|---------------------|
| `editor/uxFeedback.ts` | `12px` (×2), `8px`, `10px` | `--irs-radius-lg`, `--irs-radius-sm`, `--irs-radius-md` |
| `editor/init.ts` | `10px` (×2), `8px` (×4) | `--irs-radius-md`, `--irs-radius-sm` |
| `editor/panels/animationTab.ts` | `18px`, `14px`, `999px`, `12px`, `10px`, `6px`, `3px`, `4px`, `20px 20px 0 0` + more | `--irs-radius-xl`, `--irs-radius-xl`, `--irs-radius-pill`, `--irs-radius-lg`, `--irs-radius-md`, `--irs-radius-sm`, `--irs-radius-xs`, `--irs-radius-xs`; mixed-corner value needs a local utility or composition |
| `editor/panels/entitiesTab.ts` | `14px`, `12px` (×2), `10px` (×4), `8px`, `4px` (×3) | `--irs-radius-xl`, `--irs-radius-lg`, `--irs-radius-md`, `--irs-radius-sm`, `--irs-radius-xs` |
| `editor/panels/berryShell.ts` | `8px` (×3), `2px`, `0 10px 10px 0`, `10px 0 0 10px` | `--irs-radius-sm`, `--irs-radius-xs`; mixed-corner values should be e.g. `0 var(--irs-radius-md) var(--irs-radius-md) 0` |
| `editor/panels/bottomPanel.ts` | `14px`, `10px` | `--irs-radius-xl`, `--irs-radius-md` |
| `editor/panels/assetPalette.ts` | `14px`, `10px`, `8px` | `--irs-radius-xl`, `--irs-radius-md`, `--irs-radius-sm` |
| `editor/panels/layerPanel.ts` | `10px`, `4px`, `8px` | `--irs-radius-md`, `--irs-radius-xs`, `--irs-radius-sm` |
| `editor/panels/deployPanel.ts` | `10px`, `8px` | `--irs-radius-md`, `--irs-radius-sm` |
| `editor/panels/berryControls.ts` | *(none flagged — uses vars correctly)* | ✅ |
| `editor/panels/topPanel.ts` | `8px`, `6px` | `--irs-radius-sm` (6px has no exact token — use `--irs-radius-sm` or add `--irs-radius-xs2`) |
| `editor/panels/spriteSlicerTab.ts` | `8px` (×2) | `--irs-radius-sm` |
| `editor/panels/bottomContextStrip.ts` | `8px` | `--irs-radius-sm` |
| `editor/panels/tilePicker.ts` | `2px` | `--irs-radius-xs` |
| `editor/scenes/sceneSelector.ts` | `50%` | No token — acceptable for circular badges, but document the exception |
| `editor/blockly/blocklyTopBar.ts` | `50%` | Same — acceptable for circle, document it |
| `editor/blockly/blocksPaletteStyles.ts` | `50%` | Same |
| `runtime/playtestOverlay.ts` | `6px`, `10px`, `50%` | `--irs-radius-sm`, `--irs-radius-md`; `50%` is circle |
| `boot/main.ts` | `4px` | `--irs-radius-xs` |

> **Note on `50%`:** No radius token exists for this. It is an acceptable exception for perfectly circular elements (badges, dot indicators) — but add a comment to each usage so it's explicit, and consider adding `--irs-radius-circle: 50%` to the token file.

> **Note on `6px`:** Falls between `--irs-radius-xs` (2px) and `--irs-radius-sm` (8px). Prefer rounding to `--irs-radius-sm`, or add `--irs-radius-xs2: 6px` to the theme if the design intent is distinct.

---

## Category B — Touch Target Violations

> **Rule:** Every interactive element **must** have `min-height: var(--irs-touch-target)`. Do not use the hardcoded value `44px` — changes to the token would silently orphan these elements.

| File | Location | Violation |
|------|----------|-----------|
| `editor/panels/animationTab.ts:232` | `.animation-tab__button` | `min-height: 44px` → must be `var(--irs-touch-target)` |
| `editor/panels/spriteSlicerTab.ts:71` | `.irs-sprite-slicer__button` | `min-height: 44px` → must be `var(--irs-touch-target)` |
| `editor/panels/entitiesTab.ts:48` | `.entities-tab__palette-button` | `min-height: 44px` → must be `var(--irs-touch-target)` |
| `editor/panels/entitiesTab.ts:193` | `.entities-tab__action-button` | `min-height: 44px` → must be `var(--irs-touch-target)` |
| `editor/panels/bottomPanel.ts:90` | `.irs-bottom-panel__tool-button` | `height: 44px` with no `min-height` — use `min-height: var(--irs-touch-target)` instead; `height` alone clips on larger font sizes / zoom |

---

## Category C — Button & Input Class Violations

> **Rule:** Buttons must use `.irs-btn`. Inputs must use `.irs-input`. Component-specific classes may add layout/spacing overrides but must layer on top of the shared base classes.

### C1 — Buttons Not Using `.irs-btn`

The following custom button classes define their own `background`, `border`, `color`, and interaction states from scratch instead of layering on `.irs-btn`:

| File | Class | Missing |
|------|-------|---------|
| `editor/panels/entitiesTab.ts` | `.entities-tab__palette-button` | no `irs-btn` base |
| `editor/panels/entitiesTab.ts` | `.entities-tab__place-button` | no `irs-btn` base |
| `editor/panels/entitiesTab.ts` | `.entities-tab__action-button` | no `irs-btn` base |
| `editor/panels/bottomPanel.ts` | `.irs-bottom-panel__tool-button` | no `irs-btn` base |
| `editor/panels/animationTab.ts` | `.animation-tab__button` | no `irs-btn` base |

These should add `irs-btn` (and a variant like `irs-btn--secondary`) to the HTML element class list, then use the component class only for layout overrides (flex, gap, padding adjustments). This ensures hover states, focus rings, and disabled states are consistent with the rest of the UI.

> **Note:** `berryControls`, `utilitiesTab`, `topBar`, `spriteSlicerTab`, `animStateMachine` all correctly layer their component class on top of `.irs-btn` — use those as the pattern.

### C2 — Inputs Not Using `.irs-input`

| File | Element | Issue |
|------|---------|-------|
| `editor/panels/deployPanel.ts:215,219` | `<input class="irs-deploy-panel__input">` | Does not include `irs-input`. The custom class re-implements `border-radius`, `border`, and `background` from scratch — including a hardcoded `border-radius: 8px`. Change to `class="irs-input irs-deploy-panel__input"` and remove any properties from the component class that duplicate `irs-input`. |

---

## Category D — UX Feedback Contract Violations

> **Rule — Destructive actions** require 3 feedback classes: Acknowledgement + State Change + Safety/Reassurance or Completion.  
> **Rule — Creation/Modification actions** require 2 feedback classes.  
> **Silent success is not allowed.**

### D1 — Scene Delete: No Completion Feedback (`editor/init.ts:2130–2136`)

```ts
case 'delete': {
  const confirmed = await showDeleteConfirmation(scene.name); // ✅ Acknowledgement
  if (confirmed) {
    await sceneManager.deleteScene(sceneId);
    // ❌ No toast or undo bar here
  }
  break;
}
```

The confirmation dialog counts as one feedback class (Safety/Reassurance). The list visually updating counts as another (State Change). But there is **no Completion signal** — no toast, no undo bar. Per the rules, deletion requires all 3 classes. 

**Fix:** Add after `deleteScene()`:
```ts
uxFeedback.toast.success(`"${scene.name}" deleted.`);
// or, if undo becomes feasible:
// uxFeedback.undo.show(`"${scene.name}" deleted.`, undoFn, { destructive: true });
```

### D2 — Scene Rename: No Completion Feedback (`editor/init.ts:2102–2108`)

```ts
case 'rename': {
  const result = await showRenameDialog(scene.name, scenes, sceneId);
  if (result.confirmed && result.value) {
    await sceneManager.renameScene(sceneId, result.value.name);
    // ❌ No feedback after success
  }
  break;
}
```

Rename is a modification action (requires 2 feedback classes). The dialog is acknowledgement, but there is no completion signal after the operation lands.

**Fix:** Add `uxFeedback.toast.success('Scene renamed.')` after `renameScene()`.

### D3 — Scene Duplicate: No Completion Feedback (`editor/init.ts:2110–2119`)

```ts
case 'duplicate': {
  const result = await showDuplicateDialog(scene.name, scenes);
  if (result.confirmed && result.value) {
    const duplicate = await sceneManager.duplicateScene(sceneId, result.value.name);
    await sceneManager.switchToScene(duplicate.id);
    // ❌ No creation feedback — switching scenes is silent
  }
  break;
}
```

Duplication is a creation action (requires 2 feedback classes). Auto-switching to the new scene provides State Change, but there is no Completion signal.

**Fix:** Add `uxFeedback.toast.success(`"${result.value.name}" created.`)` after `switchToScene()`.

### D4 — Scene Resize: No Completion Feedback (`editor/init.ts:2121–2128`)

Same pattern — `resizeScene()` completes without any toast. Resize is a modification action.

**Fix:** Add `uxFeedback.toast.success('Scene resized.')` after `resizeScene()`.

---

## What Is Compliant ✅

To be balanced — the following areas are well-implemented and should be used as reference patterns:

- **`editor/uxFeedback.ts`** — The feedback system itself is fully token-aware for colors, timing, and motion. The hardcoded `border-radius` values in its toast/undo-bar containers are the only violations.
- **`editor/scenes/sceneSelector.ts`** — Motion feedback (`pulse`, `expand`) is used correctly for selection, creation, and switching.
- **`editor/panels/assetLibraryTab.ts`** — All action buttons use `.irs-btn` base classes. Empty states use `uxFeedback.emptyState.render()`. Destructive actions include undo/danger feedback.
- **`editor/panels/animStateMachine.ts`** — Custom toolbar buttons correctly use `var(--irs-touch-target)`, `var(--irs-radius-sm)`, and semantic color tokens in CSS. Canvas-layer colors are the only violation.
- **`editor/panels/utilitiesTab.ts`**, **`berryControls.ts`**, **`topBar.ts`** — All correctly layer component classes on top of `.irs-btn`.
- **`editor/scenes/sceneDialog.ts`** — All inputs correctly use `.irs-input`.
- **`deploy/authUI.ts`** — Dialog uses `.irs-overlay`/`.irs-dialog`, buttons use `.irs-btn`, token input uses `.irs-input`.

---

## Summary Checklist (from rules document)

| Checklist Item | Status |
|----------------|--------|
| Every user action triggers minimum required feedback | ❌ Scene delete/rename/duplicate/resize missing completion signals |
| Selection and focus always clearly visible | ✅ |
| No silent success paths anywhere | ❌ Four scene operations are silent on success |
| Storage safety surfaced, not hidden | ✅ |
| Motion communicates meaning, not decoration | ✅ |
| Empty states invite action with single next step | ✅ |
| Undo/reversibility clearly indicated after risky actions | ⚠️ Scene delete has no undo bar |
| New UX matches feedback language of surrounding systems | ⚠️ Some panels (entitiesTab, animationTab) use different button patterns |
| No hardcoded hex/rgba in component CSS | ❌ Widespread — see Category A |
| All border-radius values use `--irs-radius-*` tokens | ❌ Widespread — see Category A3 |
| Buttons use `.irs-btn` | ❌ 5 custom button classes bypass the base — see Category C1 |
| Inputs use `.irs-input` | ❌ `deployPanel` uses custom input class — see Category C2 |
| Touch targets use `var(--irs-touch-target)` | ❌ 5 locations use hardcoded `44px` — see Category B |

**Total violations: 34+ distinct locations across 15+ files.**  
**The codebase does not currently satisfy `ux-polish-rules.md` and cannot be marked complete.**
