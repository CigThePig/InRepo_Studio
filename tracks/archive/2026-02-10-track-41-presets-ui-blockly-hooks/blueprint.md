# Track 41 — Presets UI + Blockly Hooks — Blueprint

## Technical Design

### Architecture overview

Track 41 adds the **Presets** tab to the left berry, providing a full UI for managing game-wide preset systems. The UI is schema-driven: it reads `PresetDefinition` schemas from the `PresetRegistry` to render knob editors, hook lists, and category details. Config changes are persisted to hot storage as `PresetSavedConfig` (matching the `/game/presets.json` format).

The left berry currently has 4 tabs (Sprites, Animation, Assets, Tools). We add "Presets" as a 5th tab. The left berry's `LeftBerryTabId` union and `LEFT_BERRY_TABS` array are extended to include `'presets'`.

In Blockly Mode, the Presets tab gains the "Insert block" capability on Blockly Hooks items. This requires a callback from the cockpit that provides access to the workspace's `insertBlock()` method.

### Key design decisions

1. **Schema-driven rendering**: All knob editors, hook lists, and category details are generated from `PresetDefinition` schemas via `PresetRegistry`. No hardcoded UI per preset.

2. **Editor-side config manager (not runtime PresetManager)**: This track creates an editor-side `PresetConfigStore` that reads/writes `PresetSavedConfig` to hot storage. The runtime `PresetManager` (Track 34) consumes this config at playtest time. The editor config store is a lighter abstraction: read config, write config, get defaults, detect modifications.

3. **Screen navigation via DOM swapping**: The Presets tab uses a single container with screen-level DOM swapping (dashboard → detail → picker). No router needed. Each screen is a factory function that renders into a container and returns a controller.

4. **Undo toast pattern**: Before each config mutation, snapshot the previous `PresetSavedConfig`. Show a toast with "Undo" button. Tapping Undo writes the snapshot back. Only one active toast at a time (new change replaces previous toast).

5. **Insert block bridge**: The cockpit passes an `insertBlock(blockType: string): void` callback to the left berry Presets tab when Blockly Mode is active. When Blockly Mode is inactive, the callback is null and "Insert block" buttons are hidden.

### State model

```
presetConfigStore = {
  config: PresetSavedConfig,        // Current config (from hot storage)
  isDirty: boolean,                  // Whether config has unsaved changes
  undoSnapshot: PresetSavedConfig | null,  // For Undo toast
}

presetsTabState = {
  currentScreen: 'dashboard' | 'detail' | 'picker' | 'issues',
  selectedCategoryId: PresetCategoryId | null,
  detailSubTab: 'configure' | 'hooks',
}
```

State is local to the Presets tab (not persisted to editor state). Config is persisted to hot storage.

### Files touched / created

#### New files

1. **`/src/editor/presets/presetsTab.ts`** — Main Presets tab component (Screen 1: Dashboard)
   - `createPresetsTab(container, deps): PresetsTabController`
   - Dependencies: PresetRegistry, PresetConfigStore, insertBlock callback
   - Renders dashboard: profile selector, status strip, category list
   - Returns controller: `refresh()`, `setInsertBlockFn(fn)`, `destroy()`

2. **`/src/editor/presets/presetConfigStore.ts`** — Editor-side config read/write
   - `createPresetConfigStore(registry): PresetConfigStore`
   - Loads `PresetSavedConfig` from hot storage, provides get/set/reset
   - Handles default config creation, modification detection
   - Persists changes to IndexedDB

3. **`/src/editor/presets/categoryDetail.ts`** — Screen 2: Category Detail
   - `createCategoryDetail(container, deps): CategoryDetailController`
   - Renders Configure + Blockly Hooks sub-tabs
   - Configure: enable toggle, preset label, knob accordion
   - Blockly Hooks: events/commands/state list with Insert block action
   - Returns controller with `destroy()`, `refresh()`

4. **`/src/editor/presets/knobEditor.ts`** — Knob UI rendering
   - `renderKnobEditor(container, knobs, currentValues, onChange)`
   - Renders accordion groups (Basics, Advanced)
   - Per-type controls: number slider, boolean toggle, enum dropdown, string input
   - Validates against constraints

5. **`/src/editor/presets/blocklyHooksTab.ts`** — Blockly Hooks sub-tab
   - `createBlocklyHooksTab(container, deps): BlocklyHooksController`
   - Renders events, commands, state sections from PresetDefinition schema
   - Shows "Insert block" button when insertBlock callback is available
   - Returns controller with `setInsertBlockFn()`, `destroy()`

