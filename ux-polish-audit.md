# InRepo Studio — UX Polish Rules Audit
**Date:** 2026-02-24 (refreshed)  
**Rules reference:** `context/ux-polish-rules.md`  
**Result: ⚠️ CORE CHECKLIST COMPLETE — remaining follow-up is canvas/fallback color mirroring**

---

## Audit refresh status (2026-02-24)

### Completed in this pass ✅

- [x] Implemented completion toasts for scene actions in `src/editor/init.ts` (`rename`, `duplicate`, `resize`, `delete`).
- [x] Migrated button primitives in entities, animation, and bottom panel UIs to layer on `.irs-btn` (Category C1).
- [x] Migrated touch-target sizing in panel controls from `44px` literals to `var(--irs-touch-target)` (Category B).
- [x] Completed border-radius token migration for all non-circular UI declarations in boot/editor/runtime UI styles (Category A3).

### Remaining implementation work / follow-up ⚠️

- [x] Replace hardcoded color values in inline/component CSS with `--irs-*` tokens (Category A).
- [x] Replace hardcoded `border-radius` pixel values with `--irs-radius-*` tokens (Category A3).
- [x] Replace hardcoded `44px` touch-target values with `var(--irs-touch-target)` (Category B).
- [x] Migrate non-compliant buttons to `.irs-btn` base classes (Category C1).
- [x] Migrate deploy panel input to include `.irs-input` and remove duplicated custom input skinning (Category C2).
- [x] Add completion/safety UX feedback to scene operations (`rename`, `duplicate`, `resize`, `delete`) (Category D1–D4).

### Progress tracker by category

| Category | Scope | Status | Notes |
|---|---|---|---|
| A1/A2 | Hardcoded hex/rgb/rgba values | ✅ Done (CSS strings) | Boot/runtime/editor/blockly CSS strings now tokenized; remaining hardcoded colors are canvas-layer constants/fallback values. |
| A3 | Hardcoded border-radius values | ✅ Done | All non-circular radius declarations now use `--irs-radius-*`; remaining `50%` values are intentional circle cases. |
| B | Touch-target sizing tokens | ✅ Done | Panel controls now use `var(--irs-touch-target)` for interactive min-height sizing. |
| C1 | Button base class compliance (`.irs-btn`) | ✅ Done | Entities, animation, and bottom-panel action buttons now layer on `.irs-btn`. |
| C2 | Input base class compliance (`.irs-input`) | ✅ Done | Deploy panel owner/repo inputs now layer on `.irs-input`. |
| D1–D4 | Scene action completion feedback | ✅ Done | Scene operations now emit completion toasts after successful actions. |

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
| `boot/main.ts` | ✅ migrated | error overlay now uses `--irs-accent-danger`, `--irs-text-muted`, and `--irs-border-heavy` tokens |
| `editor/init.ts` | ✅ migrated | notice banners and editor container/canvas backgrounds now use semantic `--irs-*` tokens |
| `editor/blockly/blocklyWorkspace.ts` | ✅ migrated | grid color now resolves from `--irs-surface-base` via `getComputedStyle` |
| `runtime/playtestOverlay.ts` | ✅ migrated | overlay text/surfaces/borders now use theme tokens |
| `runtime/init.ts` | ✅ migrated | runtime error UI + Phaser background now use theme tokens/resolved CSS var |

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
| `editor/init.ts` | ✅ migrated | notice/system panel inline styles now use semantic theme tokens |
| `runtime/playtestOverlay.ts` | ✅ migrated | overlay stylesheet now uses semantic theme tokens |
| `runtime/init.ts` | ✅ migrated | runtime error text + Phaser background color now tokenized/resolved from theme |

