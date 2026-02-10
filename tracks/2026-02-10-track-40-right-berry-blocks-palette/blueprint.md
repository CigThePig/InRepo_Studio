# Track 40 — Right Berry Blocks Palette — Blueprint

## Technical Design

### Architecture overview

Track 40 adds the **Blocks Palette** to the right berry during Blockly Mode. The key design challenge is that the right berry currently uses `EditorMode` (a World Mode concept) to drive its tabs. In Blockly Mode, the right berry needs entirely different tab content. Rather than extending the `EditorMode` union (which is World Mode-specific), we introduce a **tab-set switching mechanism** that swaps the right berry's tabs when Blockly Mode activates.

The palette itself queries the existing `BlockRegistry` (Track 37-38) to populate its categories and uses `BlocklyWorkspaceController.insertBlock()` to place blocks into the workspace.

### Key design decisions

1. **Tab-set switching, not EditorMode extension:** Blockly Mode tabs ("Blocks", "Inspect") are not part of the `EditorMode` union. Instead, the right berry controller gets an API to switch between World Mode tabs and Blockly Mode tabs based on the `blocklyMode` state.

2. **Palette queries BlockRegistry:** The palette does not maintain its own block list. It reads from the `BlockRegistry` that is already populated by `registerCoreBlocks()` and `generateBlockPack()` during workspace initialization.

