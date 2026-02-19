# Track 40 — Right Berry Blocks Palette

## Intent

Implement the blocks palette in the right berry for Blockly Mode. When the editor is in Blockly Mode, the right berry transforms from its World Mode tabs (Ground, Props, Entities, etc.) into Blockly-specific tabs, with the primary tab being a categorized, searchable block palette. Users browse block categories, search for blocks, and insert them into the workspace via tap or drag — all on a mobile-first interface.

Authority: `/context/Blockly_Plan_Revised.md` Part 13 (Block Taxonomy + Palette UX).

## Scope

### In scope

1. **Blockly Mode right berry tabs** — when Blockly Mode is active, the right berry shows Blockly-specific tabs instead of World Mode tabs. Tab 1: "Blocks" (palette). Tab 2: placeholder for Inspect/Errors (Track 42).
2. **Categorized block palette** — scrollable list of block categories matching the v1 spec: Events, Controls, Movement, Camera, Animation, Logic, Math, Variables, Time, Debug (+ Map for map targets).
3. **Category content** — each category section is collapsible, showing blocks from the BlockRegistry grouped by category. Preset-driven categories reflect enabled presets.
4. **Search** — search bar at the top of the palette, searching across all visible categories by block label + keywords. Results grouped by category.
5. **Dynamic categories (preset-driven)** — Controls, Movement, Camera, Animation categories show blocks from enabled presets. When a preset category is disabled, show a placeholder: "Enable [Category] preset to use these blocks" with an Enable button.
6. **Logic Target filtering** — Map category blocks only appear when a Map Logic target is selected. Game Logic target does not show Map blocks. Uses `logicTargetFilter` from BlockPackEntry.
7. **Block insertion** — tapping a block in the palette calls `workspace.insertBlock(blockType)` to place it in the workspace.
8. **Beginner/Advanced split** — each preset-based category has Common blocks (default visible) and Advanced blocks (behind "Show advanced" toggle).
9. **Dependency prompts** — if a block requires a disabled preset, show "This block requires [Category] preset. Enable it?" prompt before insertion.

### Out of scope

- Left berry Presets UI + "Insert block" from Blockly Hooks (Track 41)
- Inspect/Errors panel content (Track 42 — only a placeholder tab is added here)
- Drag-to-insert from palette (v1 uses tap-to-insert; drag is a stretch goal)
- "Start here" templates (v1 optional, not required)
- Block preview/tooltip on long-press (future polish)

## Acceptance criteria

- [ ] When Blockly Mode is active, right berry shows Blockly-specific tabs (Blocks + Inspect placeholder)
- [ ] When World Mode is active, right berry shows normal World Mode tabs (unchanged)
- [ ] Blocks palette shows categorized block list matching v1 categories
- [ ] Events category shows core event hat blocks
- [ ] Preset-driven categories (Controls, Movement, Camera, Animation) show schema-generated blocks when enabled
- [ ] Disabled preset categories show placeholder with Enable action
- [ ] Logic, Math, Variables, Time, Debug categories always show their blocks
- [ ] Map category only appears when Map Logic target is selected
- [ ] Search bar filters blocks across all visible categories
- [ ] Search matches block labels and keywords
- [ ] Tapping a block inserts it into the Blockly workspace
- [ ] Advanced blocks are hidden by default, shown via per-category toggle
- [ ] Dependency prompt appears when inserting a block that requires a disabled preset
- [ ] Touch targets are >= 44x44px for block items
- [ ] Palette scrolls smoothly on mobile
- [ ] No gesture conflicts between palette scrolling and berry slide-out
- [ ] `tsc --noEmit` passes
- [ ] `npm run build` succeeds
- [ ] `INDEX.md` updated with new files
- [ ] `schema-registry.md` updated if new lists-of-truth added

## Risks

- **Right berry tab switching complexity** — swapping between World Mode and Blockly Mode tabs requires coordination with `blocklyMode` state. The existing right berry uses `EditorMode` for tabs; Blockly tabs are a different concept (MEDIUM)
- **Preset enable action wiring** — the "Enable preset" action from the palette needs to invoke the PresetManager or equivalent editor-side preset config. In v1, this may need to stub out or defer to Track 41 (LOW)
- **Search performance with many blocks** — the BlockRegistry search is already implemented with case-insensitive matching. Should be fine for v1 block count (LOW)
- **Gesture isolation** — palette scroll must not conflict with berry swipe gesture or workspace pan. Need `stopPropagation` on palette scroll container (MEDIUM)
