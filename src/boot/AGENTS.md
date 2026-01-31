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

Local invariants:
- Boot stays thin: wiring only, no domain logic.
- Editor modules must not be imported or executed in game mode.
- Runtime must be able to boot without editor code present.

GitHub Pages constraints:
- Project sites run under `/<repo>/`; avoid hardcoded absolute paths.
- Preserve query params when routing (do not drop `?tool=editor`).

Verification:
- Manual: `/?tool=editor` enters editor and restores state.
- Manual: `/` boots game mode.
- Manual: both modes work on GitHub Pages URL.
