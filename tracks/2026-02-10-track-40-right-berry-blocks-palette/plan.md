# Track 40 — Right Berry Blocks Palette — Plan

## Recon Summary

- **Files likely to change:**
  - `src/editor/panels/rightBerry.ts` — add `setTabSet()` for Blockly Mode tab switching
  - `src/editor/blockly/blocklyCockpit.ts` — wire palette lifecycle to mode enter/exit
  - `src/editor/blockly/index.ts` — update exports
  - New: `src/editor/blockly/blocksPalette.ts` — palette component
  - New: `src/editor/blockly/paletteCategories.ts` — category definitions + helpers
  - New: `src/editor/blockly/blocklyBerryTabs.ts` — Blockly Mode tab definitions
  - `INDEX.md` — add new files
  - `context/active-track.md` — update current phase

- **Key modules/functions involved:**
  - `BlockRegistry` (`src/runtime/blockly/blockRegistry.ts`) — block lookup, search, dependency
  - `BlocklyWorkspaceController` (`src/editor/blockly/blocklyWorkspace.ts`) — `insertBlock()`, `getBlockRegistry()`
  - `RightBerryController` (`src/editor/panels/rightBerry.ts`) — tab rendering, content containers
  - `blocklyMode` state (`src/editor/blockly/blocklyMode.ts`) — mode detection, Logic Target
  - `BlocklyCockpitController` (`src/editor/blockly/blocklyCockpit.ts`) — lifecycle orchestration

- **Invariants to respect:**
  - Right berry is the palette in Blockly Mode (Blockly Plan Part 13) — no bottom-sheet toolbox
  - Palette content varies by Logic Target (Map blocks only for map targets)
  - Schema-driven blocks: preset definitions drive block categories
  - No raw Phaser in Blockly: all blocks use Game API surface only
  - Mobile-first: touch targets >= 44px, no precision frustration
  - Scope is never hidden: Logic Target always visible

- **Cross-module side effects:**
  - Right berry `setTabSet()` changes affect all berry consumers — ensure World Mode tabs are restored cleanly on exit
  - `blocklyCockpit.ts` wiring must handle palette lifecycle correctly (create on enter, destroy on exit)

- **Apply/rebuild semantics:**
  - Palette content is live-applying (re-renders when Logic Target changes or preset state changes)
  - No persistence of palette state (search query, expanded categories reset on mode exit)

- **Data migration impact:** None — no schema changes.

- **File rules impact:**
  - `blocksPalette.ts` must stay under 450 lines (split if needed)
  - `paletteCategories.ts` keeps category definitions separate from rendering

- **Risks/regressions:**
  - Right berry tab switching could break World Mode tabs if not carefully restored
  - Berry swipe gesture conflicts with palette scrolling

- **Verification commands/checks:**
  - `tsc --noEmit` — type checking
  - `npm run build` — build succeeds
  - `npm run lint` — no new lint errors
  - Manual: browse palette on mobile, search, insert blocks, switch Logic Targets

---

## Phase 1: Right Berry Tab Switching + Palette Categories

### Tasks
- [ ] Read `src/editor/panels/AGENTS.md` and `src/editor/blockly/AGENTS.md` before editing
- [ ] Create `src/editor/blockly/paletteCategories.ts` — define `PALETTE_CATEGORIES` constant, `PaletteCategoryDef` type, `getCategoryBlocks()` helper, `isCategoryEnabled()` helper
- [ ] Create `src/editor/blockly/blocklyBerryTabs.ts` — define `BLOCKLY_BERRY_TABS` constant (Blocks + Inspect placeholder)
- [ ] Add `setTabSet()` method to `RightBerryController` in `src/editor/panels/rightBerry.ts` — accepts new tab definitions, rebuilds tab bar + content containers, preserves open/close state
- [ ] Add `restoreDefaultTabs()` method to restore World Mode tabs
- [ ] Update `src/editor/blockly/index.ts` with new exports

### Files touched
- `src/editor/blockly/paletteCategories.ts` (new)
- `src/editor/blockly/blocklyBerryTabs.ts` (new)
- `src/editor/panels/rightBerry.ts` (modify — add `setTabSet()`, `restoreDefaultTabs()`)
- `src/editor/blockly/index.ts` (update exports)

### Verification
- [ ] `PALETTE_CATEGORIES` has 11 categories matching v1 spec (Events through Map)
- [ ] `getCategoryBlocks()` correctly queries BlockRegistry by category
- [ ] `isCategoryEnabled()` correctly checks PresetSavedConfig for preset-driven categories
- [ ] `setTabSet()` replaces tab bar and content containers without errors
- [ ] `restoreDefaultTabs()` restores World Mode tabs cleanly
- [ ] `tsc --noEmit` passes
- [ ] `npm run build` succeeds

### Stop point
Pause for review. Confirm right berry tab switching works before building palette UI.

---

## Phase 2: Blocks Palette Component