6. **`/src/editor/presets/presetPicker.ts`** — Screen 3: Preset Picker modal
   - `showPresetPicker(container, deps): PresetPickerController`
   - Renders available presets for a category as cards
   - Shows compatibility warnings, recommended profile tags
   - Selecting fires onChange callback

7. **`/src/editor/presets/issuesModal.ts`** — Screen 4: Issues modal
   - `showIssuesModal(container, deps): IssuesModalController`
   - Lists conflicts, missing presets, newer versions
   - Tap jumps to category detail

8. **`/src/editor/presets/undoToast.ts`** — Undo toast component
   - `showUndoToast(message, onUndo, duration?): void`
   - Renders a dismissable toast with undo action
   - Auto-dismiss after 5 seconds

9. **`/src/editor/presets/index.ts`** — Public exports

10. **`/src/editor/presets/AGENTS.md`** — Module rules

#### Modified files

11. **`/src/editor/panels/leftBerryTabs.ts`** — Add `'presets'` to `LeftBerryTabId` and `LEFT_BERRY_TABS`

12. **`/src/editor/panels/leftBerry.ts`** — Wire Presets tab creation when 'presets' tab content container is available. Add config for PresetRegistry dependency.

13. **`/src/editor/blockly/blocklyCockpit.ts`** — Pass `insertBlock` callback to left berry Presets tab when Blockly Mode enters. Clear it on exit.

14. **`/src/editor/blockly/index.ts`** — Update exports if needed

15. **`/src/storage/hot.ts`** — Add `presetConfig` field to hot storage operations (read/write `PresetSavedConfig`). Or use a dedicated store key.

### APIs and interfaces

```typescript
// presetConfigStore.ts
interface PresetConfigStore {
  getConfig(): PresetSavedConfig;
  getCategoryConfig(categoryId: PresetCategoryId): PresetCategoryConfig;
  setProfile(profile: GameProfile): PresetSavedConfig;   // Returns new config
  enableCategory(categoryId: PresetCategoryId, presetId: string): void;
  disableCategory(categoryId: PresetCategoryId): void;
  setKnobValue(categoryId: PresetCategoryId, knobId: string, value: unknown): void;
  resetCategory(categoryId: PresetCategoryId): void;
  isModified(categoryId: PresetCategoryId): boolean;
  getConflicts(): PresetConflict[];
  save(): Promise<void>;
  load(): Promise<void>;
  onChange(callback: () => void): () => void;             // Returns unsubscribe
}

// presetsTab.ts
interface PresetsTabController {
  refresh(): void;
  setInsertBlockFn(fn: ((blockType: string) => void) | null): void;
  destroy(): void;
}

interface PresetsTabDeps {
  registry: PresetRegistry;
  configStore: PresetConfigStore;
  insertBlock?: ((blockType: string) => void) | null;
  isBlocklyMode: () => boolean;
}

// categoryDetail.ts
interface CategoryDetailController {
  refresh(): void;
  setInsertBlockFn(fn: ((blockType: string) => void) | null): void;
  destroy(): void;
}

// knobEditor.ts
interface KnobEditorCallbacks {
  onChange(knobId: string, value: unknown): void;
  onReset(): void;
}

// blocklyHooksTab.ts
interface BlocklyHooksController {
  setInsertBlockFn(fn: ((blockType: string) => void) | null): void;
  refresh(): void;
  destroy(): void;
}
```

### Data flow

```
User opens left berry Presets tab
  -> presetsTab reads PresetRegistry for category definitions
  -> presetsTab reads PresetConfigStore for current config
  -> Dashboard renders: profile chips, category rows with status

User taps Profile chip (e.g., "Top-down")
  -> configStore.setProfile('topdown')
  -> Applies recommended presets from GAME_PROFILES
  -> showUndoToast("Applied Top-down profile. Undo?", revertFn)
  -> Dashboard re-renders with updated status

User taps Category row (e.g., "Controls")
  -> Navigate to Category Detail screen
  -> Configure sub-tab shows: enable toggle, "Top-down Controls" label, knobs
  -> Blockly Hooks sub-tab shows: events/commands/state from definition

User changes a knob value
  -> knobEditor calls onChange(knobId, value)
  -> configStore.setKnobValue(categoryId, knobId, value)
  -> configStore.save() persists to hot storage
  -> showUndoToast("Changes applied. Undo?", revertFn)

User taps "Insert block" on a hook (Blockly Mode only)
  -> insertBlock(blockType) called on workspace controller
  -> Block appears in workspace

User taps Preset label to change preset
  -> showPresetPicker for category
  -> User selects different preset
  -> configStore.enableCategory(categoryId, newPresetId)
  -> showUndoToast("Switched to [preset]. Undo?", revertFn)
  -> Category Detail re-renders with new preset's knobs/hooks
```

