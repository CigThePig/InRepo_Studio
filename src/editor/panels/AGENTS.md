# /src/editor/panels — Local AGENTS.md

Purpose:
- Owns editor panels (toolbar, tile picker, inspector, settings, deploy).
- Owns **berry panel containers** (left berry, right berry) and their mode-driven content.

Owns:
- Mobile layout patterns (bottom sheets, safe areas, berry slide-outs)
- Form models driven by canonical schemas
- Deploy panel UX (token entry, warnings, status feedback)
- **Left berry content**: Presets tab (dashboard, category detail with Configure + Blockly Hooks sub-tabs, preset picker, issues modal), asset library tabs (future)
- **Right berry content**: World Mode = tile/entity palettes; Blockly Mode = blocks palette + inspect/errors tab
- **Top bar**: global actions (Undo, Redo, Settings, Test/Play) and the universal dropdown (map selector / Logic Target selector)
- **Bottom interaction strip**: contextual selection actions (replaces floating selection bars per Editor V2)

Does NOT own:
- Low-level storage implementations (use `/src/storage`)
- GitHub API calls (use `/src/deploy`)
- Blockly workspace rendering (use `/src/editor/blockly`)
- Preset runtime engine or definitions (use `/src/runtime/presets`)
- Block definitions or code generators (use `/src/runtime/blockly`)

Local invariants:
- Panels must not mutate persistence directly; call domain/storage APIs.
- Long lists (tiles/assets/blocks) should be virtualized or paged when needed.
- Token UX must encourage fine-grained, repo-scoped PATs.
- **Berry content must switch based on editor mode** (World vs Blockly). Do not hard-wire a single mode's content.
- **Presets UI is schema-driven**: rendering is driven entirely by PresetDefinition schema + persisted state (`/game/presets.json`). No manual block/hook lists.

Presets UI screens (left berry):
1. **Dashboard** — Game Profile selector, status strip, category list with status chips.
2. **Category Detail** — Configure tab (enable/picker/options/reset) + Blockly Hooks tab (events/commands/state from schema). In Blockly Mode, hooks gain "Insert block" action buttons.
3. **Preset Picker** — search + preset cards with compatibility info.
4. **Issues modal** — conflicts/missing/newer warnings with drill-in links.

Right berry palette (Blockly Mode):
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
