# /src/runtime — Local AGENTS.md

Purpose:
- Owns game/runtime loading and play mode behavior.

Owns:
- Loading project/scene from hot or cold sources
- Instantiating tilemaps and entities in the engine layer
- Scene transitions

Does NOT own:
- Editor panels/tools/canvas
- GitHub deploy/auth logic

Local invariants:
- Runtime must work if the editor folder is deleted.
- Runtime must never import editor modules.
- Data source selection must be explicit (hot for playtest, cold for public).

Verification:
- Public mode loads from `/game/*` and plays.
- Playtest mode loads from hot storage and reflects current edits.
