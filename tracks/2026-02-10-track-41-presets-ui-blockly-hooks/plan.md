# Track 41 — Presets UI + Blockly Hooks — Plan

## Recon Summary

**Files likely to change:**
- `/src/editor/panels/leftBerryTabs.ts` — add 'presets' tab ID and entry
- `/src/editor/panels/leftBerry.ts` — wire presets tab creation, accept PresetRegistry + config dependencies
- `/src/editor/blockly/blocklyCockpit.ts` — pass insertBlock callback to left berry presets tab
- `/src/storage/hot.ts` — add preset config storage operations (read/write PresetSavedConfig)

**New files (8):**
- `/src/editor/presets/index.ts` — public exports
- `/src/editor/presets/AGENTS.md` — module rules
- `/src/editor/presets/presetConfigStore.ts` — editor-side config read/write
- `/src/editor/presets/presetsTab.ts` — main presets tab (dashboard)
- `/src/editor/presets/categoryDetail.ts` — category detail screen (configure + hooks)
- `/src/editor/presets/knobEditor.ts` — per-type knob controls
- `/src/editor/presets/blocklyHooksTab.ts` — hooks list with insert block
- `/src/editor/presets/presetPicker.ts` — preset picker modal
- `/src/editor/presets/issuesModal.ts` — issues/conflicts modal
- `/src/editor/presets/undoToast.ts` — undo toast component

**Key modules involved:**
- `PresetRegistry` (src/runtime/presets/presetRegistry.ts) — provides definitions
- `PresetSavedConfig` / `presetDefaults.ts` — config shape + defaults
- `GAME_PROFILES` (src/runtime/presets/gameProfiles.ts) — profile recommendations
- `BlocklyWorkspaceController` — insertBlock for Blockly Mode bridge
- `blocklyMode` state — isBlocklyModeActive for conditional UI

**Invariants to respect:**
- Presets are global (not per Logic Target)
- PresetSavedConfig format matches /game/presets.json schema
- No data loss: auto-save config changes to hot storage
- Touch-first: targets >= 44px
- Editor/Runtime separation: presets tab manages config only, not runtime instances

**Cross-module side effects:**
- Left berry tab bar grows from 4 to 5 tabs (horizontal scroll handles this)
- Cockpit needs to wire insertBlock callback to left berry
- Hot storage gains a new data key for preset config

**Apply/Rebuild semantics:**
- Knob changes: live-applying (auto-save to hot storage)
- Profile switching: live-applying (applies recommended presets)
- Preset enable/disable: live-applying (updates config in hot storage)

**Data migration impact:** None — this creates a new config store, no existing data changes.

**File rules impact:** New module `src/editor/presets/` with ~8 files, all under 450 lines each.

**Risks:**
- Config shape drift between editor store and runtime PresetManager — mitigated by shared types
- Insert block callback wiring across panels — mitigated by simple function passing

**Verification commands:**
- `npx tsc --noEmit` — type checking
- `npm run build` — production build
- `npm run lint` — lint check

---

## Phase 1 — Preset Config Store + Left Berry Tab Integration

### Tasks

- [ ] Create `/src/editor/presets/AGENTS.md` with module rules
- [ ] Create `/src/editor/presets/index.ts` with public exports
- [ ] Create `/src/editor/presets/presetConfigStore.ts`:
  - Load/save PresetSavedConfig from hot storage
  - get/set config, profile switching, category enable/disable
  - Modification detection (compare knobs to schema defaults)
  - Conflict detection (read compatibility from definitions)
  - onChange subscription for UI updates
- [ ] Add preset config read/write operations to `/src/storage/hot.ts`
- [ ] Add `'presets'` to `LeftBerryTabId` in `/src/editor/panels/leftBerryTabs.ts`
- [ ] Add presets entry to `LEFT_BERRY_TABS` array
- [ ] Update `/src/editor/panels/leftBerry.ts` to accept PresetRegistry dependency and wire presets tab placeholder
- [ ] Update `/src/editor/presets/index.ts` exports

### Files touched
- `/src/editor/presets/AGENTS.md` (new)
- `/src/editor/presets/index.ts` (new)
- `/src/editor/presets/presetConfigStore.ts` (new)
- `/src/editor/panels/leftBerryTabs.ts` (modified)
- `/src/editor/panels/leftBerry.ts` (modified)
- `/src/storage/hot.ts` (modified)

### Verification
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run build` succeeds
- [ ] Left berry shows 5 tabs including "Presets"
- [ ] PresetConfigStore can load/save config round-trip
- [ ] Update `INDEX.md` with new files

### Stop point
Pause for review. Left berry has Presets tab (placeholder content). Config store functional.

---

## Phase 2 — Presets Dashboard + Undo Toast

### Tasks

- [ ] Create `/src/editor/presets/undoToast.ts`:
  - Render bottom-positioned dismissable toast
  - Auto-dismiss after 5s, "Undo" button calls revert callback
  - Only one toast at a time
- [ ] Create `/src/editor/presets/presetsTab.ts`:
  - Game Profile selector (Top-down / Platformer / Custom chips)
  - Status strip ("X categories enabled", warnings badge)
  - Category list: rows with icon, name, active preset label, status chip, chevron
  - Profile selection applies recommendations via configStore.setProfile() + undo toast
  - Category tap navigates to detail (emits event)
- [ ] Wire presetsTab into left berry (replace placeholder)
- [ ] Style all components mobile-first (dark theme matching left berry)

### Files touched
- `/src/editor/presets/undoToast.ts` (new)
- `/src/editor/presets/presetsTab.ts` (new)
- `/src/editor/panels/leftBerry.ts` (modified)
- `/src/editor/presets/index.ts` (modified)

### Verification
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run build` succeeds
- [ ] Dashboard renders profile selector and category list
- [ ] Selecting a profile updates category statuses with undo toast
- [ ] Category rows show correct status chips
- [ ] Touch targets >= 44px

