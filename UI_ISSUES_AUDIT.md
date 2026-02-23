# InRepo Studio — Full UI Issues Audit

**Date:** 2026-02-23  
**Scope:** All UI-producing `.ts` files across `src/editor/`, `src/deploy/`, `src/boot/`, `src/shared/`  
**Reference:** `context/ux-polish-rules.md` + previous `UI_COHESION_AUDIT.md`  
**Status of previous audit:** All 18 issues verified resolved ✅

---

## Summary

The previous audit covered the 12 panel files that existed at that time. Since then, **11 additional UI files** have been added or substantially modified — none of them were brought into the design system. This audit covers all new violations discovered, organized by the same severity model.

**Files NOT covered by previous audit that have issues:**

| File | Theme | Naming | Buttons | Inputs | UX Feedback | Touch |
|---|---|---|---|---|---|---|
| `panels/tilePicker.ts` | ❌ | ❌ | ❌ | — | ⚠️ | — |
| `panels/animStateMachine.ts` | ❌ | ❌ | ❌ | ❌ | ⚠️ | — |
| `panels/utilitiesTab.ts` | ❌ | ❌ | ❌ | — | ❌ | — |
| `panels/spriteSlicerTab.ts` | ❌ | ❌ | ❌ | — | ⚠️ | ❌ |
| `presets/presetsTab.ts` | ❌ | ❌ | — | — | ⚠️ | — |
| `presets/categoryDetail.ts` | ❌ | ❌ | — | — | ⚠️ | — |
| `presets/knobEditor.ts` | ❌ | ❌ | — | — | — | — |
| `presets/blocklyHooksTab.ts` | ❌ | ❌ | — | — | — | — |
| `scenes/sceneSelector.ts` | ❌ | ❌ | ❌ | — | ❌ | — |
| `deploy/conflictResolver.ts` | ❌ | ❌ | — | — | ❌ | — |
| `editor/init.ts` (inline CSS) | ❌ | — | — | — | — | — |

**Files previously migrated that have remaining sub-issues:**

| File | border-radius tokens | irs-input | Touch |
|---|---|---|---|
| `blockly/inspectPanel.ts` | ❌ | — | — |
| `blockly/blocklyTopBar.ts` | ❌ | — | — |
| `blockly/blocklyCockpit.ts` | ❌ | — | — |
| `panels/berryControls.ts` | ❌ | — | ❌ |
| `panels/berryShell.ts` | — | — | ❌ |
| `panels/assetLibraryTab.ts` | ❌ | ❌ | — |
| `panels/animationTab.ts` | — | ❌ | — |
| `blockly/blocksPaletteStyles.ts` | ❌ | — | — |

---

## TIER 1 — Critical: New Files Completely Outside the Design System

### Issue #19 — `tilePicker.ts` Uses Raw Values and Wrong Namespace

**Severity: Critical**  
**File:** `src/editor/panels/tilePicker.ts`

All colors in the STYLES block are raw hex/rgba values. The component uses `tile-picker__*` as its CSS namespace.

| Line | Raw Value | Correct Token |
|---|---|---|
| 81 | `color: #666` | `var(--irs-text-muted)` |
| 107 | `background: #2a2a4e` | `var(--irs-surface-panel)` |
| 108 | `color: #ccc` | `var(--irs-text-secondary)` |
| 118 | `background: #3a3a6e` | `var(--irs-border-heavy)` |
| 122 | `border-color: #4a9eff` | `var(--irs-accent-primary)` |
| 123 | `background: #3a3a6e` | `var(--irs-border-heavy)` |
| 124 | `color: #fff` | `var(--irs-text-primary)` |
| 144 | `background: #1a1a3a` | `var(--irs-surface-modal)` |
| 154 | `background: #2a2a5e` | `var(--irs-surface-panel)` |
| 158 | `border-color: #4a9eff` | `var(--irs-accent-primary)` |
| 172 | `background: #333` | `var(--irs-surface-base)` |

**border-radius violations:** `6px`, `4px`, `2px` → `var(--irs-radius-sm)`, `var(--irs-radius-sm)`, `2px` (2px has no token — define `--irs-radius-xs: 2px` or leave as literal per policy).