### Tasks
- [ ] Create `src/editor/blockly/blocksPalette.ts` — main palette component
- [ ] Implement categorized block list: collapsible category sections with block items
- [ ] Implement block item rendering: label + color-coded dot for block family (hat/action/reporter)
- [ ] Implement category header: label, icon, expand/collapse chevron, block count
- [ ] Implement preset-driven category states: enabled (show blocks), disabled (show placeholder with Enable action)
- [ ] Implement Logic Target filtering: hide Map category when Game Logic target is selected
- [ ] Implement tap-to-insert: tapping block item calls `workspace.insertBlock(blockType)`
- [ ] Implement Beginner/Advanced split: per-category "Show advanced" toggle
- [ ] Implement dependency prompts: inline prompt when inserting a block that requires a disabled preset
- [ ] Ensure touch targets >= 44px for all interactive elements
- [ ] Add `touch-action: pan-y` and `stopPropagation()` for gesture isolation
- [ ] Update `src/editor/blockly/index.ts` with palette exports

### Files touched
- `src/editor/blockly/blocksPalette.ts` (new)
- `src/editor/blockly/index.ts` (update exports)

### Verification
- [ ] Categories render with correct blocks from BlockRegistry
- [ ] Disabled preset categories show placeholder with Enable action
- [ ] Map category only appears for Map Logic targets
- [ ] Tapping a block inserts it into the workspace
- [ ] Advanced blocks hidden by default, shown via toggle
- [ ] Dependency prompt appears for blocks requiring disabled presets
- [ ] Touch targets are >= 44px
- [ ] Palette scrolls without triggering berry swipe
- [ ] `tsc --noEmit` passes
- [ ] `npm run build` succeeds

### Stop point
Pause for review. Confirm palette renders correctly and block insertion works before adding search and wiring.

---

## Phase 3: Search + Cockpit Wiring

### Tasks
- [ ] Add search bar to palette (sticky at top, full-width, clear button)
- [ ] Implement search: type-as-you-go filtering via `registry.search(query, logicTarget)`
- [ ] Search results: grouped by category, each showing block label + category tag
- [ ] Selecting a search result: same insert flow as tapping a block
- [ ] Empty search results: "No blocks found" message
- [ ] Wire palette into `blocklyCockpit.ts`:
  - On enter Blockly Mode: call `rightBerry.setTabSet(BLOCKLY_BERRY_TABS)`, create palette in Blocks tab container
  - On Logic Target change: call `palette.setLogicTarget(newTarget)`
  - On exit Blockly Mode: call `palette.destroy()`, call `rightBerry.restoreDefaultTabs()`
- [ ] Ensure right berry opens to Blocks tab when entering Blockly Mode

### Files touched
- `src/editor/blockly/blocksPalette.ts` (modify — add search)
- `src/editor/blockly/blocklyCockpit.ts` (modify — wire palette lifecycle)

### Verification
- [ ] Search bar appears at top of palette
- [ ] Typing filters blocks in real-time
- [ ] Search matches labels and keywords
- [ ] Results grouped by category
- [ ] Selecting a search result inserts the block
- [ ] Entering Blockly Mode shows Blockly tabs in right berry
- [ ] Exiting Blockly Mode restores World Mode tabs
- [ ] Logic Target switch updates palette content (Map category appears/disappears)
- [ ] `tsc --noEmit` passes
- [ ] `npm run build` succeeds

### Stop point
Pause for review. Full palette is functional with search and cockpit wiring.

---

## Phase 4: Polish + Docs Update

### Tasks
- [ ] Test palette on mobile: scroll, search, insert, category expand/collapse
- [ ] Test gesture isolation: palette scroll does not trigger berry swipe
- [ ] Test Logic Target switching: Map category appears/disappears correctly
- [ ] Test disabled preset categories: placeholder shows and Enable action works (or directs to left berry)
- [ ] Verify block insertion places blocks at correct position in workspace
- [ ] Check that all files stay under 450-line soft limit; split if needed
- [ ] Update `INDEX.md` with new files
- [ ] Update `context/schema-registry.md` if new lists-of-truth were added
- [ ] Update `context/repo-map.md` if module boundaries changed
- [ ] Update `context/active-track.md` — mark Track 40 complete, set next task

### Files touched
- `INDEX.md` (update)
- `context/schema-registry.md` (update if needed)
- `context/repo-map.md` (update if needed)
- `context/active-track.md` (update)
- `src/editor/blockly/*.ts` (polish fixes if needed)

### Verification
- [ ] Full palette workflow: open berry → browse categories → search → insert block → verify in workspace
- [ ] Logic Target switch: Game Logic → no Map category; Map Logic → Map category appears
- [ ] Disabled preset: placeholder shows; enabled preset: blocks show
- [ ] Advanced toggle: blocks appear/disappear
- [ ] Mobile UX: smooth scroll, adequate touch targets, no gesture conflicts
- [ ] `npm run build` succeeds
- [ ] `npm run lint` passes (or only pre-existing issues)
- [ ] INDEX.md, schema-registry.md, repo-map.md are current

### Stop point
Track 40 complete. Ready for Track 41 (Presets UI + Blockly Hooks).