**Canvas 2D rendering files** (technically can't use CSS vars directly, but flagged for awareness):
`editor/canvas/brushCursor.ts:16`, `editor/canvas/renderer.ts:46–57`, `editor/canvas/entityRenderer.ts:27`, `editor/panels/assetLibraryTab.ts:2084,2127`, `editor/panels/animStateMachine.ts:295,309,310,919`, `editor/panels/spriteSlicerTab.ts:998–1083`.

These canvas files should define constants that *mirror* the theme tokens (read via `getComputedStyle` on boot and cached) rather than hard-coding their own colour palette.

---

### A3 — Hardcoded `border-radius` Pixel Values

The theme provides: `--irs-radius-xs:2px`, `--irs-radius-sm:8px`, `--irs-radius-md:10px`, `--irs-radius-lg:12px`, `--irs-radius-xl:14px`, `--irs-radius-pill:999px`. Every hardcoded pixel value below maps directly to one of these tokens.

| File | Hardcoded values | Correct replacement |
|------|-----------------|---------------------|
| `editor/uxFeedback.ts` | ✅ migrated | uses `--irs-radius-*` tokens |
| `editor/init.ts` | ✅ migrated | uses `--irs-radius-*` tokens |
| `editor/panels/animationTab.ts` | ✅ migrated (remaining `50%` circle badges) | tokenized to `--irs-radius-*`; `50%` preserved for circular indicators |
| `editor/panels/entitiesTab.ts` | ✅ migrated | uses `--irs-radius-*` tokens |
| `editor/panels/berryShell.ts` | ✅ migrated | uses `--irs-radius-*` tokens, including tokenized mixed-corner values |
| `editor/panels/bottomPanel.ts` | ✅ migrated | uses `--irs-radius-*` tokens |
| `editor/panels/assetPalette.ts` | ✅ migrated | uses `--irs-radius-*` tokens |
| `editor/panels/layerPanel.ts` | ✅ migrated (remaining `50%` circle indicator) | uses `--irs-radius-*` tokens |
| `editor/panels/deployPanel.ts` | ✅ migrated | uses `--irs-radius-*` tokens |
| `editor/panels/berryControls.ts` | *(none flagged — uses vars correctly)* | ✅ |
| `editor/panels/topPanel.ts` | ✅ migrated | uses `--irs-radius-sm` token |
| `editor/panels/spriteSlicerTab.ts` | ✅ migrated | uses `--irs-radius-*` tokens |
| `editor/panels/bottomContextStrip.ts` | ✅ migrated | uses `--irs-radius-sm` token |
| `editor/panels/tilePicker.ts` | ✅ migrated | uses `--irs-radius-xs` token |
| `editor/scenes/sceneSelector.ts` | `50%` | No token — acceptable for circular badges, but document the exception |
| `editor/blockly/blocklyTopBar.ts` | `50%` | Same — acceptable for circle, document it |
| `editor/blockly/blocksPaletteStyles.ts` | `50%` | Same |
| `runtime/playtestOverlay.ts` | ✅ migrated (remaining `50%` circle controls) | uses `--irs-radius-*` tokens for non-circular controls |
| `boot/main.ts` | ✅ migrated | uses `--irs-radius-sm` token |

> **Note on `50%`:** No radius token exists for this. It is an acceptable exception for perfectly circular elements (badges, dot indicators) — but add a comment to each usage so it's explicit, and consider adding `--irs-radius-circle: 50%` to the token file.

> **Note on `6px`:** Falls between `--irs-radius-xs` (2px) and `--irs-radius-sm` (8px). Prefer rounding to `--irs-radius-sm`, or add `--irs-radius-xs2: 6px` to the theme if the design intent is distinct.

---

## Category B — Touch Target Violations

> **Status:** ✅ Resolved in this pass.

Updated panel controls now use `min-height: var(--irs-touch-target)` instead of hardcoded `44px` values in:
- `src/editor/panels/animationTab.ts`
- `src/editor/panels/spriteSlicerTab.ts`
- `src/editor/panels/entitiesTab.ts`
- `src/editor/panels/bottomPanel.ts`

`44px` remains in a few non-interactive sizing rules (e.g. image thumbnails), which is acceptable.

---

## Category C — Button & Input Class Violations

> **Status:** ✅ Resolved in this pass.

- Category C1: entities, animation, and bottom-panel buttons now layer on `.irs-btn`.
- Category C2: deploy panel owner/repo inputs now layer on `.irs-input`.

---

## Category D — UX Feedback Contract Violations

> **Status:** ✅ Resolved in this pass.

Scene actions in `src/editor/init.ts` now emit completion feedback toasts for:
- rename
- duplicate
- resize
- delete

This removes the previously silent success paths and satisfies the feedback contract requirements for these operations.

---

## What Is Compliant ✅

To be balanced — the following areas are well-implemented and should be used as reference patterns:

- **`editor/uxFeedback.ts`** — Feedback system remains the reference for token-aware colors, timing, and motion; border-radius declarations are now tokenized.
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
| Every user action triggers minimum required feedback | ✅ |
| Selection and focus always clearly visible | ✅ |
| No silent success paths anywhere | ✅ |
| Storage safety surfaced, not hidden | ✅ |
| Motion communicates meaning, not decoration | ✅ |
| Empty states invite action with single next step | ✅ |
| Undo/reversibility clearly indicated after risky actions | ⚠️ Scene delete has no undo bar |
| New UX matches feedback language of surrounding systems | ⚠️ Some panels (entitiesTab, animationTab) use different button patterns |
| No hardcoded hex/rgba in component CSS | ✅ (excluding canvas/fallback constants) |
| All border-radius values use `--irs-radius-*` tokens | ✅ Non-circular declarations migrated; `50%` retained only for circular indicators/controls |
| Buttons use `.irs-btn` | ✅ |
| Inputs use `.irs-input` | ✅ |
| Touch targets use `var(--irs-touch-target)` | ✅ |

**Remaining follow-up:** canvas-only/fallback color constants should be mirrored from theme at boot where practical.
