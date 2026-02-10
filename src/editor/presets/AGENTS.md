# AGENTS.md — /src/editor/presets/

This module owns the **Presets tab** in the left berry — the editor-side UI for managing game-wide preset systems.

## Module rules

1. **Editor-only**: This module manages preset *configuration*, not runtime instances. It reads/writes `PresetSavedConfig` to hot storage. The runtime `PresetManager` (in `src/runtime/presets/`) consumes this config at playtest time.

2. **Schema-driven rendering**: All knob editors, hook lists, and category details are generated from `PresetDefinition` schemas via `PresetRegistry`. No hardcoded UI per preset.

3. **Shared types only**: Import preset types from `@/types/preset` and `@/types/presetDefaults`. Import `PresetRegistry` from `@/runtime/presets/presetRegistry`. Never duplicate type definitions.

4. **No runtime imports**: Do not import `PresetManager`, `PresetInstance`, or `PresetFactory`. Those are runtime concerns.

5. **Screen navigation**: The Presets tab uses DOM swapping for screen navigation (dashboard -> detail -> picker). No router.

6. **Mobile-first**: All touch targets >= 44px. Dark theme matching left berry palette (`#0d1220` background).

7. **File size**: Keep all files under 450 lines.

## Key files

- `presetConfigStore.ts` — Editor-side config read/write (hot storage)
- `presetsTab.ts` — Main dashboard (Screen 1)
- `categoryDetail.ts` — Category detail with Configure + Hooks sub-tabs (Screen 2)
- `knobEditor.ts` — Per-type knob controls (number/boolean/enum/string)
- `blocklyHooksTab.ts` — Events/Commands/State list with Insert block action
- `presetPicker.ts` — Preset picker modal (Screen 3)
- `issuesModal.ts` — Issues/conflicts modal (Screen 4)
- `undoToast.ts` — Undo toast component
- `index.ts` — Public exports