### Preset config storage

The `PresetSavedConfig` is stored in IndexedDB under a dedicated key in the existing project hot storage. The shape matches `/game/presets.json`:

```json
{
  "formatVersion": 1,
  "profile": "topdown",
  "categories": {
    "controls": {
      "enabled": true,
      "presetId": "controls-topdown",
      "knobs": { "moveSpeed": 200, "diagonalEnabled": true }
    }
  }
}
```

On first load, if no config exists, `createDefaultPresetConfig()` (from `src/types/presetDefaults.ts`) creates a blank config. Profile selection applies recommended presets from `GAME_PROFILES`.

### Screen navigation

The Presets tab uses a simple stack-based screen model:

- **Dashboard** is the root screen (always mounted)
- **Category Detail** replaces dashboard content when drilling in
- **Preset Picker** renders as an overlay/modal on top of detail
- **Issues modal** renders as an overlay on top of dashboard

Back navigation: Detail -> Dashboard via back button. Picker/Issues dismiss via close/overlay tap.

### Knob editor implementation

Each knob type maps to a specific control:

| KnobType | Control | Validation |
|----------|---------|------------|
| `number` | Range slider + numeric input | min/max/step from constraints |
| `boolean` | Toggle switch | none |
| `enum` | Dropdown select | options from constraints.options |
| `string` | Text input | minLength/maxLength if present |

Controls are grouped by `knob.group` field (Basics, Advanced, Debug). Basics group is expanded by default. Advanced is collapsed. Knobs with `advanced: true` appear in the Advanced group regardless of their `group` field.

### Blockly Hooks rendering

Each section (Events, Commands, State) renders items from the `PresetDefinition` schema:

**Event items:**
- Label (e.g., "When Direction Changes")
- Description
- Expandable: payload fields (name, type)
- [Insert block] button (Blockly Mode only) -> inserts hat block `inrepo_when_<eventId>`

**Command items:**
- Label (e.g., "Set Controls Option")
- Description
- Expandable: args (name, type, default)
- [Insert block] button -> inserts action block `inrepo_do_<commandId>`

**State items:**
- Label (e.g., "Move X")
- Description, type indicator
- [Insert block] button -> inserts reporter block `inrepo_get_<stateId>`

Block type IDs follow the naming convention from Track 37 schema-driven generation.

### Mobile considerations

- All touch targets >= 44px
- Profile chips: 44px height, horizontal scroll if needed
- Category rows: 56px minimum height
- Knob controls: slider tracks 44px height, toggle switches 44px
- Accordion sections: header 48px, content padding 16px
- Undo toast: 56px height, bottom-positioned, swipe-to-dismiss optional
- Scroll: tab content uses overflow-y auto with momentum scrolling

### Integration with existing systems

- **PresetRegistry** (Track 34): Provides `getById()`, `getByCategory()`, `getAllDefinitions()`. Used to populate category list, knob editors, hooks lists.
- **PresetSavedConfig / presetDefaults** (Track 32): Config shape and default factories.
- **GAME_PROFILES** (Track 34): Profile definitions with recommended preset selections.
- **BlocklyWorkspaceController** (Track 39): `insertBlock(blockType)` for placing blocks from hooks.
- **blocklyMode state** (Track 39): `isBlocklyModeActive()` to show/hide Insert block buttons.
- **blocklyCockpit** (Track 39-40): Passes insertBlock callback to left berry when entering Blockly Mode.
- **Hot storage** (Track 2): Persistence for PresetSavedConfig.

### Category status chips

| Status | Condition | Visual |
|--------|-----------|--------|
| Off | category not enabled | gray chip |
| Default | enabled, no knob overrides | blue chip |
| Modified | enabled, knobs differ from defaults | yellow chip |
| Conflict | enabled, conflicts with another enabled preset | red chip with warning |
| Missing | enabled but preset ID not found in registry | red chip with warning |

### Risks and mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Left berry tab count (5 tabs) may crowd mobile | LOW | Tab bar already scrolls horizontally; test on narrow screens |
| Preset config format mismatch with runtime | MEDIUM | Use shared types from `src/types/preset.ts` and `presetDefaults.ts` |
| Insert block needs workspace access across panels | MEDIUM | Pass callback through cockpit; null when not in Blockly Mode |
| Knob editor complexity for all types | MEDIUM | Start with number+boolean, add enum+string; each is a small function |
| Undo toast state management | LOW | Single snapshot per mutation; new mutation replaces old snapshot |
| File count (8 new files) | LOW | Each file is focused and small; module boundary is clean |
