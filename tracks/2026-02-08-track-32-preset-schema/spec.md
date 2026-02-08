# Track 32 — Preset Schema + Definition Types (Parts 5-6)

## Intent

Define the PresetDefinition schema that serves as the single source of truth for both the Presets UI (left berry) and Blockly block generation. Every preset must declare four surfaces — Knobs, Commands, Events, State — plus compatibility/conflict metadata. The persistence format for `/game/presets.json` (saved preset config) must also be defined.

Authority: `/context/Blockly_Plan_Revised.md` Parts 5 and 6.

## Scope

- PresetDefinition interface with all four surfaces
- KnobDef, CommandDef, EventDef, StateDef types with full field schemas
- CommandArgDef and EventPayloadFieldDef sub-types
- PresetCompatibility metadata (compatibleWith, conflictsWith, suggestedAlternative)
- PresetCategoryId union (v1: controls, movement, camera, animation)
- PresetSavedConfig persistence format (/game/presets.json)
- PresetCategoryConfig per-category saved state
- Validation utilities for PresetDefinition schemas
- Default preset config helpers

## Out of Scope

- Preset runtime implementations (Track 34)
- PresetManager lifecycle (Track 34)
- Blockly block generation from schema (Track 37)
- Presets UI (Track 41)

## Acceptance Criteria

- [ ] PresetDefinition interface requires all four surfaces (knobs, commands, events, state)
- [ ] Every surface entry has stable id, label, description, type info, and keywords
- [ ] Compatibility/conflict metadata is part of the schema
- [ ] PresetSavedConfig format handles missing keys (fall back to defaults)
- [ ] Validation function catches invalid/incomplete PresetDefinitions
- [ ] Default config factory creates a valid empty presets.json
- [ ] Example /game/presets.json exists with default content
- [ ] `tsc --noEmit` passes
- [ ] schema-registry.md is up to date

## Risks

- Schema shape is hard to change once real preset definitions reference it (HIGH RISK — Track 34+)
- Knob constraint types may need extension for future preset needs
