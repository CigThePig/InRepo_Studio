# InRepo Studio — UI Cohesion Audit

**Date:** 2026-02-23  
**Scope:** All UI-producing `.ts` files in `src/`, `src/shared/theme.css`, `src/shared/common-styles.css`  
**Goal:** Identify every divergence from a consistent, modular design system so all issues can be resolved in a single systematic pass.

---

## Table of Contents

1. [Issue #1 — Two Competing `:root` Token Systems](#issue-1)
2. [Issue #2 — `--irs-text` vs `--irs-text-primary` Name Split](#issue-2)
3. [Issue #3 — Undeclared Variables Used in `berryShell.ts`](#issue-3)
4. [Issue #4 — `berryControls.ts` Uses Zero Theme Tokens](#issue-4)
5. [Issue #5 — `deployPanel.ts` Uses Zero Theme Tokens](#issue-5)
6. [Issue #6 — `assetPalette.ts` Has Its Own Custom Palette](#issue-6)
7. [Issue #7 — `bottomContextStrip.ts` Bypasses the Token System](#issue-7)
8. [Issue #8 — `blocklyTopBar.ts` Uses Raw Values and Off-System Colors](#issue-8)
9. [Issue #9 — `blocklyCockpit.ts` Uses Raw Values](#issue-9)
10. [Issue #10 — `layerPanel.ts` Uses Raw Values](#issue-10)
11. [Issue #11 — `inspectPanel.ts` Uses Raw Values](#issue-11)
12. [Issue #12 — `animationTab.ts` and `entitiesTab.ts` Use Raw Values](#issue-12)
13. [Issue #13 — `authUI.ts` / `deployUI.ts` Use Raw Values](#issue-13)
14. [Issue #14 — Duplicate Button Systems](#issue-14)
15. [Issue #15 — CSS Class Naming Convention Inconsistency](#issue-15)
16. [Issue #16 — Touch Target Height Inconsistency (40px vs 44px)](#issue-16)
17. [Issue #17 — `ensureStyles()` Pattern Is Not Consistently Used](#issue-17)
18. [Issue #18 — Danger Red Is Two Different Colors](#issue-18)
19. [Appendix A — Full Token Inventory (What Should Be in theme.css)](#appendix-a)
20. [Appendix B — Canonical CSS Naming Convention](#appendix-b)

---

## Issue #1 — Two Competing `:root` Token Systems {#issue-1}

**Severity: Critical**  
**Files:** `src/shared/theme.css`, `src/editor/uxFeedback.ts`

### What Is Happening

There are two completely separate systems both writing `:root` CSS variables. `theme.css` is a static file loaded at build time. `uxFeedback.ts` dynamically injects a `<style>` tag at runtime (inside `ensureStyles()`). They overlap on variable names, with different values.

**Conflict 1 — `--irs-surface-dark-alpha`:**

| Source | Value |
|---|---|
| `theme.css` line 7 | `rgba(13, 18, 32, 0.85)` — near-black, cool dark |
| `uxFeedback.ts` line 92 | `rgba(26, 43, 82, 0.85)` — mid-blue, much warmer |

Whichever file loads last wins. Since `uxFeedback.ts` injects at runtime, it always overrides `theme.css` — meaning the value in `theme.css` is never actually used. Any developer reading `theme.css` will have an incorrect understanding of what color is rendered.

**Conflict 2 — `--irs-text-muted`:**

| Source | Value |
|---|---|
| `theme.css` line 24 | `rgba(255, 255, 255, 0.5)` — pure white at 50% alpha |
| `uxFeedback.ts` line 94 | `#aab0d4` — a specific blue-grey |

These are visually different colors. Components that render before `uxFeedback` initializes will show the wrong muted text color.

**Root Cause**

The `uxFeedback.ts` token injection was added at some point to support the feedback/animation system, but it was built as a standalone block and unintentionally duplicated variables that already existed in `theme.css`. The two files have never been reconciled.

### Required Fix

**Step 1:** Move every variable from the `uxFeedback.ts` `:root` block into `theme.css`. They belong there permanently as static declarations.

Add to `theme.css`:

```css
/* --- Extended Color Palette (moved from uxFeedback.ts) --- */
--irs-color-blue: #4a9eff;
--irs-color-blue-alpha-4:  rgba(74, 158, 255, 0.04);
--irs-color-blue-alpha-8:  rgba(74, 158, 255, 0.08);
--irs-color-blue-alpha-12: rgba(74, 158, 255, 0.12);
--irs-color-blue-alpha-16: rgba(74, 158, 255, 0.16);
--irs-color-blue-alpha-22: rgba(74, 158, 255, 0.22);
--irs-color-blue-alpha-35: rgba(74, 158, 255, 0.35);
--irs-color-blue-alpha-45: rgba(107, 165, 255, 0.45);
--irs-color-blue-border:   rgba(107, 165, 255, 0.45);

--irs-color-green:          #6bff95;
--irs-color-green-alpha-15: rgba(107, 255, 149, 0.15);
--irs-color-green-alpha-53: rgba(107, 255, 149, 0.53);
--irs-color-green-glow:     rgba(107, 255, 149, 0.27);

--irs-color-red:          #ff6b6b;
--irs-color-red-alpha-15: rgba(255, 107, 107, 0.15);
--irs-color-red-alpha-53: rgba(255, 107, 107, 0.53);

--irs-color-yellow:          #ffc258;
--irs-color-yellow-alpha-20: rgba(255, 194, 88, 0.20);
--irs-color-yellow-border:   rgba(255, 194, 88, 0.65);

/* --- Animation Durations --- */
--irs-duration-ack:      120ms;
--irs-duration-change:   220ms;
--irs-duration-safe:     350ms;
--irs-duration-toast:    4000ms;
--irs-duration-undo-bar: 5000ms;
```

**Step 2:** Resolve the two conflicting values. Pick one canonical value for each:

- `--irs-surface-dark-alpha`: Use `rgba(26, 43, 82, 0.85)` — this is the runtime value that every component actually sees. Delete the `rgba(13, 18, 32, 0.85)` entry from `theme.css`.
- `--irs-text-muted`: Use `#aab0d4` — the specific blue-grey is more intentional than the generic white-alpha. Update `theme.css` to `#aab0d4`.

**Step 3:** Strip the entire `:root { ... }` block from `uxFeedback.ts`'s `ensureStyles()` function. The function should only inject keyframe animations and component-specific styles that cannot live in static CSS (i.e., anything using `${TOKEN.*}` for dynamic values should be replaced with `var(--irs-*)` references).

**Step 4:** Delete the `TOKEN` constant in `uxFeedback.ts`. All values now live in `theme.css` as CSS variables. Any places in `uxFeedback.ts` that were reading `TOKEN.*` to build inline styles should switch to `var(--irs-*)`.

---

## Issue #2 — `--irs-text` vs `--irs-text-primary` Name Split {#issue-2}

**Severity: Critical**  
**Files:** `src/editor/uxFeedback.ts`, `src/editor/panels/bottomPanel.ts`, `src/editor/blockly/inspectPanel.ts`, `src/editor/blockly/blocksPaletteStyles.ts`, `src/editor/panels/assetLibraryTab.ts`

### What Is Happening

There are two different CSS variable names being used across the codebase to mean "primary text color":

| Variable | Declared in | Used in |
|---|---|---|
| `--irs-text` | `uxFeedback.ts` (runtime injected) | `bottomPanel.ts`, `inspectPanel.ts`, `uxFeedback.ts` |
| `--irs-text-primary` | `theme.css` | `blocksPaletteStyles.ts`, `assetLibraryTab.ts`, `berryShell.ts`, `common-styles.css` |

These are two different variable names that map to the same conceptual token. Components using `--irs-text` depend on `uxFeedback` having initialized. Components using `--irs-text-primary` depend on `theme.css` having loaded. In isolation, each works. But as a system they are incoherent — a future developer cannot know which to use.

Additionally, `--irs-text-muted` exists in `theme.css` but `--irs-text` (the short form, non-muted) does not — it only exists in the runtime-injected block. This means if `uxFeedback` is ever removed or its init order changes, `bottomPanel.ts` loses its text color silently.

### Required Fix

**Step 1:** Establish `--irs-text-primary` as the single canonical name. It is already in `theme.css`, which is the correct home.

**Step 2:** Add `--irs-text` as an alias in `theme.css` pointing to the same value, to prevent breaking anything during migration:
```css
--irs-text-primary: #ffffff;
--irs-text: var(--irs-text-primary);  /* alias — migrate to --irs-text-primary */
```

**Step 3:** Migrate all `var(--irs-text)` usages to `var(--irs-text-primary)`:
- `src/editor/panels/bottomPanel.ts` line 102
- `src/editor/blockly/inspectPanel.ts` lines 94, 431
- `src/editor/uxFeedback.ts` lines 229, 272, 294

**Step 4:** Once all usages are migrated, remove the alias.

---

## Issue #3 — Undeclared Variables Used in `berryShell.ts` {#issue-3}

**Severity: Critical**  
**File:** `src/editor/panels/berryShell.ts`

### What Is Happening

`berryShell.ts` references three CSS variables that are declared **nowhere** in the codebase — not in `theme.css`, not in `uxFeedback.ts`:

| Variable | Used at line(s) | Should Be |
|---|---|---|
| `var(--irs-color-blue-alpha-8)` | 113, 173 | `rgba(74, 158, 255, 0.08)` |
| `var(--irs-color-blue-alpha-16)` | 214 | `rgba(74, 158, 255, 0.16)` |
| `var(--irs-color-blue-alpha-4)` | 227 | `rgba(74, 158, 255, 0.04)` |

Since these are undefined, browsers fall back to `initial`, which means those elements render with no background color where a subtle blue-alpha tint was intended. The close button (line 113), the active tab background (line 173), the scrollbar thumb (line 214), and the placeholder background (line 227) are all silently broken.

### Required Fix

Add the three missing variables to `theme.css` as part of the alpha step-scale (see also Issue #1 fix):

```css
--irs-color-blue-alpha-4:  rgba(74, 158, 255, 0.04);
--irs-color-blue-alpha-8:  rgba(74, 158, 255, 0.08);
--irs-color-blue-alpha-16: rgba(74, 158, 255, 0.16);
```

No changes are needed in `berryShell.ts` itself — once the variables exist in `theme.css`, the usages are correct.

---

## Issue #4 — `berryControls.ts` Uses Zero Theme Tokens {#issue-4}

**Severity: Major**  
**File:** `src/editor/panels/berryControls.ts`

### What Is Happening

`berryControls.ts` defines all its styles entirely in raw `rgba()` and hex values. It uses no `var(--irs-*)` tokens. Every value in its STYLES block is a hardcoded literal:

| Line | Raw Value | Correct Token |
|---|---|---|
| 21 | `background: rgba(255, 255, 255, 0.03)` | `var(--irs-color-blue-alpha-4)` *(closest semantic match — see note below)* |
| 22 | `border: 1px solid rgba(255, 255, 255, 0.06)` | `var(--irs-border-light)` |
| 25 | `color: #fff` | `var(--irs-text-primary)` |
| 35 | `color: #fff` | `var(--irs-text-primary)` |
| 53 | `color: rgba(255, 255, 255, 0.5)` | `var(--irs-text-muted)` |
| 70 | `background: rgba(255, 255, 255, 0.06)` | `var(--irs-border-light)` |
| 71 | `color: rgba(255, 255, 255, 0.6)` | `var(--irs-text-secondary)` |
| 83 | `background: rgba(255, 255, 255, 0.1)` | `var(--irs-color-blue-alpha-12)` |
| 88 | `background: rgba(74, 158, 255, 0.2)` | `var(--irs-color-blue-alpha-22)` |
| 89 | `color: #fff` | `var(--irs-text-primary)` |
| 90 | `box-shadow: inset 0 0 0 1px rgba(74, 158, 255, 0.4)` | `var(--irs-color-blue-alpha-45)` |
| 95 | `color: rgba(255, 255, 255, 0.4)` | `var(--irs-text-muted)` |
| 98 | `background: rgba(0, 0, 0, 0.2)` | `var(--irs-surface-base)` at reduced opacity, or define `--irs-surface-scrim` |

> **Note on line 21:** `rgba(255, 255, 255, 0.03)` is a white-alpha tint used as a section background. The system has no direct equivalent. Options: use `--irs-color-blue-alpha-4` for a tinted surface, or add a new token `--irs-surface-elevated: rgba(255, 255, 255, 0.03)` to `theme.css`. The latter is more semantically accurate.

Additionally, `berryControls.ts` defines its own `.berry-section` and `.berry-brush-control__*` class namespace instead of using the `irs-` prefix. This is covered in Issue #15.

### Required Fix

Replace every raw value in the `STYLES` string with the mapped token from the table above. The `ensureStyles()` function and injection pattern can remain as-is.

---

## Issue #5 — `deployPanel.ts` Uses Zero Theme Tokens {#issue-5}

**Severity: Major**  
**File:** `src/editor/panels/deployPanel.ts`

### What Is Happening

`deployPanel.ts` defines an entirely custom visual style in its STYLES block. None of its color values reference any `var(--irs-*)` token. It also defines `.deploy-btn`, its own button class, instead of using the shared `.irs-btn` system. (See also Issue #14.)

| Line | Raw Value | Correct Token |
|---|---|---|
| 37 | `color: #e6e6f0` | `var(--irs-text-primary)` |
| 41 | `background: #1f1f3a` | `var(--irs-surface-panel)` |
| 42 | `border: 1px solid #2a2a4e` | `var(--irs-border-heavy)` |
| 53 | `color: #fff` | `var(--irs-text-primary)` |
| 58 | `color: #aab0d4` | `var(--irs-text-secondary)` |
| 71 | `background: #4a9eff` | `var(--irs-accent-primary)` |
| 72 | `color: #fff` | `var(--irs-text-primary)` |
| 85 | `border: 1px solid #3a3a6e` | `var(--irs-border-heavy)` |
| 86 | `background: #2a2a4e` | `var(--irs-surface-panel)` *(or `--irs-surface-modal`)* |
| 87 | `color: #fff` | `var(--irs-text-primary)` |
| 95 | `color: #aab0d4` | `var(--irs-text-secondary)` |
| 100 | `color: #ffb347` | `var(--irs-color-yellow)` |
| 108 | `border: 1px solid #3a3a6e` | `var(--irs-border-heavy)` |
| 109 | `background: #131321` | `var(--irs-surface-input)` |
| 110 | `color: #fff` | `var(--irs-text-primary)` |
| 119 | `color: #aab0d4` | `var(--irs-text-secondary)` |
| 129 | `color: #aab0d4` | `var(--irs-text-secondary)` |

### Required Fix

Replace all raw values with the token mappings above. Remove `.deploy-btn` and replace it with `.irs-btn.irs-btn--primary` from `common-styles.css` (see Issue #14 for full button migration steps).

---

## Issue #6 — `assetPalette.ts` Has Its Own Custom Palette {#issue-6}

**Severity: Major**  
**File:** `src/editor/panels/assetPalette.ts`

### What Is Happening

`assetPalette.ts` defines a visual style that is entirely different from the rest of the app. It uses a custom set of blues and navies (`#253461`, `rgba(20, 30, 60, 0.85)`, `rgba(22, 30, 60, 0.85)`, `rgba(47, 59, 102, 0.9)`) that do not match any token in `theme.css`. This component appears to have been written before the token system was established.

| Line | Raw Value | Correct Token |
|---|---|---|
| 9 | `color: #e6ecff` | `var(--irs-text-primary)` |
| 13 | `background: rgba(20, 30, 60, 0.85)` | `var(--irs-surface-panel)` |
| 14 | `border: 1px solid #253461` | `var(--irs-border-heavy)` |
| 22 | `color: #dbe4ff` | `var(--irs-text-primary)` |
| 37 | `color: #b6c4f1` | `var(--irs-text-secondary)` |
| 50 | `background: rgba(22, 30, 60, 0.85)` | `var(--irs-surface-modal)` |
| 52 | `color: #dbe4ff` | `var(--irs-text-primary)` |
| 61 | `border-color: #4a9eff` | `var(--irs-accent-primary)` |
| 62 | `background: rgba(47, 59, 102, 0.9)` | `var(--irs-color-blue-alpha-22)` |
| 74 | `color: #93a1d8` | `var(--irs-text-secondary)` |
| 79 | `color: #9aa7d6` | `var(--irs-text-secondary)` |

### Required Fix

Replace all raw values with the token mappings above. The structural CSS (display, grid, gap, padding) can remain unchanged — only color values need updating.

---

## Issue #7 — `bottomContextStrip.ts` Bypasses the Token System {#issue-7}

**Severity: Major**  
**File:** `src/editor/panels/bottomContextStrip.ts`

### What Is Happening

All color values in `bottomContextStrip.ts` are raw literals. It also uses a different shade of red for its danger state than the rest of the design system (see Issue #18).

| Line | Raw Value | Correct Token |
|---|---|---|
| 39 | `border-top: 1px solid rgba(255, 255, 255, 0.06)` | `var(--irs-border-light)` |
| 52 | `color: rgba(255, 255, 255, 0.5)` | `var(--irs-text-muted)` |
| 72 | `background: rgba(255, 255, 255, 0.06)` | `var(--irs-border-light)` |
| 73 | `color: rgba(255, 255, 255, 0.8)` | `var(--irs-text-primary)` |
| 83 | `background: rgba(255, 255, 255, 0.1)` | `var(--irs-color-blue-alpha-12)` |
| 88 | `background: rgba(239, 68, 68, 0.15)` | `var(--irs-color-red-alpha-15)` *(see Issue #18)* |
| 89 | `color: #fca5a5` | `var(--irs-color-red)` at reduced opacity, or `var(--irs-accent-danger)` |
| 93 | `background: rgba(239, 68, 68, 0.25)` | `var(--irs-color-red-alpha-53)` *(see Issue #18)* |
| 101 | `color: rgba(255, 255, 255, 0.5)` | `var(--irs-text-muted)` |
| 108 | `background: rgba(255, 255, 255, 0.06)` | `var(--irs-border-light)` |
| 109 | `color: rgba(255, 255, 255, 0.8)` | `var(--irs-text-primary)` |

The `height: 40px` touch target issue is also present here — see Issue #16.

### Required Fix

Replace all raw values with the token mappings. Address the red color conflict per Issue #18 before applying the danger token mappings.

---

## Issue #8 — `blocklyTopBar.ts` Uses Raw Values and Off-System Colors {#issue-8}

**Severity: Major**  
**File:** `src/editor/blockly/blocklyTopBar.ts`

### What Is Happening

`blocklyTopBar.ts` mixes some correct `var(--irs-*)` usage with many raw values. It also introduces completely new colors (`#22c55e`, `#16a34a`, `#ef4444`, `#dc2626`, `#3b82f6`, `#2563eb`) that are Tailwind colors, not InRepo Studio tokens. These are a different green, red, and blue family from the established `#6bff95` / `#ff6b6b` / `#4a9eff` palette.

| Line | Raw Value | Correct Token |
|---|---|---|
| 85 | `background: rgba(255, 255, 255, 0.06)` | `var(--irs-border-light)` |
| 86 | `color: rgba(255, 255, 255, 0.7)` | `var(--irs-text-secondary)` |
| 98 | `background: rgba(255, 255, 255, 0.1)` | `var(--irs-color-blue-alpha-12)` |
| 108 | `border: 1px solid rgba(255, 255, 255, 0.12)` | `var(--irs-border-light)` |
| 109 | `background: rgba(255, 255, 255, 0.06)` | `var(--irs-border-light)` |
| 126 | `background-color: rgba(255, 255, 255, 0.1)` | `var(--irs-color-blue-alpha-12)` |
| 138 | `background: rgba(0,0,0,0.5)` | `var(--irs-surface-dark-alpha)` |
| 143 | `border: 1px solid rgba(255,255,255,0.1)` | `var(--irs-border-light)` |
| 150 | `box-shadow: 0 8px 32px rgba(0,0,0,0.6)` | Keep as raw or add `--irs-shadow-modal` token |
| 160 | `color: rgba(255,255,255,0.5)` | `var(--irs-text-muted)` |
| 168 | `border-bottom: 1px solid rgba(255,255,255,0.04)` | `var(--irs-border-light)` *(or new `--irs-border-hairline`)* |
| 172 | `background: rgba(255,255,255,0.03)` | `var(--irs-surface-elevated)` *(new token — see Issue #4)* |
| 200 | `color: #dbe4ff` | `var(--irs-text-primary)` |
| 218 | `color: rgba(255,255,255,0.65)` | `var(--irs-text-secondary)` |
| 224 | `background: rgba(59,130,246,0.15)` | `var(--irs-color-blue-alpha-12)` |
| 228 | `color: #3b82f6` | `var(--irs-color-blue)` *(Tailwind blue — should be `#4a9eff`)* |
| 245 | `background: #22c55e` | `var(--irs-color-green)` *(Tailwind green — should be `#6bff95`)* |
| 246 | `box-shadow: 0 0 6px #16a34a` | `var(--irs-color-green-glow)` |
| 250 | `background: #ef4444` | `var(--irs-color-red)` *(Tailwind red — should be `#ff6b6b`)* |
| 251 | `box-shadow: 0 0 6px #dc2626` | `var(--irs-color-red-alpha-53)` |
| 271 | `background: #22c55e` | `var(--irs-color-green)` |
| 276 | `background: #16a34a` | `var(--irs-color-green)` + darken, or `var(--irs-accent-success)` |
| 290 | `background: #ef4444` | `var(--irs-color-red)` |
| 295 | `background: #dc2626` | `var(--irs-color-red)` + darken, or `var(--irs-accent-danger-active)` |

> **Important:** Lines 228, 245, 250 use Tailwind's blue/green/red. These are visually different from InRepo Studio's accent colors. Switching to `var(--irs-color-green)` / `var(--irs-color-red)` / `var(--irs-color-blue)` will change the appearance of the run/stop status indicators and the script target overlay. This is intentional — those components should match the rest of the UI.

Also note: `blocklyTopBar.ts` uses `var(--irs-color-blue-alpha-12)` (declared in `uxFeedback.ts`) but not yet in `theme.css`. Once Issue #1 is resolved, this usage becomes safe.

### Required Fix

Replace all raw values per the mapping table. Specifically audit and replace the Tailwind-origin colors as these create the most visible inconsistency.

---

## Issue #9 — `blocklyCockpit.ts` Uses Raw Values {#issue-9}

**Severity: Moderate**  
**File:** `src/editor/blockly/blocklyCockpit.ts`

### What Is Happening

`blocklyCockpit.ts` inlines raw values for its empty-state and workspace container styles.

| Line | Raw Value | Correct Token |
|---|---|---|
| 123 | `color: rgba(255, 255, 255, 0.6)` | `var(--irs-text-secondary)` |
| 134 | `color: rgba(255, 255, 255, 0.6)` | `var(--irs-text-secondary)` |
| 164 | `background: #2563eb` | `var(--irs-accent-primary-active)` *(Tailwind blue — see Issue #8 note)* |

Line 164 is also a Tailwind color. `#2563eb` is Tailwind's `blue-600`, not InRepo Studio's `--irs-accent-primary-active` which is `#2563eb` coincidentally — they are the same hex value. However, the reference should still go through the token so future palette changes propagate correctly.

Canvas rendering at line 2081:
```
ctx.fillStyle = 'rgba(83, 101, 164, 0.15)';  // used in 2 places
```
Canvas `fillStyle` cannot use CSS variables, so these cannot be tokenized in the usual way. Define a JS constant at the top of the file:
```ts
const CANVAS_GRID_COLOR = 'rgba(83, 101, 164, 0.15)'; // matches --irs-border-heavy at low alpha
```
This makes the value named and findable, even if it can't reference a CSS variable directly.

### Required Fix

Replace lines 123, 134, 164 with the token mappings. Extract canvas literal at lines 2081 and 2124 into a named constant.

---

## Issue #10 — `layerPanel.ts` Uses Raw Values {#issue-10}

**Severity: Moderate**  
**File:** `src/editor/panels/layerPanel.ts`

### What Is Happening

`layerPanel.ts` uses raw values throughout its STYLES block, with most appearing in interactive states (hover, active, selected):

| Line | Raw Value | Correct Token |
|---|---|---|
| 97 | `border-bottom: 1px solid rgba(255, 255, 255, 0.06)` | `var(--irs-border-light)` |
| 102 | `color: #8a90b8` | `var(--irs-text-secondary)` *(slightly darker — verify visually)* |
| 124 | `background: rgba(255, 255, 255, 0.05)` | `var(--irs-border-light)` |
| 128 | `background: rgba(74, 158, 255, 0.12)` | `var(--irs-color-blue-alpha-12)` |
| 129 | `border-color: rgba(74, 158, 255, 0.35)` | `var(--irs-color-blue-alpha-35)` |
| 154 | `color: #6a70a0` | `var(--irs-text-muted)` |
| 165 | `background: rgba(255, 255, 255, 0.08)` | `var(--irs-color-blue-alpha-8)` |
| 166 | `color: #aab0d4` | `var(--irs-text-secondary)` |
| 170 | `background: rgba(255, 255, 255, 0.12)` | `var(--irs-color-blue-alpha-12)` |
| 191 | `background: #4a9eff` | `var(--irs-accent-primary)` |
| 192 | `border-color: #4a9eff` | `var(--irs-accent-primary)` |
| 193 | `box-shadow: 0 0 8px rgba(74, 158, 255, 0.5)` | `var(--irs-color-blue-alpha-45)` *(approx)* |
| 198 | `color: #e6ecff` | `var(--irs-text-primary)` |
| 229 | `background: rgba(255, 255, 255, 0.1)` | `var(--irs-color-blue-alpha-12)` |
| 233 | `color: #4a9eff` | `var(--irs-color-blue)` |
| 241 | `color: #ff6b6b` | `var(--irs-accent-danger)` |

### Required Fix

Replace all raw values with the token mappings above.

---

## Issue #11 — `inspectPanel.ts` Uses Raw Values {#issue-11}

**Severity: Moderate**  
**File:** `src/editor/blockly/inspectPanel.ts`

### What Is Happening

`inspectPanel.ts` uses raw `rgba()` values for its log entry and error state styles, while it does correctly use `var(--irs-color-red*)` and `var(--irs-color-green)` for status indicators (which are runtime-injected by `uxFeedback`). The inconsistency here is that some states use tokens, others don't.

| Line | Raw Value | Correct Token |
|---|---|---|
| 104 | `color: rgba(230, 236, 255, 0.4)` | `var(--irs-text-muted)` |
| 110 | `border-bottom: 1px solid rgba(255, 255, 255, 0.06)` | `var(--irs-border-light)` |
| 144 | `background: rgba(255, 255, 255, 0.08)` | `var(--irs-color-blue-alpha-8)` |
| 145 | `color: rgba(230, 236, 255, 0.5)` | `var(--irs-text-muted)` |
| 175 | `color: rgba(230, 236, 255, 0.5)` | `var(--irs-text-muted)` |
| 225 | `color: rgba(230, 236, 255, 0.38)` | `var(--irs-text-muted)` |
| 238 | `border-top: 1px solid rgba(255, 255, 255, 0.06)` | `var(--irs-border-light)` |
| 259 | `color: rgba(230, 236, 255, 0.28)` | `var(--irs-text-muted)` |
| 267 | `color: rgba(230, 236, 255, 0.40)` | `var(--irs-text-muted)` |
| 284 | `color: rgba(230, 236, 255, 0.28)` | `var(--irs-text-muted)` |

Also note: `inspectPanel.ts` uses `var(--irs-color-red)`, `var(--irs-color-green)`, etc. (lines 155–196, 430). These are correctly referencing tokens that will live in `theme.css` once Issue #1 is resolved.

### Required Fix

Replace raw values per the mapping table. The existing `var(--irs-color-*)` usages require no changes.

---

## Issue #12 — `animationTab.ts` and `entitiesTab.ts` Use Raw Values {#issue-12}

**Severity: Moderate**  
**Files:** `src/editor/panels/animationTab.ts`, `src/editor/panels/entitiesTab.ts`

### What Is Happening

Both files contain their own STYLES blocks with raw hex and rgba values.

**`animationTab.ts`:**

| Line | Raw Value | Correct Token |
|---|---|---|
| 23 | `color: #e6ecff` | `var(--irs-text-primary)` |
| 27 | `background: rgba(20, 30, 60, 0.85)` | `var(--irs-surface-panel)` |
| 28 | `border: 1px solid #253461` | `var(--irs-border-heavy)` |
| 41 | `background: #0f172f` | `var(--irs-surface-base)` |
| 42 | `border: 1px solid rgba(83, 101, 164, 0.6)` | `var(--irs-border-heavy)` |
| 67 | `border: 1px solid rgba(83, 101, 164, 0.7)` | `var(--irs-border-heavy)` |
| 68 | `background: rgba(18, 26, 52, 0.85)` | `var(--irs-surface-modal)` |
| 69 | `color: #dbe4ff` | `var(--irs-text-primary)` |
| 81 | `background: rgba(40, 54, 92, 0.9)` | `var(--irs-color-blue-alpha-22)` |
| 85 | `border-color: #4a9eff` | `var(--irs-accent-primary)` |
| 86 | `background: rgba(74, 158, 255, 0.2)` | `var(--irs-color-blue-alpha-22)` |
| 87 | `color: #ffffff` | `var(--irs-text-primary)` |
| 92 | `color: #9aa7d6` | `var(--irs-text-secondary)` |
| 97–147 | Various raw colors *(similar patterns to above)* | Map to closest tokens |

**`entitiesTab.ts`:**

| Line | Raw Value | Correct Token |
|---|---|---|
| 19 | `background: rgba(20, 30, 60, 0.85)` | `var(--irs-surface-panel)` |
| 20 | `border: 1px solid #253461` | `var(--irs-border-heavy)` |
| 23 | `color: #e6ecff` | `var(--irs-text-primary)` |
| 29 | `color: #dbe4ff` | `var(--irs-text-primary)` |
| 50 | `background: #1b2a52` | `var(--irs-surface-panel)` |
| 51 | `color: #dbe4ff` | `var(--irs-text-primary)` |
| 63 | `background: #26386a` | `var(--irs-color-blue-alpha-12)` |
| 67 | `border-color: #4a9eff` | `var(--irs-accent-primary)` |
| 68 | `background: #2a3e74` | `var(--irs-color-blue-alpha-22)` |
| 69 | `color: #ffffff` | `var(--irs-text-primary)` |
| 74 | `color: #9fb2e3` | `var(--irs-text-secondary)` |
| 83 | `background: rgba(74, 158, 255, 0.18)` | `var(--irs-color-blue-alpha-12)` |
| 84 | `color: #eaf2ff` | `var(--irs-text-primary)` |
| 92 | `background: rgba(74, 158, 255, 0.28)` | `var(--irs-color-blue-alpha-22)` |
| 102 | `color: #9aa7d6` | `var(--irs-text-secondary)` |
| 108 | `color: #8c94c9` | `var(--irs-text-muted)` |
| 123 | `border-bottom: 1px solid rgba(62, 84, 148, 0.25)` | `var(--irs-border-light)` |
| 133 | `color: #dbe4ff` | `var(--irs-text-primary)` |
| 140 | `border: 1px solid rgba(83, 101, 164, 0.6)` | `var(--irs-border-heavy)` |
| 141 | `background: rgba(22, 30, 60, 0.85)` | `var(--irs-surface-modal)` |

### Required Fix

Replace all raw values per the mapping tables. These two files are among the most thoroughly unthemed components in the codebase and require a complete STYLES block rewrite.

---

## Issue #13 — `authUI.ts` / `deployUI.ts` Use Raw Values {#issue-13}

**Severity: Low–Moderate**  
**Files:** `src/deploy/authUI.ts`, `src/deploy/deployUI.ts`

### What Is Happening

The deploy-subsystem UI files reference hardcoded colors instead of tokens:

**`authUI.ts`:**

| Line | Raw Value | Correct Token |
|---|---|---|
| 46 | `color: #aab0d4` | `var(--irs-text-secondary)` |
| 54 | `color: #aab0d4` | `var(--irs-text-secondary)` |
| 65 | `color: #6bff95` | `var(--irs-accent-success)` |
| 69 | `color: #ff6b6b` | `var(--irs-accent-danger)` |
| 73 | `color: #ff6b6b` | `var(--irs-accent-danger)` |

These are at least using the correct hex values from the design system — they just aren't going through the token. If the accent colors ever change in `theme.css`, these will become stale.

### Required Fix

Replace raw values with the token mappings above. These are straightforward single-line changes.

---

## Issue #14 — Duplicate Button Systems {#issue-14}

**Severity: Major**  
**Files:** `src/editor/panels/deployPanel.ts`, `src/editor/panels/berryControls.ts`

### What Is Happening

The project has a shared, well-designed button system in `src/shared/common-styles.css`:
- `.irs-btn` — base button
- `.irs-btn--primary` — filled blue
- `.irs-btn--secondary` — outlined
- `.irs-btn--danger` — filled red

Despite this, two components define their own private button classes:

**`deployPanel.ts`** defines `.deploy-btn`:
```css
.deploy-btn {
  flex: 1;
  min-height: 44px;
  border-radius: 8px;
  border: none;
  background: #4a9eff;   /* hardcoded, not a token */
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}
```
This is a functional duplicate of `.irs-btn.irs-btn--primary`. It uses the correct color value by coincidence but won't inherit any future changes to the shared button styles (hover states, disabled states, transition, scale-on-active).

**`berryControls.ts`** defines `.berry-brush-control__button`:
```css
.berry-brush-control__button {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  border: none;
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.6);
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
  -webkit-tap-highlight-color: transparent;
}
```
This duplicates all the structural rules of `.irs-btn` (touch-target height, flex centering, tap highlight removal, transition) while using raw color values.

### Required Fix

**For `deployPanel.ts`:** Remove the `.deploy-btn` CSS block. In the TypeScript, change:
```ts
button.className = 'deploy-btn';
```
to:
```ts
button.className = 'irs-btn irs-btn--primary';
```
If `flex: 1` sizing is needed (buttons stretching full-width), add a wrapper-specific override in the deploy panel's STYLES:
```css
.irs-deploy-panel .irs-btn {
  flex: 1;
}
```

**For `berryControls.ts`:** Remove the color and structural properties from `.berry-brush-control__button` and instead add `irs-btn` to the element's class list in TypeScript. The active/selected state (`.berry-brush-control__button--active`) can remain as a modifier class, using tokens instead of raw values:
```css
.berry-brush-control__button--active {
  background: var(--irs-color-blue-alpha-22);
  color: var(--irs-text-primary);
  box-shadow: inset 0 0 0 1px var(--irs-color-blue-alpha-45);
}
```

---

## Issue #15 — CSS Class Naming Convention Inconsistency {#issue-15}

**Severity: Major**  
**Files:** Multiple

### What Is Happening

The codebase has three coexisting CSS naming patterns, with no component fully conforming to a single rule:

**Pattern A (Correct): BEM with `irs-` namespace**  
`irs-berry__header`, `irs-btn--primary`, `irs-overlay--visible`

**Pattern B (Incorrect): BEM without namespace**  
`bottom-panel__tool-button`, `bottom-context-strip__button`, `asset-palette__card`, `asset-library__title`, `layer-panel__header`, `blocks-palette__cat-header`, `blockly-top-bar__back-btn`

**Pattern C (Incorrect): Flat without namespace**  
`deploy-panel`, `deploy-btn`, `deploy-status-card`, `blockly-container`, `blockly-empty-state`

**Pattern D (Incorrect): Abbreviated non-standard**  
`iip`, `iip__status-strip`, `iip__error-title` — (`iip` stands for "InRepo Inspect Panel" but this is opaque to any reader and does not follow the system)

**Full list of component namespaces that need renaming:**

| Current namespace | File | Should become |
|---|---|---|
| `bottom-panel` | `bottomPanel.ts` | `irs-bottom-panel` |
| `bottom-context-strip` | `bottomContextStrip.ts` | `irs-context-strip` |
| `asset-palette` | `assetPalette.ts` | `irs-asset-palette` |
| `asset-library` | `assetLibraryTab.ts` | `irs-asset-library` |
| `berry-section` | `berryControls.ts` | `irs-berry-section` |
| `berry-brush-control` | `berryControls.ts` | `irs-brush-control` |
| `deploy-panel` | `deployPanel.ts` | `irs-deploy-panel` |
| `deploy-btn` | `deployPanel.ts` | Remove — use `irs-btn` |
| `deploy-status-card` | `deployPanel.ts` | `irs-deploy-panel__status-card` |
| `layer-panel` | `layerPanel.ts` | `irs-layer-panel` |
| `layer-row` | `layerPanel.ts` | `irs-layer-panel__row` |
| `blocks-palette` | `blocksPalette.ts` | `irs-blocks-palette` |
| `blockly-top-bar` | `blocklyTopBar.ts` | `irs-blockly-bar` |
| `blockly-container` | `blocklyCockpit.ts` | `irs-blockly-workspace` |
| `blockly-empty-state` | `blocklyCockpit.ts` | `irs-blockly-workspace__empty` |
| `blockly-target-overlay` | `blocklyTopBar.ts` | `irs-target-overlay` |
| `iip` | `inspectPanel.ts` | `irs-inspect-panel` |

### Required Fix

For each component, do a find-and-replace within the file, updating both the STYLES string (CSS selectors) and every `className` assignment in the TypeScript. These are isolated within each file, so there is no cross-file dependency risk for class names that are not shared. Verify there are no external tests or selectors relying on the old names before renaming.

---

## Issue #16 — Touch Target Height Inconsistency (40px vs 44px) {#issue-16}

**Severity: Moderate**  
**File:** `src/editor/panels/bottomContextStrip.ts`

### What Is Happening

The theme defines `--irs-touch-target: 44px` as the mobile minimum tap target. `common-styles.css` and `.irs-btn` both respect this with `min-height: var(--irs-touch-target)`.

`bottomContextStrip.ts` hardcodes `height: 40px` on its buttons:
- Line 68: `.bottom-context-strip { ... }` — strip height
- Line 98: `.bottom-context-strip__button { height: 40px ... }`

4px is a meaningful difference on mobile. The ghost (cancel) button is also only `40px × 40px`, below the minimum.

### Required Fix

In `bottomContextStrip.ts` STYLES, change both button height declarations:
```css
/* Before */
height: 40px;

/* After */
min-height: var(--irs-touch-target);
height: var(--irs-touch-target);
```

For the ghost button specifically:
```css
/* Before */
width: 40px;
height: 40px;

/* After */
width: var(--irs-touch-target);
height: var(--irs-touch-target);
```

---

## Issue #17 — `ensureStyles()` Pattern Is Not Consistently Used {#issue-17}

**Severity: Low**  
**Files:** All panel files

### What Is Happening

Two different patterns exist for injecting component styles:

**Pattern A — Named function (correct):**
```ts
function ensureStyles(): void {
  if (document.getElementById('irs-berry-shell-styles')) return;
  const styleEl = document.createElement('style');
  styleEl.id = 'irs-berry-shell-styles';
  styleEl.textContent = STYLES;
  document.head.appendChild(styleEl);
}
// Called at top of factory function:
ensureStyles();
```
Used in: `berryShell.ts`, `berryControls.ts`

**Pattern B — Inline guard (inconsistent):**
```ts
if (!document.getElementById('bottom-panel-styles')) {
  const styleEl = document.createElement('style');
  styleEl.id = 'bottom-panel-styles';
  styleEl.textContent = STYLES;
  document.head.appendChild(styleEl);
}
```
Used in: `bottomPanel.ts`, `bottomContextStrip.ts`, `assetPalette.ts`, `deployPanel.ts`

Both patterns work. The inconsistency is a readability and maintenance issue — a future developer looking for "where styles are injected" has to recognize two different idioms.

### Required Fix

Standardize on Pattern A (named `ensureStyles()` function) across all panel files. Convert every Pattern B inline block into a proper `ensureStyles()` function at the top of the file. The function name should be consistent: always `ensureStyles`, never anything else.

---

## Issue #18 — Danger Red Is Two Different Colors {#issue-18}

**Severity: Moderate**  
**Files:** `src/shared/theme.css`, `src/shared/common-styles.css`, `src/editor/panels/bottomContextStrip.ts`, `src/editor/blockly/blocklyTopBar.ts`

### What Is Happening

The design system declares its danger/error red as `#ff6b6b` (a warm coral-red), established in `theme.css`:
```css
--irs-accent-danger: #ff6b6b;
--irs-accent-danger-active: #e55555;
```
And `uxFeedback.ts` (to be moved to `theme.css`) also uses:
```css
--irs-color-red: #ff6b6b;
--irs-color-red-alpha-15: rgba(255, 107, 107, 0.15);
--irs-color-red-alpha-53: rgba(255, 107, 107, 0.53);
```

However, `bottomContextStrip.ts` uses a completely different red family:
```css
background: rgba(239, 68, 68, 0.15);   /* Tailwind red-500 at 15% */
color: #fca5a5;                          /* Tailwind red-300 */
background: rgba(239, 68, 68, 0.25);   /* Tailwind red-500 at 25% */
```

`#ef4444` (Tailwind red-500) is a slightly more saturated, brighter red than `#ff6b6b`. They look similar but are detectably different side-by-side. `#fca5a5` (a light pink) as the text color is also not used anywhere else in the system.

`blocklyTopBar.ts` similarly uses `#ef4444` and `#dc2626` for stop/error states (see Issue #8).

### Required Fix

**Step 1:** Decide on the canonical danger color. The existing system uses `#ff6b6b`. Standardize on this.

**Step 2:** In `bottomContextStrip.ts`, replace:
```css
/* Before */
background: rgba(239, 68, 68, 0.15);
color: #fca5a5;
/* active */
background: rgba(239, 68, 68, 0.25);

/* After */
background: var(--irs-color-red-alpha-15);
color: var(--irs-accent-danger);
/* active */
background: var(--irs-color-red-alpha-53);
```

**Step 3:** In `blocklyTopBar.ts`, replace `#ef4444` → `var(--irs-color-red)` and `#dc2626` → `var(--irs-accent-danger-active)` on all stop/error state lines.

---

## Appendix A — Full Token Inventory (What Should Be in `theme.css`) {#appendix-a}

After all fixes, `theme.css` should declare all of the following. Variables currently only in `uxFeedback.ts` are marked **(migrate)**.

```css
:root {
  /* --- Surfaces & Backgrounds --- */
  --irs-surface-base:        #0d1220;
  --irs-surface-panel:       #16213e;
  --irs-surface-modal:       #1a1a2e;
  --irs-surface-input:       #131321;
  --irs-surface-dark:        rgba(26, 43, 82, 0.95);      /* (migrate) */
  --irs-surface-dark-alpha:  rgba(26, 43, 82, 0.85);      /* (migrate — resolved conflict) */
  --irs-surface-elevated:    rgba(255, 255, 255, 0.03);   /* NEW — for subtle raised sections */

  /* --- Accent Colors --- */
  --irs-accent-primary:        #3b82f6;
  --irs-accent-primary-active: #2563eb;
  --irs-accent-danger:         #ff6b6b;
  --irs-accent-danger-active:  #e55555;
  --irs-accent-success:        #6bff95;
  --irs-accent-warning:        #ffd66b;

  /* --- Extended Color Palette (migrate from uxFeedback.ts) --- */
  --irs-color-blue:           #4a9eff;
  --irs-color-blue-alpha-4:   rgba(74, 158, 255, 0.04);   /* NEW */
  --irs-color-blue-alpha-8:   rgba(74, 158, 255, 0.08);   /* NEW */
  --irs-color-blue-alpha-12:  rgba(74, 158, 255, 0.12);
  --irs-color-blue-alpha-16:  rgba(74, 158, 255, 0.16);   /* NEW */
  --irs-color-blue-alpha-22:  rgba(74, 158, 255, 0.22);
  --irs-color-blue-alpha-35:  rgba(74, 158, 255, 0.35);
  --irs-color-blue-alpha-45:  rgba(107, 165, 255, 0.45);
  --irs-color-blue-border:    rgba(107, 165, 255, 0.45);

  --irs-color-green:           #6bff95;
  --irs-color-green-alpha-15:  rgba(107, 255, 149, 0.15);
  --irs-color-green-alpha-53:  rgba(107, 255, 149, 0.53);
  --irs-color-green-glow:      rgba(107, 255, 149, 0.27);

  --irs-color-red:           #ff6b6b;
  --irs-color-red-alpha-15:  rgba(255, 107, 107, 0.15);
  --irs-color-red-alpha-53:  rgba(255, 107, 107, 0.53);

  --irs-color-yellow:          #ffc258;
  --irs-color-yellow-alpha-20: rgba(255, 194, 88, 0.20);
  --irs-color-yellow-border:   rgba(255, 194, 88, 0.65);

  /* --- Borders --- */
  --irs-border-light:      rgba(255, 255, 255, 0.08);
  --irs-border-heavy:      #3a3a6e;
  --irs-border-blue-alpha: rgba(74, 158, 255, 0.12);

  /* --- Typography --- */
  --irs-text-primary:   #ffffff;
  --irs-text-secondary: #aab0d4;
  --irs-text-muted:     #aab0d4;  /* resolved conflict — was rgba(255,255,255,0.5) */

  /* --- Geometry & Sizing --- */
  --irs-radius-sm:      8px;
  --irs-radius-md:      10px;
  --irs-radius-lg:      12px;
  --irs-touch-target:   44px;

  /* --- Animation Durations (migrate from uxFeedback.ts) --- */
  --irs-duration-ack:      120ms;
  --irs-duration-change:   220ms;
  --irs-duration-safe:     350ms;
  --irs-duration-toast:    4000ms;
  --irs-duration-undo-bar: 5000ms;
}
```

---

## Appendix B — Canonical CSS Naming Convention {#appendix-b}

All CSS classes in InRepo Studio must follow this pattern:

```
irs-[component]__[element]--[modifier]
```

**Rules:**

1. **Every class begins with `irs-`** — no exceptions, no matter how small the component.
2. **Block name** = short, lowercase, hyphenated description of the component: `irs-bottom-panel`, `irs-layer-panel`, `irs-context-strip`.
3. **Element** = double-underscore separator: `irs-bottom-panel__tool-button`.
4. **Modifier** = double-dash separator: `irs-bottom-panel__tool-button--active`.
5. **No abbreviated block names** — `iip` is not acceptable. Full names only: `irs-inspect-panel`.
6. **Components that live inside the berry shell but are standalone widgets** use their own block name, not `irs-berry__*`. The berry shell owns `irs-berry__*`. A brush control widget inside a berry is `irs-brush-control`, not `irs-berry__brush-control`.
7. **Shared system classes** (`irs-btn`, `irs-input`, `irs-overlay`, `irs-dialog`, `irs-search`) live in `common-styles.css` and are not redefined anywhere else.