**Naming fix:** Rename `tile-picker` → `irs-tile-picker` throughout.

---

### Issue #20 — `animStateMachine.ts` Uses Raw Values, Wrong Namespace, Non-`irs-btn` Buttons, and Non-`irs-input` Inputs

**Severity: Critical**  
**File:** `src/editor/panels/animStateMachine.ts`

37 raw color violations and the largest naming and component system violations of any single file.

**Theme violations (partial — full list follows the pattern of previous issues):**

| Line | Raw Value | Correct Token |
|---|---|---|
| 31 | `border-radius: 8px` | `var(--irs-radius-sm)` |
| 109, 246, 261 | `border-radius: 8px` | `var(--irs-radius-sm)` |
| 148 | `border-radius: 10px` | `var(--irs-radius-md)` |
| 209 | `border-radius: 8px` | `var(--irs-radius-sm)` |
| 222 | `border-radius: 20px` | `var(--irs-radius-lg)` or `999px` for pill shape — define `--irs-radius-pill: 999px` |

**Color violations follow the same `#1b2a52`/`#dbe4ff`/`#4a9eff` pattern** → map to `var(--irs-surface-panel)`, `var(--irs-text-primary)`, `var(--irs-accent-primary)`.

**Button violations:**
```ts
// ❌ Wrong — custom class, no irs-btn base
stopBtn.className = 'asm-editor__sim-reset-btn';
resetBtn.className = 'asm-editor__sim-reset-btn';
btn.className = 'asm-editor__sim-event-btn';
```
Fix: Add `irs-btn irs-btn--secondary` as base classes; keep `asm-editor__*` only as modifiers for size/positioning overrides.

**Input violation:**
```ts
// ❌ Wrong — custom class, no irs-input base
input.className = 'asm-editor__field-input';
```
Fix: `input.className = 'irs-input asm-editor__field-input'`

**Naming fix:** Rename `asm-editor` → `irs-anim-state-machine` throughout. The abbreviation `asm` is opaque and violates Appendix B rule 5 ("No abbreviated block names").

---

### Issue #21 — `utilitiesTab.ts` Has No UX Feedback and Uses `window.confirm`

**Severity: Critical**  
**File:** `src/editor/panels/utilitiesTab.ts`

This file has **zero `uxFeedback` imports or calls**. Every one of its action buttons either modifies status text silently or uses `window.confirm()`.

**UX Feedback violations:**

The polish rules state: *"Every user-initiated action must trigger at least one form of feedback."* And: *"No modal save confirmations for normal workflows."*

1. **`btnCheck` (Check Storage):** Sets `dataStatus.textContent`. Not a violation by itself, but the status element has no visual emphasis state. The user looks at the button, not a status div beneath it. The feedback is in the wrong place.

2. **`btnExport` (Export JSON):** Status text only. Should use `uxFeedback.motion.pulse(btnExport)` on click and `uxFeedback.toast.success('Export complete.')` on success.

3. **`btnCopy` (Copy JSON):** Status text only. Should use `uxFeedback.toast.success('Copied to clipboard.')`.

4. **`btnImport` (Import JSON):** Status text only. This is a **Creation** action — requires 2 feedback classes. Should get motion + toast.

5. **`btnResetEnvironment` (Reset Environment):** Uses `window.confirm()` — a browser-blocking native modal. This violates *"No modal save confirmations."* The rule carves out destructive actions needing confirmation, but `window.confirm` is explicitly not the system way to do it. The correct pattern is `irs-dialog` or `uxFeedback.confirm()` (if it exists) — a non-blocking, in-page confirmation inline dialog. Additionally, the reset action has **no success feedback** — it just sets status text and calls `window.location.reload()`.

**Theme violations:**
All raw colors — same pattern as other unmigrated files. `utilities-tab__button` is a fully custom button that duplicates `.irs-btn` structure.

**Naming fix:** `utilities-tab` → `irs-utilities-tab`; replace `utilities-tab__button` with `irs-btn irs-btn--secondary`.

