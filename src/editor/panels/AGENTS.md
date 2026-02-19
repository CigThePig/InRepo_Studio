# /src/editor/panels — Local AGENTS.md

Purpose:
- Owns editor panels (toolbar, tile picker, inspector, settings, deploy).
- Owns **berry panel containers** (left berry, right berry) and their mode-driven content switching.

Owns:
- Mobile layout patterns (bottom sheets, safe areas, berry slide-outs)
- Form models driven by canonical schemas
- Deploy panel UX (token entry, warnings, status feedback)
- **Left berry shell + tab routing**: loads tab content from `/src/editor/presets/` (Presets tab) and asset tabs
- **Right berry shell + tab routing**: World Mode = tile/entity palettes; Blockly Mode = blocks palette + inspect/errors tab
- **Top bar** (`topBarV2.ts`): global actions (Undo, Redo, Settings, Test/Play) and the universal dropdown (map selector / Logic Target selector)
- **Bottom interaction strip**: contextual selection actions (replaces floating selection bars per editor architecture)
- **Animation State Machine editor** (`animStateMachine.ts`): visual SM editor UI in the left berry animation tab
- **SM Simulator** (`smSimulator.ts`): pure TypeScript state machine simulator for SM editor "Simulate" mode (no Phaser, no DOM side effects)

Does NOT own:
- Low-level storage implementations (use `/src/storage`)
- GitHub API calls (use `/src/deploy`)
- Blockly workspace rendering (use `/src/editor/blockly`)
- Preset runtime engine or definitions (use `/src/runtime/presets`)
- Block definitions or code generators (use `/src/runtime/blockly`)
- **Presets tab UI content**: dashboard, category detail, knob editor, hooks tab, picker, issues modal — those live in `/src/editor/presets/`

Local invariants:
- Panels must not mutate persistence directly; call domain/storage APIs.
- Long lists (tiles/assets/blocks) should be virtualized or paged when needed.
- Token UX must encourage fine-grained, repo-scoped PATs.
- **Berry content must switch based on editor mode** (World vs Blockly). Do not hard-wire a single mode's content.
- **Presets UI is schema-driven**: rendering is driven entirely by PresetDefinition schema + persisted state (`/game/presets.json`). No manual block/hook lists.

Presets UI screens (left berry — implemented in `/src/editor/presets/`):
1. **Dashboard** — Game Profile selector, status strip, category list with status chips.
2. **Category Detail** — Configure tab (enable/picker/options/reset) + Blockly Hooks tab (events/commands/state from schema). In Blockly Mode, hooks gain "Insert block" action buttons.
3. **Preset Picker** — search + preset cards with compatibility info.
4. **Issues modal** — conflicts/missing/newer warnings with drill-in links.

Right berry palette (Blockly Mode — blocks palette lives in `/src/editor/blockly/`):
- Tab 1: Blocks Palette — scrollable categorized list with search bar at top. Categories: Events, Controls, Movement, Camera, Animation, Logic, Math, Variables, Time, Debug. Map targets add a Map category.
- Tab 2: Inspect/Errors — script status, last error with block highlight, active timer count, recent logs.
- Search searches across all visible categories for the current Logic Target.
- If a category's preset is disabled, show placeholder with "Enable preset" button.

Verification:
- Panels remain usable in portrait mode.
- Inspector edits apply to selected entity and persist in hot storage.
- Berry content switches correctly between World and Blockly modes.
- Presets dashboard renders from schema + saved state, not hardcoded layouts.
- "Insert block" in Blockly Hooks places block in current workspace.
