# Track 37 — Schema-Driven Block Generation (Part 14)

## Intent

Generate Blockly blocks deterministically from PresetDefinition schemas. One schema produces both the Presets UI and the Blockly block set, ensuring users never experience a mismatch between what presets offer and what blocks are available.

## Scope

- Hat blocks from EventDefs (`inrepo_when_<eventId>`)
- Event payload field reporter blocks (`inrepo_event_<eventId>_<field>`)
- Action blocks from CommandDefs (`inrepo_do_<commandId>`)
- Reporter blocks from StateDefs (`inrepo_get_<stateId>`)
- Field validation and arg UI mapping (boolean→checkbox, enum→dropdown, number→input, etc.)
- Dependency metadata per block (`requiresCategoryEnabled`, `requiresPresetId`)
- Block registry with search and Logic Target filtering
- Shared codegen rules (all output uses only `api.on/call/read/time/log`)

## Out of Scope

- Blockly workspace UI rendering (Track 39)
- Built-in core block categories like Logic, Math, Variables (Track 38)
- Right berry palette UI (Track 40)
- Knob setter blocks (deferred; generic command per category covers v1)
- Build-time block generation (v1 uses runtime generation)

## Acceptance Criteria

- [ ] `generateBlockPack(preset)` produces valid block definitions for all events, commands, and state
- [ ] Block type IDs follow stable naming: `inrepo_when_*`, `inrepo_do_*`, `inrepo_get_*`, `inrepo_event_*`
- [ ] All generated code uses only `api.on/call/read/time/log` — never raw Phaser/DOM
- [ ] Each block carries dependency metadata (category + optional preset ID)
- [ ] Block registry supports search by keyword + label
- [ ] Block registry supports Logic Target filtering
- [ ] `npm run lint` passes (0 errors)
- [ ] `npx tsc --noEmit` passes (0 type errors)