---

### Issue #22 — `spriteSlicerTab.ts` Uses Raw Values, Wrong Namespace, and Has Touch Target Violation

**Severity: Critical**  
**File:** `src/editor/panels/spriteSlicerTab.ts`

31 raw color violations following the standard `#1b2a52`/`#dbe4ff` pattern. Also:

- **Touch target violation (line 241):** `min-height: 30px` on an interactive element. Change to `min-height: var(--irs-touch-target)`.
- **Custom button:** `sprite-slicer__button` is not `irs-btn`-based.
- **Naming fix:** `sprite-slicer` → `irs-sprite-slicer`

---

### Issue #23 — `presets/presetsTab.ts`, `presets/categoryDetail.ts`, `presets/knobEditor.ts`, `presets/blocklyHooksTab.ts` Are Fully Unthemed

**Severity: Critical**  
**Files:** `src/editor/presets/presetsTab.ts`, `categoryDetail.ts`, `knobEditor.ts`, `blocklyHooksTab.ts`

All four presets-subsystem files were built as a standalone island. None use `var(--irs-*)` tokens for colors or `var(--irs-radius-*)` for border-radius. They use a slightly different shade of blue (`rgba(88, 116, 173, ...)` as a border color) that does not exist in the design system.

**Pattern per file:**

- `presetsTab.ts` (28 violations): `presets-tab` namespace → `irs-presets-tab`
- `categoryDetail.ts` (17 violations): `preset-category-detail` namespace → `irs-preset-category`
- `knobEditor.ts` (7 violations): `knob-editor` namespace → `irs-knob-editor`; `knob-editor__range` input → `irs-input irs-knob-editor__range`
- `blocklyHooksTab.ts` (9 violations): `preset-hooks` namespace → `irs-preset-hooks`

**New token needed in all four:** The border color `rgba(88, 116, 173, 0.6–0.7)` is used consistently as a container border in the presets subsystem but does not map to any current token. It falls between `--irs-border-light` and `--irs-border-heavy` in visual weight. Add to `theme.css`:

```css
--irs-border-medium: rgba(88, 116, 173, 0.65);  /* panel container borders */
```

---

### Issue #24 — `scenes/sceneSelector.ts` Has No UX Feedback and Wrong Namespace

**Severity: Critical**  
**File:** `src/editor/scenes/sceneSelector.ts`

`sceneSelector.ts` has **no `uxFeedback` import** and no feedback calls anywhere. This is a high-interaction component — it handles scene selection, scene creation, and scene renaming — but all actions are **silent**.

**UX Feedback violations:**

1. **Scene selection (line 334):** Clicking a scene in the dropdown switches the active scene. This is a **State Change** — requires at least feedback class 2. Currently there is no pulse, no selection visual emphasis via `uxFeedback.selection.mark()`.

2. **Scene creation (line 370):** Creating a new scene is a **Creation** action — requires 2 feedback classes. No feedback exists.

3. **Scene rename/delete (line 398–404):** Destructive action (delete) requires 3 feedback classes including undo. There is no `uxFeedback.undo.show()` call.

**Empty state violation:** When a project has no scenes yet, the selector has no empty state / "Create your first scene" invitation. The polish rules require empty states to explain what is missing and suggest exactly one next action.

**Theme violations:** All raw values. `scene-selector__*` namespace → `irs-scene-selector__*`.

---

### Issue #25 — `deploy/conflictResolver.ts` Has No UX Feedback and Wrong Namespace

**Severity: Critical**  
**File:** `src/deploy/conflictResolver.ts`

`conflictResolver.ts` presents a modal dialog for resolving Git conflicts during deploy. It has **no `uxFeedback` import** and zero feedback calls, despite handling one of the most consequential decisions in the entire app.

**UX Feedback violations:**

1. **Conflict resolution choice (selecting "Keep Mine" or "Keep Theirs"):** This is a **State Change** with **Destructive** implications — it permanently discards one version. The polish rules require 3 feedback classes for destructive actions, including undo availability. Currently: silent click, no acknowledgement, no undo.

