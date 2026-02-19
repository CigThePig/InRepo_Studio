# Track 38 — Core Block Definitions (Part 13)

## Intent

Implement the built-in Blockly block categories that exist independently of presets. These are the foundational blocks (Events, Logic, Math, Variables, Time, Debug, Map) that every user needs regardless of which presets are enabled. Together with the schema-driven blocks from Track 37, they complete the v1 block palette.

## Scope

- **Events**: Common event hat blocks (When Scene Starts) — not tied to any preset
- **Logic**: If/else, comparisons (=, <, >, etc.), boolean operators (and/or/not), boolean constants
- **Math**: Number literal, arithmetic (+, -, *, /), rounding, random integer, modulo
- **Variables**: Get variable, set variable
- **Time**: Wait N ms then do, every N ms do, cancel timer
- **Debug**: Log message (info/warn/error levels), log value with label
- **Map**: Map-specific event hats (When map entered, When map exited) — visible only for Map Logic targets
- **Block registry integration**: All core blocks registered via `import.meta.glob('./blocks/*.ts', { eager: true })`

## Out of Scope

- Blockly workspace UI rendering (Track 39)
- Right berry palette UI (Track 40)
- Presets UI + Blockly Hooks tab (Track 41)
- Inspect/Errors panel (Track 42)
- Schema-driven preset blocks (Track 37, already done)
- Knob setter blocks (covered by generic command in Track 37)

## Acceptance Criteria

- [ ] All v1 block categories populated: Events, Logic, Math, Variables, Time, Debug, Map
- [ ] Map blocks have `logicTargetFilter: 'map'` (only visible for Map Logic targets)
- [ ] All blocks use stable type IDs with `inrepo_` prefix
- [ ] Time blocks use `codegenTimeAfter` / `codegenTimeEvery` from codegenRules.ts
- [ ] Debug blocks use `codegenLog` from codegenRules.ts
- [ ] Core blocks registered into BlockRegistry via import.meta.glob pattern
- [ ] Core blocks carry `requiresCategoryEnabled: '__core'` (or category-specific key) to indicate no preset dependency
- [ ] Logic/Math/Variables blocks generate standard JS (no api.* needed — pure logic)
- [ ] `npm run lint` passes (0 errors)
- [ ] `npx tsc --noEmit` passes (0 type errors)