3. **Category model:** Palette categories are defined as a static list that maps to BlockRegistry category IDs. Each category has metadata (label, icon, whether it's preset-driven, whether it has advanced blocks). Categories are rendered as collapsible sections.

4. **Tap-to-insert (v1):** Tapping a block item in the palette calls `insertBlock(blockType)`. Drag-to-insert is deferred to a later polish track.

5. **Dependency prompts via BlockRegistry:** Each `BlockPackEntry` carries `dependency` metadata. If the dependency category is disabled, the palette shows a prompt before inserting.

### State model

```
blocksPaletteState = {
  searchQuery: string,                    // Current search text
  expandedCategories: Set<string>,        // Which categories are expanded
  showAdvanced: Record<string, boolean>,  // Per-category advanced toggle
  logicTarget: ScriptLogicTarget | null,  // Current Logic Target (for filtering)
}
```

This state is local to the palette component (not persisted). It resets when Blockly Mode is exited.

### Category definitions (v1)

```
PALETTE_CATEGORIES = [
  { id: 'events',    label: 'Events',     icon: '⚡', presetDriven: false, alwaysVisible: true },
  { id: 'controls',  label: 'Controls',   icon: '🎮', presetDriven: true,  categoryId: 'controls' },
  { id: 'movement',  label: 'Movement',   icon: '🏃', presetDriven: true,  categoryId: 'movement' },
  { id: 'camera',    label: 'Camera',     icon: '📷', presetDriven: true,  categoryId: 'camera' },
  { id: 'animation', label: 'Animation',  icon: '🎬', presetDriven: true,  categoryId: 'animation' },
  { id: 'logic',     label: 'Logic',      icon: '🔀', presetDriven: false, alwaysVisible: true },
  { id: 'math',      label: 'Math',       icon: '🔢', presetDriven: false, alwaysVisible: true },
  { id: 'variables', label: 'Variables',  icon: '📦', presetDriven: false, alwaysVisible: true },
  { id: 'time',      label: 'Time',       icon: '⏱',  presetDriven: false, alwaysVisible: true },
  { id: 'debug',     label: 'Debug',      icon: '🐛', presetDriven: false, alwaysVisible: true, defaultCollapsed: true },
  { id: 'map',       label: 'Map',        icon: '🗺',  presetDriven: false, logicTargetFilter: 'map' },
]
```

Note: Icons are placeholders — actual implementation uses simple text labels or CSS-based icons for mobile performance.

### Files touched / created

#### New files

1. **`/src/editor/blockly/blocksPalette.ts`** — Main palette component
   - `createBlocksPalette(container, deps): BlocksPaletteController`
   - Dependencies: BlockRegistry, BlocklyWorkspaceController, blocklyMode state, preset config state
   - Renders categorized block list, search bar, category sections
   - Returns controller: `setLogicTarget(target)`, `refresh()`, `destroy()`

2. **`/src/editor/blockly/paletteCategories.ts`** — Category definitions + rendering helpers
   - `PALETTE_CATEGORIES` — ordered list of palette category metadata
   - `getCategoryBlocks(registry, categoryId, logicTarget, showAdvanced)` — query helper
   - `isCategoryEnabled(categoryId, presetConfig)` — check if preset category is active

3. **`/src/editor/blockly/blocklyBerryTabs.ts`** — Blockly Mode tab definitions for right berry
   - `BLOCKLY_BERRY_TABS` — tab definitions for Blockly Mode: [{id: 'blocks', label: 'Blocks'}, {id: 'inspect', label: 'Inspect'}]
   - Inspect tab content is a placeholder ("Coming in Track 42")

#### Modified files

4. **`/src/editor/panels/rightBerry.ts`** — Add tab-set switching
   - Add `setTabSet(tabs)` or `setBlocklyMode(active)` method to `RightBerryController`
   - When Blockly Mode activates: replace World Mode tabs with Blockly tabs
   - When Blockly Mode deactivates: restore World Mode tabs

5. **`/src/editor/blockly/blocklyCockpit.ts`** — Wire palette to cockpit lifecycle
   - On enter Blockly Mode: switch right berry to Blockly tabs, create palette in "Blocks" tab container
   - On exit Blockly Mode: destroy palette, switch right berry back to World Mode tabs
   - On Logic Target change: update palette's Logic Target filter

6. **`/src/editor/blockly/index.ts`** — Update exports
   - Re-export `BlocksPaletteController`, `PALETTE_CATEGORIES`

### APIs and interfaces

```typescript
// blocksPalette.ts
interface BlocksPaletteController {
  setLogicTarget(target: ScriptLogicTarget): void;  // Update Logic Target filter
  refresh(): void;                                    // Re-query registry + re-render
  destroy(): void;                                    // Cleanup
}

interface BlocksPaletteDeps {
  registry: BlockRegistry;
  workspace: BlocklyWorkspaceController;
  getPresetConfig: () => PresetSavedConfig | null;   // Check which presets enabled
  onEnablePreset?: (categoryId: string) => void;     // Action: enable a preset
}

// paletteCategories.ts
interface PaletteCategoryDef {
  id: string;
  label: string;
  icon: string;
  presetDriven: boolean;
  categoryId?: string;        // Maps to BlockRegistry category
  alwaysVisible?: boolean;
  logicTargetFilter?: 'game' | 'map';
  defaultCollapsed?: boolean;
}

// blocklyBerryTabs.ts
interface BlocklyBerryTab {
  id: string;
  label: string;
  icon?: string;
}
```

### Data flow

```
Blockly Mode enters
  → blocklyCockpit calls rightBerry.setBlocklyMode(true)
  → Right berry swaps to Blockly tabs (Blocks, Inspect)
  → blocklyCockpit creates BlocksPalette in "Blocks" tab container
  → Palette queries BlockRegistry for all entries
  → Palette filters by current Logic Target
  → Palette groups blocks into categories

User opens a category
  → Category expands, showing block items
  → If preset-driven and disabled: shows placeholder

User taps search bar
  → Search input filters blocks via registry.search(query, logicTarget)
  → Results shown grouped by category

User taps a block item
  → Check dependency: is required preset enabled?
    → If yes: workspace.insertBlock(blockType)
    → If no: show dependency prompt ("Enable X preset?")
      → If user confirms: onEnablePreset(categoryId)
      → Then insert block

User toggles "Show advanced"
  → Category re-renders including advanced blocks

Logic Target changes
  → palette.setLogicTarget(newTarget)
  → Palette re-renders: Map category appears/disappears based on target type

Blockly Mode exits
  → palette.destroy()
  → rightBerry.setBlocklyMode(false)
  → Right berry restores World Mode tabs
```

### Search implementation

The palette search leverages the existing `BlockRegistry.search(query, logicTarget)` method which does case-insensitive matching on block labels and keywords.

Search UX:
- Search bar is sticky at the top of the palette (always visible)
- Empty query: show full categorized list
- Non-empty query: show search results grouped by category
- Each result: block label + category tag + dependency indicator
- Selecting a result: same insert flow as tapping a block in a category

### Dependency prompt UX

When inserting a block whose required preset category is disabled:
1. Show a small inline prompt below the block item (not a modal)
2. Text: "Requires [Category] preset"
3. Button: "Enable" — calls `onEnablePreset(categoryId)`
4. If `onEnablePreset` is not wired (pre-Track 41), the button shows a tooltip: "Enable this preset in the Presets panel (left berry)"

### Right berry tab switching mechanism

The existing `RightBerryController` uses `EditorMode` for tabs. To support Blockly Mode:

Option A: Add a `setTabSet()` method that accepts a different set of tab definitions and rebuilds the tab bar.

Option B: Pre-render both World Mode and Blockly Mode tab sets, toggling visibility.

Recommendation: **Option A** — cleaner separation, no hidden DOM. The `setTabSet()` method:
1. Removes current tab bar + tab content containers
2. Creates new tab bar + content containers from the new tab definitions
3. Returns the new content containers for mounting palette content
4. Preserves the open/close state of the berry itself

### Mobile considerations

- Block items in palette: text label + small color-coded dot for block family (hat = yellow, action = blue, reporter = green)
- Touch targets: each block item row is ≥ 44px tall
- Category headers: ≥ 48px tall, with expand/collapse chevron
- Search bar: full-width input, ≥ 44px tall, with clear button
- Scroll: palette container uses `overflow-y: auto` with `-webkit-overflow-scrolling: touch`
- Gesture isolation: palette container uses `touch-action: pan-y` and `stopPropagation()` on touch events to prevent berry swipe conflicts

### Integration with existing systems

- **BlockRegistry** (Tracks 37-38): Primary data source for blocks. Already supports `getAllEntries()`, `getByCategory()`, `search()`, `getDependency()`.
- **BlocklyWorkspaceController** (Track 39): `insertBlock(blockType)` for placing blocks. `getBlockRegistry()` to access the registry.
- **blocklyMode state** (Track 39): `isBlocklyModeActive()`, `getCurrentLogicTarget()`, `onBlocklyModeChange()` for lifecycle coordination.
- **blocklyCockpit** (Track 39): Orchestrator that wires palette creation/destruction to mode enter/exit.
- **PresetSavedConfig** (Track 32): Checked to determine which preset categories are enabled (for dynamic category rendering).

### Risks and mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Right berry tab switching adds complexity to existing component | MEDIUM | Keep changes minimal — add one new method (`setTabSet`), don't restructure the berry |
| Preset enable action not fully wirable until Track 41 | LOW | Provide `onEnablePreset` callback; if not wired, show informational text directing user to left berry |
| Block count grows as presets are added | LOW | BlockRegistry search is efficient; v1 has ~50-80 blocks total |
| Palette scroll conflicts with berry swipe | MEDIUM | Use `touch-action: pan-y`, `stopPropagation()`, test on mobile |