2. **Confirm resolution:** No completion feedback. The user cannot feel that the resolution "landed."

**Class naming:** `conflict-modal-overlay` → `irs-conflict-resolver`; `conflict-card` → `irs-conflict-resolver__card`.

**Theme violations:** 14 raw values following the standard dark navy pattern.

---

### Issue #26 — `init.ts` Inline CSS Blocks Are Fully Unthemed

**Severity: Major**  
**File:** `src/editor/init.ts`

`init.ts` directly injects three inline CSS blocks (via `<style>` elements or `element.style`) that are completely raw. These are UI components that were never extracted into proper component files:

**Block 1 — Settings placeholder panel (lines ~648–700):**
```css
background: rgba(20, 24, 48, 0.95);
color: #ffddaa;          /* off-system warm yellow */
border-radius: 10px;
border: 1px solid rgba(255, 185, 80, 0.4);
box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35);
```
This is a temporary "settings not implemented" panel. The `#ffddaa` / `rgba(255, 185, 80, ...)` color family is Tailwind amber — not an InRepo Studio token. Should use `var(--irs-color-yellow)` and `var(--irs-color-yellow-alpha-20)`.

**Block 2 — Scene popover (line ~1283–1290):** Same raw navy + `#e6ecff` text pattern.

**Block 3 — Canvas cursor colors (lines 179–180, 223):**
```ts
fill: 'rgba(255, 80, 80, 0.25)',
border: 'rgba(255, 120, 120, 0.9)',
// and
canvasController?.setBrushCursorColor('rgba(255, 255, 255, 0.9)');
```
Canvas 2D API cannot use CSS variables, so these need named JS constants (per the `blocklyCockpit.ts` precedent from the original audit):
```ts
const CURSOR_ERASE_FILL = 'rgba(255, 80, 80, 0.25)';    // --irs-color-red at low alpha
const CURSOR_ERASE_BORDER = 'rgba(255, 120, 120, 0.9)';  // --irs-color-red
const CURSOR_DEFAULT_BORDER = 'rgba(255, 255, 255, 0.9)'; // --irs-text-primary
```

**Required fix:** Extract the settings placeholder into `src/editor/panels/settingsPanel.ts` using the component pattern. Extract the scene popover into `src/editor/scenes/scenePopover.ts`. Both should use tokens. The canvas cursor constants belong at the top of `init.ts` as named JS constants.

---

## TIER 2 — Major: Systematic `border-radius` Token Violations in Previously-Migrated Files

### Issue #27 — `border-radius` Literal Values in All Migrated Files

**Severity: Major**  
**Files:** `blocklyTopBar.ts`, `blocklyCockpit.ts`, `inspectPanel.ts`, `berryControls.ts`, `assetLibraryTab.ts`, `blocksPaletteStyles.ts`

The original audit focused on color token migration but did not address `border-radius`. The polish rules are explicit:

> "NEVER use hardcoded hex codes, `rgb()`, `rgba()`, or **static pixel values for `border-radius`** in component-specific files."

The token mapping is already defined in `theme.css`:

```css
--irs-radius-sm: 8px;
--irs-radius-md: 10px;
--irs-radius-lg: 12px;
```

**Violations by file:**

| File | Lines with raw border-radius |
|---|---|
| `blocklyTopBar.ts` | 83 (`10px`), 107 (`10px`), 144 (`12px`), 258 (`10px`) |
| `blocklyCockpit.ts` | 153 (`10px`) |
| `inspectPanel.ts` | 143 (`8px`), 154 (`10px`), 193 (`8px`) |
| `berryControls.ts` | 23 (`12px`), 90 (`8px`) |
| `assetLibraryTab.ts` | 24 (`14px`), 45 (`10px`), 83 (`10px`), 136 (`12px`), 158 (`8px`), 184 (`999px`) |
| `blocksPaletteStyles.ts` | 37 (`2px`), 75 (`6px`), 131 (`6px`), 209 (`4px`) |

