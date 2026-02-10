# Fix Plan: Blockly Context Synchronization

> **Theme:** All seven issues cluster around one root cause — **context synchronization**.
> The preset selection, the dropdown state, the Blockly workspace, the block palette,
> and the dependency system are each managing their own truth instead of snapping
> together through a single, authoritative flow.

---

## Issue 1: "Edit in Blockly" does nothing

### Root cause

The `blocklyHooksTab.ts:156` "Edit in Blockly" button calls `openInBlocklyFn`, which
is wired in `init.ts:920` to call `blocklyCockpit.enter(target)`. The cockpit's `enter()`
method (`blocklyCockpit.ts:394`) does the following:

1. Calls `enterBlocklyMode(resolvedTarget)` — sets global state
2. Calls `showUI()` — swaps DOM visibility
3. Lazy-loads Blockly workspace module
4. Creates workspace manager
5. Builds Logic Targets, wires palette, etc.

**The likely failure points:**

- **Left Berry overlay blocks the cockpit.** The Left Berry is a slide-out panel that
  sits on top of the canvas area. When "Edit in Blockly" is tapped, the cockpit
  activates underneath the Left Berry, but the Left Berry remains open and on top,
  so the user sees no visual change. The cockpit `showUI()` hides the game canvas
  and shows the workspace container, but the Left Berry panel is still covering it.

- **No Left Berry auto-close.** After entering Blockly Mode, the Left Berry should
  close (or at minimum collapse) so the workspace is visible. Currently there is no
  `leftBerry.close()` call in the `enter()` path.

- **No feedback on entry.** If the cockpit is already active (`isBlocklyModeActive()`
  returns true at `blocklyCockpit.ts:396`), the function returns silently. If a prior
  entry half-completed, subsequent taps are silently swallowed.

### Fix plan

| Step | File | Change |
|------|------|--------|
| 1 | `blocklyCockpit.ts` → `enter()` | After `showUI()`, call `leftBerry?.close()` (or equivalent) to collapse the Left Berry panel so the workspace is visible. |
| 2 | `leftBerry.ts` | Expose a `close()` method on `LeftBerryController` if not already present. Verify it clears the panel overlay state. |
| 3 | `blocklyCockpit.ts` → `enter()` | Add a guard: if the cockpit is already active but the requested target differs, switch targets instead of returning silently. If the same target, still ensure the workspace is visible. |
| 4 | `blocklyHooksTab.ts` | After `openInBlockly(blockType)` resolves, verify Blockly Mode is actually active before attempting `insertAfterOpen`. Log a warning if it isn't. |
| 5 | Integration test | Manually verify: Left Berry → Presets → Movement → Blockly Hooks → "Edit in Blockly" → Left Berry closes, workspace appears, block is inserted. |

### Files touched

- `src/editor/blockly/blocklyCockpit.ts`
- `src/editor/panels/leftBerry.ts`
- `src/editor/presets/blocklyHooksTab.ts`

---

## Issue 2: Top dropdown does not reflect preset granularity

### Root cause

The Logic Target dropdown (`blocklyTopBar.ts`) groups targets into three categories:
**Presets**, **Game**, and **Maps** (built in `blocklyCockpit.ts:274–301`). Under
"Presets", it lists the four coarse categories:

```
Presets
  Controls
  Movement
  Camera
  Animation
```

It does **not** break these down further into event presets, command presets, or state
presets — because the Logic Target model treats each preset category as a single
editing scope. The dropdown is working as currently designed, but the design does
not match user expectations.

### What the user expects

Each preset category should expand to show its editable presets:

```
Presets
  Controls
    ├ controls-platformer (events / commands / state)
  Movement
    ├ movement-platformer
    ├ movement-topdown
  Camera
    ├ camera-follow
  Animation
    ├ animation-driver
```

### Fix plan

| Step | File | Change |
|------|------|--------|
| 1 | `blocklyCockpit.ts` → `buildLogicTargets()` | For each preset category, query the registry for the active preset ID. Include the preset label as a sub-label in the `LogicTargetItem`. |
| 2 | `blocklyTopBar.ts` → overlay rendering | Add a second level of nesting inside the Presets group. Each category becomes a sub-header with its active preset shown inline. Keep items tappable at the preset level, not the sub-preset level (editing scope is still the category). |
| 3 | `blocklyTopBar.ts` → `updateTargetBtnLabel()` | Show the full context: `"Movement → movement-platformer"` or similar, so the top button label reflects both category and active preset. |
| 4 | Style | Add CSS for the sub-header indent level inside the overlay panel. |

### Files touched

- `src/editor/blockly/blocklyCockpit.ts`
- `src/editor/blockly/blocklyTopBar.ts`

---

## Issue 3: Right Berry shows blank / unusable block slots

### Root cause

In `blocksPalette.ts`, blocks are rendered via `createBlockItem()` at line 316.
The block label is derived from `entry.definition.message0` with `%` placeholders
stripped:

```ts
label.textContent = entry.definition.message0.replace(/%\d+/g, '').trim();
```