### Stop point
Pause for review. Dashboard functional with profile selection and category list.

---

## Phase 3 — Category Detail (Configure + Knob Editor)

### Tasks

- [ ] Create `/src/editor/presets/knobEditor.ts`:
  - Render accordion groups (Basics expanded, Advanced collapsed)
  - Number knobs: range slider + numeric display (respects min/max/step)
  - Boolean knobs: toggle switch
  - Enum knobs: dropdown select
  - String knobs: text input
  - onChange callback per knob
- [ ] Create `/src/editor/presets/categoryDetail.ts`:
  - Back button + category name + status chip header
  - Configure / Blockly Hooks sub-tab selector
  - Configure content:
    - Enable/disable toggle
    - Current preset label (tappable -> opens picker)
    - Knob editor for current preset
    - "Reset to Defaults" footer action
  - Knob changes -> configStore.setKnobValue() + undo toast
  - Reset -> configStore.resetCategory() + undo toast
- [ ] Wire category detail into presetsTab navigation (drill-in / back)

### Files touched
- `/src/editor/presets/knobEditor.ts` (new)
- `/src/editor/presets/categoryDetail.ts` (new)
- `/src/editor/presets/presetsTab.ts` (modified — drill-in navigation)
- `/src/editor/presets/index.ts` (modified)

### Verification
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run build` succeeds
- [ ] Category detail renders with Configure sub-tab
- [ ] Knob editor renders controls for all knob types
- [ ] Knob changes persist with undo toast
- [ ] Reset to defaults works
- [ ] Enable/disable toggle updates config
- [ ] Back navigation returns to dashboard

### Stop point
Pause for review. Category detail with full knob editing functional.

---

## Phase 4 — Blockly Hooks Tab + Insert Block Bridge

### Tasks

- [ ] Create `/src/editor/presets/blocklyHooksTab.ts`:
  - Three collapsible sections: Events, Commands, State
  - Each item: label, description, expandable details
  - Events: show payload fields (name, type)
  - Commands: show args (name, type, default)
  - State: show type indicator
  - "Insert block" button per item (visible only when insertBlock callback provided)
  - Block type ID resolution: events -> `inrepo_when_<eventId>`, commands -> `inrepo_do_<commandId>`, state -> `inrepo_get_<stateId>`
- [ ] Wire blocklyHooksTab into categoryDetail as second sub-tab
- [ ] Update `/src/editor/blockly/blocklyCockpit.ts`:
  - On Blockly Mode enter: pass insertBlock callback to left berry Presets tab
  - On Blockly Mode exit: clear the callback
- [ ] Update `/src/editor/panels/leftBerry.ts`:
  - Accept `setInsertBlockFn` method on LeftBerryController
  - Forward to presets tab controller

### Files touched
- `/src/editor/presets/blocklyHooksTab.ts` (new)
- `/src/editor/presets/categoryDetail.ts` (modified — wire hooks sub-tab)
- `/src/editor/blockly/blocklyCockpit.ts` (modified)
- `/src/editor/panels/leftBerry.ts` (modified)
- `/src/editor/presets/index.ts` (modified)

### Verification
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run build` succeeds
- [ ] Blockly Hooks tab renders events/commands/state from schema
- [ ] "Insert block" buttons appear only in Blockly Mode
- [ ] Tapping "Insert block" inserts the correct block type into workspace
- [ ] Expanding items shows payload/args/type details

### Stop point
Pause for review. Full Blockly Hooks tab with insert block bridge working.

---

## Phase 5 — Preset Picker + Issues Modal + Polish

### Tasks

- [ ] Create `/src/editor/presets/presetPicker.ts`:
  - Modal overlay with close button
  - List of available presets for category from registry
  - Each card: label, description, tags, recommended profile indicator
  - Compatibility warning if conflicts with other enabled presets
  - Selecting fires callback -> configStore.enableCategory() + undo toast
- [ ] Create `/src/editor/presets/issuesModal.ts`:
  - Modal overlay listing all issues
  - Conflict items: show both conflicting presets + suggestion
  - Missing items: show preset ID not found
  - Tap jumps to category detail
- [ ] Wire preset picker into category detail (tap on preset label)
- [ ] Wire issues modal into dashboard (tap on warnings badge)
- [ ] Polish pass: ensure all styles consistent, scrolling smooth, no gesture conflicts
- [ ] Update `INDEX.md` with all new files
- [ ] Update `schema-registry.md` with PresetConfigStore lists-of-truth
- [ ] Final verification: `npx tsc --noEmit`, `npm run build`, `npm run lint`

### Files touched
- `/src/editor/presets/presetPicker.ts` (new)
- `/src/editor/presets/issuesModal.ts` (new)
- `/src/editor/presets/categoryDetail.ts` (modified — wire picker)
- `/src/editor/presets/presetsTab.ts` (modified — wire issues modal)
- `/INDEX.md` (modified)
- `/context/schema-registry.md` (modified)

### Verification
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run build` succeeds
- [ ] `npm run lint` passes
- [ ] Preset picker shows available presets with compatibility info
- [ ] Issues modal shows conflicts/missing
- [ ] Navigation between all screens works
- [ ] All touch targets >= 44px
- [ ] Scrolling smooth on mobile (no gesture conflicts with berry swipe)
- [ ] INDEX.md includes all new files
- [ ] schema-registry.md updated

### Stop point
Track 41 complete. Full Presets UI with all 4 screens, Blockly Hooks bridge, and config persistence.