**Required fix:** Replace all with `var(--irs-radius-sm/md/lg)`. For values not in the system (2px, 6px, 999px):
- `2px` → define `--irs-radius-xs: 2px` or use `2px` as an allowed exception for decorative micro-elements (color dot indicators, scrollbar thumbs)
- `6px` → rounds down to `var(--irs-radius-sm)` or define `--irs-radius-xs` at 6px
- `14px` → rounds up to `var(--irs-radius-lg)` or define `--irs-radius-xl: 14px`
- `999px` → define `--irs-radius-pill: 999px`

The `assetLibraryTab.ts` `14px` value is used as a large panel radius. Adding `--irs-radius-xl` is appropriate here as panels use it consistently.

---

## TIER 3 — Major: Non-`irs-input` Text Inputs in Migrated Files

### Issue #28 — `animationTab.ts` and `assetLibraryTab.ts` Text Inputs Bypass `irs-input` ✅ COMPLETED

**Severity: Major**  
**Files:** `src/editor/panels/animationTab.ts`, `src/editor/panels/assetLibraryTab.ts`

`irs-input` exists in `common-styles.css` and handles border, focus ring, iOS anti-zoom font sizing, and dark surface background. Components that bypass it get inconsistent appearance, miss the iOS zoom prevention (16px min font-size), and will not inherit future input system improvements.

**`animationTab.ts`** (11 inputs):
All inputs use `animation-tab__input` as sole class. Required fix: `input.className = 'irs-input animation-tab__input'`.

Special case — `animation-tab__scrubber` (line 976): This is a `type="range"` slider, not a text input. The `irs-input` class may not be appropriate. Define a separate `irs-range` utility class in `common-styles.css` for range inputs.

**`assetLibraryTab.ts`** (multiple rename/search inputs at lines 710, 1351, 1468, 1755, 1830, 2231):
All are `createElement('input')` with no class, or just a local component class. Each should add `irs-input` as base class.

---

## TIER 4 — Major: Touch Target Violations

### Issue #29 — Berry Shell Handle Tab Is Only 20px Wide ✅ COMPLETED

**Severity: Major**  
**File:** `src/editor/panels/berryShell.ts` (lines 259–286)

`.irs-berry__handle-tab` is the primary interactive element to open/close the berry panel on mobile. It is styled as `width: 20px; height: 56px`. The height is fine, but **20px wide is less than half the required 44px minimum tap target.**

On mobile, users will frequently miss this element, especially with one thumb. The handle tab is the most-touched element in the entire editor on mobile.

**Required fix:**
```css
.irs-berry__handle-tab {
  width: var(--irs-touch-target);  /* 44px */
  height: 56px;
  /* visual pill can remain narrower using an inner element */
}
```
If the visual appearance of a narrow handle is desired, create an inner `::before` or child element that renders the visual 20px pill while the touch area remains 44px.

---

### Issue #30 — `berryControls.ts` Icon Button Min-Width Is 40px ✅ COMPLETED

**Severity: Moderate**  
**File:** `src/editor/panels/berryControls.ts` (line 57)

```css
/* Current */
min-width: 40px;

/* Required */
min-width: var(--irs-touch-target);  /* 44px */
```

4px difference but a consistent policy violation.

---

## TIER 5 — Moderate: UX Feedback Gaps in Existing Components

### Issue #31 — `animStateMachine.ts` Delete Actions Are Missing Undo

**Severity: Moderate**  
**File:** `src/editor/panels/animStateMachine.ts`

The file has partial UX feedback (`uxFeedback.undo.show` for state/transition removal, `uxFeedback.motion.pulse` on add), but the simulation control buttons (`stopBtn`, `resetBtn`, `sim-event-btn` list) have **no acknowledgement feedback**. Each should receive `uxFeedback.motion.pulse(btn)` on click per the action → reaction rule.

Additionally, the **save action** at line 2046 (`uxFeedback.combos.saved(...)`) is correct, but the **pre-save dirty state** is not surfaced. The component should call `uxFeedback.storage.markDirty(saveButton)` whenever the state machine is modified.

---

### Issue #32 — `presetsTab.ts` Profile Apply Has No Acknowledgement Motion

**Severity: Moderate**  
**File:** `src/editor/presets/presetsTab.ts`