If `message0` is empty, has only placeholders, or the block definition is malformed
(e.g., a block type was registered but its definition is incomplete), the label will
be empty — producing a visible but blank button element.

Additionally, `getCategoryBlocks()` in `paletteCategories.ts:57` filters blocks by
Logic Target and advanced toggle, but does **not** filter out blocks that are invalid
for the current context (e.g., blocks whose required preset is disabled but the
category itself is enabled, or blocks that reference missing entity types).

### Fix plan

| Step | File | Change |
|------|------|--------|
| 1 | `blocksPalette.ts` → `createBlockItem()` | Add a guard: if the computed label is empty or whitespace-only, skip rendering this item entirely. Return `null` and filter nulls in the caller. |
| 2 | `blocksPalette.ts` → `renderCategories()` | After getting blocks from `getCategoryBlocks()`, filter out entries where `entry.definition.message0` is falsy or results in an empty display label. |
| 3 | `paletteCategories.ts` → `getCategoryBlocks()` | Add an optional `validateBlock` filter that checks `entry.definition.message0` is non-empty and `entry.definition.type` is a registered Blockly block type. |
| 4 | `blocksPalette.ts` → count display | Update the category count badge to reflect only the actually-rendered blocks (not the full registry count). |

### Files touched

- `src/editor/blockly/blocksPalette.ts`
- `src/editor/blockly/paletteCategories.ts`

---

## Issue 4: Core preset dependency is unclear and non-functional

### Root cause

The "Requires core preset" prompt and "Enable" button are rendered in
`blocksPalette.ts:372–411` (`showDependencyPrompt()`). When "Enable" is clicked:

```ts
if (onEnablePreset) {
  onEnablePreset(catId);
}
prompt.remove();
```

But in `init.ts:916`, the `onEnablePreset` callback is passed as `undefined`:

```ts
onEnablePreset: undefined,
```

So `onEnablePreset` is never truthy — the `if` guard means the click handler does
nothing except remove the prompt element. No preset is enabled, no state changes,
no feedback.

### Fix plan

| Step | File | Change |
|------|------|--------|
| 1 | `init.ts` | Wire `onEnablePreset` to the preset config store: `onEnablePreset: (categoryId) => { presetConfigStoreRef?.enableCategory(categoryId, registry.getDefaultForCategory(categoryId)); }` |
| 2 | `presetRegistry.ts` | Add a `getDefaultForCategory(categoryId)` method that returns the first (or recommended) preset ID for a category, so we have a sensible default when enabling from the palette. |
| 3 | `blocksPalette.ts` → `showDependencyPrompt()` | After calling `onEnablePreset`, re-render the palette so the newly-enabled category shows its blocks. Add a brief visual confirmation (e.g., the prompt text changes to "Enabled!" before auto-dismissing). |
| 4 | `blocksPalette.ts` → disabled placeholder | Same fix for the category-level "Enable" button in the disabled placeholder section (line 196). |
| 5 | UX | Add a "Requires: [Category]" label or icon directly on blocks that have unmet dependencies, visible even before the user taps. This eliminates the "dead end" surprise. |

### Files touched

- `src/editor/init.ts`
- `src/runtime/presets/presetRegistry.ts`
- `src/editor/blockly/blocksPalette.ts`

---

## Issue 5: Profile selection behaves inconsistently

### Root cause

In `presetsTab.ts:278`, clicking a profile chip calls:

```ts
config.configStore.setProfile(profile.id);
```

In `presetConfigStore.ts:141`, `setProfile()`:

1. Gets recommendations for the profile
2. For each category, sets `enabled: true` with the recommended preset
3. Saves and notifies

The UI then re-renders via the `onChange` subscription. The `refresh()` function at
line 349 checks `config.configStore.getConfig().profile` and toggles the
`--active` class on chips.

**The likely issue:** After selecting "Custom" (or after the system auto-sets
"Custom" due to user mixing presets), `setProfile('custom')` is called.
`getProfileRecommendations('custom')` likely returns an empty or undefined
recommendation map — so no categories are updated. But the profile value in
config is set to `'custom'`, and the UI chip highlights accordingly.

After that, clicking "Platformer" should call `setProfile('platformer')`, which
*does* return recommendations. But if the `setProfile` method has a guard or
the recommendations don't overwrite the existing state correctly, the transition
fails.

**Alternatively:** The profile chip click handler creates a snapshot and shows an
undo toast. If the toast's undo callback fires asynchronously or the
`configStore.restore(snapshot)` races with the new `setProfile`, the state can
end up inconsistent.

### Fix plan

| Step | File | Change |
|------|------|--------|
| 1 | `presetConfigStore.ts` → `setProfile()` | Add a log statement at entry/exit to trace the profile switch. Verify that switching from Custom → Platformer correctly overwrites all categories. |
| 2 | `presetsTab.ts` → profile chip handler | Clear any pending undo toast before applying a new profile. Prevent race between undo restore and new profile apply. |
| 3 | `presetConfigStore.ts` → `setProfile()` | Ensure the method doesn't early-return or skip if the profile is already the current one. Force a full re-apply of recommendations. |
| 4 | `presetsTab.ts` → `refresh()` | After profile change, force a full dashboard re-render (not just chip toggle). Ensure category rows update to reflect new preset selections. |
| 5 | Debug | Add `console.log` tracing in `setProfile` and `restore` to identify the exact state transition that breaks. |

