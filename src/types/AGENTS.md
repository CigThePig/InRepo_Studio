# /src/types — Local AGENTS.md

Purpose:
- Owns TypeScript types and JSON schema definitions.
- Protects persistence formats from accidental breaking changes.

Owns:
- Project/Scene/Entity schemas (and versioning)
- Runtime validation and dev fixtures for schemas
- **Game API contract types** (`ApiContext`, `EventBus`, `TimeHelpers`, `EntityHandle`, `PresetSurface`, `LogApi`)
- **PresetDefinition schema** (knobs, commands, events, state, compatibility metadata)
- **Logic script envelope types** (`ScriptFile`, `LogicTarget`, `formatVersion`)
- **Preset persistence types** (`/game/presets.json` format)

Does NOT own:
- UI presentation
- Storage read/write mechanics (use `/src/storage`)
- Deploy/auth logic (use `/src/deploy`)
- Preset runtime engine implementation (use `/src/runtime/presets`)
- Blockly block definitions or generators (use `/src/runtime/blockly`)

Local invariants:
- Schema drift is a bug: one canonical definition per concept.
- Any schema change is HIGH RISK: update schema-registry + fixtures + verification.
- Prefer additive changes; if breaking changes are required, plan migrations explicitly.

Game API type rules:
- The Game API is the single doorway for Presets and Blockly. Its TypeScript types live here.
- Top-level shape: `api.meta`, `api.events`, `api.time`, `api.log`, `api.entities`, `api.presets`, plus generic `api.call()`, `api.on()`, `api.read()`.
- `api.meta.logicTarget` identifies which Logic Target a script instance belongs to (for error reporting).
- Stable IDs: command/event/state names use category prefixes (`controls.*`, `movement.*`, `camera.*`, `animation.*`). Names must not change casually; renames require aliasing.

PresetDefinition schema rules:
- Every preset must declare four surfaces: Knobs, Commands, Events, State.
- Each command/event/state entry includes: id, label, description, args/payload/type schema, keywords (for search).
- Compatibility metadata: `compatibleWith`, `conflictsWith`, `suggestedAlternative`.
- `runtimeSettable` flag on knobs controls whether Blockly can adjust them at runtime.

Logic script envelope rules:
- Envelope wraps Blockly workspace JSON with metadata: `formatVersion`, `scriptId`, `logicTarget` (type + label), `blockly.workspace`.
- `logicTarget.type`: `"game"` or `"map"` (future: `"entity"`, `"trigger"`).
- Generated JS is optional cache, never canonical.

Verification:
- Validate example project/scene files against schemas.
- Ensure exported/imported JSON round-trips without key loss.
- Game API types compile cleanly with `isolatedModules`.
- PresetDefinition fixtures validate against schema.
- Script envelope fixtures validate against schema.
