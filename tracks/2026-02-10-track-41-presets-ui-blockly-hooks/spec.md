# Track 41 — Presets UI + Blockly Hooks

## Intent

Implement the Presets tab in the left berry with a full mobile-first dashboard for managing game-wide preset systems. The tab provides four screens: Presets Dashboard (category overview + Game Profile selector), Category Detail (Configure + Blockly Hooks sub-tabs), Preset Picker (modal for switching preset implementations), and an Issues modal (conflict/missing/newer display). When in Blockly Mode, the Blockly Hooks sub-tab gains an "Insert block" action that places the corresponding block into the current Logic Target's workspace.

Authority: `/context/Blockly_Plan_Revised.md` Part 8 (Presets UI plan).

## Scope

### In scope

1. **Left berry "Presets" tab** — a new tab in the left berry (alongside Sprites, Animation, Assets, Tools) that hosts the Presets dashboard. Available in both World Mode and Blockly Mode.
2. **Presets Dashboard (Screen 1)** — Game Profile selector (Top-down / Platformer / Custom chips), status strip ("X categories enabled"), category list with status chips (Off, Default, Modified, Conflict, Missing), drill-in navigation.
3. **Category Detail (Screen 2)** — drill-in view with back navigation. Two sub-tabs:
   - **Configure** — enable toggle, preset picker button, knob editor (accordion groups: Basics open, Advanced closed), auto-apply with Undo toast.
   - **Blockly Hooks** — scrollable list of Events, Commands, State from the preset schema. Each item shows label + description + expandable details (args, payload fields, type). In Blockly Mode, each row gains an "Insert block" button.
4. **Preset Picker (Screen 3)** — modal showing available presets for the current category. Cards with label, description, tags, recommended profile indicator, compatibility warning. Selecting switches immediately with Undo toast.
5. **Issues modal (Screen 4)** — lists all conflicts/missing/newer issues. Tap jumps to relevant category detail.
6. **"Insert block" bridge** — in Blockly Mode, tapping "Insert block" on a Blockly Hooks row calls `workspace.insertBlock(blockType)` on the current workspace. This bridges left berry Presets with the right berry's blocks palette.
7. **Auto-apply + Undo toast** — knob changes apply immediately to `PresetSavedConfig` in hot storage. A toast "Changes applied. Undo?" appears for 5s; tapping Undo reverts to previous config.
8. **Preset config persistence** — read/write `/game/presets.json` via hot storage. Create default config on first access.

### Out of scope

- Inspect/Errors panel (Track 42)
- Actual runtime PresetManager instantiation in playtest (already done in Track 34-35; this track only manages config data)
- Drag-to-insert blocks from Presets panel (tap-to-insert only in v1)
- Per-entity preset overrides (future)
- "Start here" block templates (v1 optional, not required)

## Acceptance criteria

- [ ] Left berry shows a "Presets" tab alongside existing tabs
- [ ] Presets Dashboard shows Game Profile selector with Top-down/Platformer/Custom chips
- [ ] Selecting a profile applies recommended preset selections with Undo toast
- [ ] Category list shows all v1 categories (Controls, Movement, Camera, Animation) with status chips
- [ ] Tapping a category row drills into Category Detail
- [ ] Category Detail shows Configure and Blockly Hooks sub-tabs
- [ ] Configure tab shows enable toggle, current preset label, and knob editor
- [ ] Knob editor renders controls based on knob type (number slider, boolean toggle, enum dropdown, string input)
- [ ] Knob changes auto-apply with Undo toast
- [ ] "Reset to Defaults" restores all knobs to schema defaults
- [ ] Blockly Hooks tab shows Events, Commands, State sections from schema
- [ ] Each hook item shows label, description, and expandable details
- [ ] In Blockly Mode, each hook row shows "Insert block" button
- [ ] Tapping "Insert block" inserts the corresponding block into the workspace
- [ ] Preset Picker modal shows available presets for the category
- [ ] Selecting a preset switches immediately with Undo toast
- [ ] Compatibility warnings shown when switching to a conflicting preset
- [ ] Issues modal lists all conflicts/missing/newer issues
- [ ] Preset config persists to hot storage (IndexedDB)
- [ ] Touch targets >= 44x44px throughout
- [ ] Left berry scrolls smoothly on mobile
- [ ] `tsc --noEmit` passes
- [ ] `npm run build` succeeds
- [ ] `INDEX.md` updated with new files
- [ ] `schema-registry.md` updated with new lists-of-truth

## Risks

- **Left berry tab count growing** — adding "Presets" as a 5th tab may make the tab bar scroll on small screens. The existing tab bar already supports horizontal scrolling, so this should be fine but needs testing (LOW)
- **Preset config hot storage wiring** — Track 34 defined `PresetSavedConfig` and `PresetManager` for runtime. This track needs editor-side read/write of the same config format. Must ensure the config shape matches exactly (MEDIUM)
- **Insert block requires workspace reference** — the "Insert block" action in the left berry needs access to the Blockly workspace controller, which lives in the cockpit. Wiring this through the left berry requires a callback dependency (MEDIUM)
- **Undo toast complexity** — maintaining previous config state for undo requires careful state management. Keep it simple: snapshot before each change, restore on undo (LOW)
- **Knob editor for all types** — must handle number (slider), boolean (toggle), string (input), enum (dropdown). Each needs validators matching the schema constraints (MEDIUM)