### Files touched

- `src/editor/presets/presetConfigStore.ts`
- `src/editor/presets/presetsTab.ts`

---

## Issue 6: Profile changes feel too dangerous

### Root cause

This is a UX issue, not a bug. `setProfile()` overwrites all category configs in
one operation. While the undo toast exists, it auto-dismisses after a short timeout,
and the visual weight of the toast doesn't match the magnitude of the change.

### Fix plan

| Step | File | Change |
|------|------|--------|
| 1 | `presetsTab.ts` → profile chip handler | Replace the immediate `setProfile()` call with a **confirmation modal**: "Switch to Platformer? This will change all preset categories. Your current settings will be saved for undo." with Confirm / Cancel buttons. |
| 2 | `undoToast.ts` | Extend the undo toast duration for profile changes (e.g., 10 seconds instead of the default). Add a visual emphasis (different color / larger size) for high-impact undo actions. |
| 3 | `presetsTab.ts` | Show a brief diff summary in the confirmation: "Will change: Movement (topdown → platformer), Controls (topdown → platformer)". This gives users confidence about what will happen. |

### Files touched

- `src/editor/presets/presetsTab.ts`
- `src/editor/presets/undoToast.ts`

---

## Issue 7: Scope decision — what we are NOT fixing

The following areas are **explicitly deferred** and should not be touched in this fix cycle:

- Animation preset internals
- Entity-scoped Logic Targets
- Trigger-scoped Logic Targets
- ScriptHost runtime execution (Run/Stop remain stubs)
- Inspect/Errors panel (Track 42)
- Per-frame / advanced tick blocks

The scope of this fix is limited to:

- Left Berry presets → Blockly entry flow
- Top dropdown → Logic Target selection + label accuracy
- Right Berry blocks palette → valid block rendering
- Dependency system → "Enable" button wiring
- Profile selection → state consistency
- Profile switching → UX safety

---

## Implementation priority (recommended order)

| Priority | Issue | Rationale |
|----------|-------|-----------|
| **P0** | Issue 1: "Edit in Blockly" broken | Primary editing pathway is dead. |
| **P0** | Issue 4: Enable preset does nothing | `onEnablePreset: undefined` is a simple wiring gap with outsized impact. |
| **P1** | Issue 3: Blank block slots | Visual noise / confusion in the palette. |
| **P1** | Issue 5: Profile selection stuck | Broken state transition blocks workflow. |
| **P2** | Issue 2: Dropdown granularity | UX improvement, not a blocker. |
| **P2** | Issue 6: Profile change safety | UX risk mitigation, not a functional bug. |
| **--** | Issue 7: Scope boundary | No work needed — just the fence. |

---

## Cross-cutting concern: Context sync architecture

All six functional issues stem from the same pattern: **modules hold local state that
drifts from the authoritative source.** The fix for each issue is local, but the
systemic improvement is to ensure a single notification flow:

```
PresetConfigStore (source of truth)
  ↓ onChange()
  ├─ PresetsTab (left berry) re-renders
  ├─ BlocksPalette (right berry) re-renders
  ├─ BlocklyTopBar (dropdown) updates label + active indicator
  └─ BlocklyCockpit (workspace) reloads if target changed
```

Currently, some of these paths are wired (PresetsTab subscribes to onChange) and
some are not (BlocksPalette does not subscribe; BlocklyTopBar is event-driven from
cockpit, not from config store). The fix cycle should close these gaps.

### Specific sync gaps to close

| Consumer | Currently subscribes to ConfigStore? | Fix needed |
|----------|-------------------------------------|------------|
| PresetsTab | Yes (line 434) | None |
| BlocksPalette | No — renders once, no live subscription | Add `configStore.onChange()` → `palette.refresh()` |
| BlocklyTopBar | No — only updated on explicit cockpit calls | Wire `configStore.onChange()` → update target label |
| Dependency prompts | No — check config at click time only | After enabling, trigger palette re-render |

---

## Verification checklist

After all fixes are applied, verify each scenario:

- [ ] Left Berry → Presets → Movement → Blockly Hooks → "Edit in Blockly" → workspace opens, Left Berry closes, block is inserted
- [ ] Top dropdown shows preset categories with active preset sub-labels
- [ ] Right Berry palette has no blank/empty block slots
- [ ] "Requires [category] preset" → "Enable" → preset enables, palette updates, block becomes insertable
- [ ] Profile: Custom → Platformer → Top-Down → Custom — all transitions work, UI stays in sync
- [ ] Profile switch shows confirmation before applying
- [ ] Undo toast works for profile changes with extended duration

---

*Created: 2026-02-10*
*Authority: /context/Blockly_Plan_Revised.md*
*Related tracks: 39 (Blockly Workspace UI), 40 (Right Berry Blocks Palette), 41 (Left Berry Presets UI)*
