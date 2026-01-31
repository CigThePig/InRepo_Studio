# /src/editor — Local AGENTS.md

Purpose:
- Owns editor-only UI/state and the touch-first editing experience.

Owns:
- Editor application state (tool selection, panel state, current scene)
- Panels, inspectors, and editor-only orchestration
- Playtest entry/exit UX (bridge to runtime hot mode)

Does NOT own:
- Runtime game logic (use `/src/runtime`)
- Persistence mechanics (use `/src/storage`)
- GitHub auth/deploy (use `/src/deploy`)

Mobile-first rules:
- Touch targets ≥ 44×44px.
- Prefer bottom sheets over side panels.
- Avoid heavy re-render loops during paint; batch UI updates.

Verification:
- Edit operations auto-save to hot storage.
- Playtest runs without deploy and shows current edits.
