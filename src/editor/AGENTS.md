# /src/editor — Local AGENTS.md

Purpose:
- Owns editor-only UI/state and the touch-first editing experience.
- Manages the dual-mode editor architecture: **World Mode** and **Blockly Mode**.

Owns:
- Editor application state (tool selection, panel state, current scene, **editor mode**)
- Panels, inspectors, and editor-only orchestration
- Playtest entry/exit UX (bridge to runtime hot mode)
- **Editor mode state**: `editorMode` (World Mode vs Blockly Mode)
- **Top-bar universal dropdown**: map selector (World Mode) / Logic Target selector (Blockly Mode)
- **Berry shell containers** (left berry, right berry) and their mode-driven content switching
- **Blockly Mode layout orchestration** (cockpit: top bar + left berry + center workspace + right berry)

Does NOT own:
- Runtime game logic, SceneHost, PresetManager, ScriptHost (use `/src/runtime`)
- Persistence mechanics (use `/src/storage`)
- GitHub auth/deploy (use `/src/deploy`)
- Blockly block definitions or code generators (use `/src/runtime/blockly`)
- Preset definition schemas or runtime engine (use `/src/runtime/presets`)

Mobile-first rules:
- Touch targets ≥ 44×44px.
- Prefer bottom sheets over side panels; berry slide-outs for contextual panels.
- Avoid heavy re-render loops during paint; batch UI updates.

Dual-mode architecture rules:
- **World Mode**: Center = canvas/map viewport. Left berry = Presets + other tabs. Right berry = tile/entity palettes. Top-bar dropdown = map selector.
- **Blockly Mode**: Center = Blockly workspace (replaces canvas). Left berry = Presets (global, same content + "Insert block" actions). Right berry = blocks palette + inspect/errors tab. Top-bar dropdown = Logic Target selector (labeled "Logic Target: …").
- The top-bar dropdown is a **universal editing context selector** that changes meaning by mode.
- Mode switching must preserve state on both sides (map viewport state preserved when entering Blockly; workspace state preserved when returning to World).

Logic Target rules (Blockly Mode):
- v1 Logic Targets: `Game Logic (main)` and `Map: <mapName>` (per map).
- Default on entering Blockly Mode: current map's logic. If no map logic exists, prompt to create or switch to Game Logic.
- Switching Logic Targets swaps the workspace file and may update the right berry palette (Map targets get Map-specific blocks).

Navigation into Blockly Mode:
- Left berry → Logic tab → "Edit" button
- Presets → Blockly Hooks → "Open in Blockly"
- Direct mode toggle (top bar or equivalent)

Verification:
- Edit operations auto-save to hot storage.
- Playtest runs without deploy and shows current edits.
- Switching between World and Blockly Mode preserves state on both sides.
- Logic Target dropdown correctly labels scope and loads the right workspace file.
