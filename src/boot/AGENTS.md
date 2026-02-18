# /src/boot — Local AGENTS.md

Purpose:
- Owns mode detection and routing (editor vs game).
- Keeps entry wiring minimal and safe for GitHub Pages.

Owns:
- Query parsing (`/?tool=editor`)
- Mode routing and boot sequence selection
- Base-path correctness for GitHub Pages (`/<repo>/`)

Does NOT own:
- Editor tools, panels, or canvas logic
- Runtime scene/entity logic
- Storage implementations (use `/src/storage` APIs)
- Blockly workspace rendering or script execution

Local invariants:
- Boot stays thin: wiring only, no domain logic.
- Editor modules must not be imported or executed in game mode.
- Runtime must be able to boot without editor code present.

GitHub Pages constraints:
- Project sites run under `/<repo>/`; avoid hardcoded absolute paths.
- Preserve query params when routing (do not drop `?tool=editor`).

Dual-mode editor awareness:
- The editor has two internal modes: **World Mode** (map editing) and **Blockly Mode** (script editing).
- Boot does NOT own mode switching between World/Blockly — that is editor-internal state (see `/src/editor`).
- Boot only routes between "editor" and "game" at the top level.
- Game mode must initialize the runtime with SceneHost attachment, which handles both PresetManager and ScriptHost for running user logic (see `/src/runtime`).

Verification:
- Manual: `/?tool=editor` enters editor and restores state.
- Manual: `/` boots game mode.
- Manual: both modes work on GitHub Pages URL.
- Manual: game mode loads and runs logic scripts (`/game/logic/main.json`, map scripts) if they exist.