`uxFeedback.undo.show` is called correctly after applying a profile (line 304), but there is no `uxFeedback.motion.pulse()` on the chip/button that was clicked. The undo bar appearing in another area of the screen is insufficient as the only feedback for a click — the action → reaction rule requires the reaction to occur "where the user is already looking."

**Required fix:** Add `uxFeedback.motion.pulse(button)` inside the click handler, immediately before or after the undo call.

---

### Issue #33 — `sceneSelector.ts` Scene Creation Has No Expand Motion

**Severity: Moderate**  
**File:** `src/editor/scenes/sceneSelector.ts`

Per the motion grammar, **Expand = Creation**. When a new scene is created, the new item appearing in the list should receive `uxFeedback.motion.expand()` (or equivalent). Currently the list just re-renders with no animation.

---

## TIER 6 — Low: Pattern Consistency

### Issue #34 — `berryControls.ts` Still Uses `ensureStyles()` Inline Pattern

**Severity: Low**  
**File:** `src/editor/panels/berryControls.ts`

The original audit (Issue #17) established `ensureStyles()` as the canonical named function pattern. `berryControls.ts` was listed as a target for migration in Issue #17 but appears to still use the inline guard:

```ts
if (!document.getElementById('irs-brush-control-styles')) {
  // ...
}
```

Convert to the named `ensureStyles()` function pattern.

---

### Issue #35 — `deployPanel.ts` Has a Secondary Button Class Not Using `irs-btn` ✅ COMPLETED

**Severity: Low**  
**File:** `src/editor/panels/deployPanel.ts`

Lines 195, 215, 229 use:
```html
<button class="irs-deploy-panel__secondary-btn" type="button">...</button>
```

This class is presumably styled in the STYLES block but is not based on `.irs-btn`. Fix:
```html
<button class="irs-btn irs-btn--secondary irs-deploy-panel__secondary-btn" type="button">...</button>
```
Remove any structural/color CSS from `.irs-deploy-panel__secondary-btn` in the STYLES block — keep only layout overrides.

---

## New Tokens Required ✅ COMPLETED

The following tokens need to be added to `theme.css` to support a complete migration of all new files:

```css
/* border-radius extensions */
--irs-radius-xs:   2px;    /* used: scrollbar thumbs, color dot indicators */
--irs-radius-xl:   14px;   /* used: large panel containers in assetLibrary, utilities, presets */
--irs-radius-pill: 999px;  /* used: status chips/badges */

/* Border weight between light and heavy */
--irs-border-medium: rgba(88, 116, 173, 0.65);  /* used: presets subsystem panel borders */

/* Shadows */
--irs-shadow-panel: 0 6px 18px rgba(0, 0, 0, 0.35);  /* used: settings panel, scene popover */
--irs-shadow-modal: 0 8px 32px rgba(0, 0, 0, 0.60);  /* used: blocklyTopBar overlay */
```

---

## Implementation Order

Issues are ordered by blast radius (how many components unblock downstream):

1. **Add new tokens to `theme.css`** — unblocks all other fixes  
2. **Issue #27** — `border-radius` sweep across all migrated files (pure find-replace)  
3. **Issues #19–#26** — New files full token + naming migration (one file at a time)  
4. **Issues #28** — `irs-input` sweep across `animationTab` and `assetLibraryTab`  
5. **Issues #29–#30** — Touch target fixes (isolated CSS changes)  
6. **Issues #21, #24, #25** — UX feedback plumbing (`uxFeedback` import + calls)  
7. **Issue #26** — Extract `settingsPanel.ts` and `scenePopover.ts` from `init.ts`  
8. **Issues #31–#33** — Feedback motion polish in existing components  
9. **Issues #34–#35** — Pattern cleanup (low risk, can be batched)  

---

## Agent Pre-Commit Checklist Addendum

The existing checklist in `ux-polish-rules.md` should have two items added:

- [ ] Are `border-radius` values using `var(--irs-radius-*)` — not literal px values?
- [ ] Are `<input type="text/number">` elements using `.irs-input` as a base class?
