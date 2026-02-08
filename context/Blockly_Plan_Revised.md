# InRepo Studio — Blockly Plan (Revised: Logic Target Model)

> **Revision summary:** This version replaces the previous Blockly UI plan with the **"Blockly Cockpit + Logic Target dropdown"** model. The top-bar dropdown becomes a universal "editing context selector" — in World Mode it selects the map; in Blockly Mode it becomes the **Logic Target** (which script/scope you're editing). Left berry = Presets (global). Right berry = Blocks Palette for the selected Logic Target. Center = Blockly workspace.

---

## Preamble: Blockly Fundamentals (unchanged)

### What Blockly actually is (and is not)

Blockly is a block editor + code generator, not a game engine and not inherently a runtime. You define blocks, users assemble them, then you generate code (JS in our case). You choose how to run that generated JS (direct eval vs sandbox). Blockly ships guidance for running generated JS safely with JS-Interpreter.

### The three things every custom Blockly block needs

For each block type you add, you typically need:

- **Block definition** (what it looks like, fields, connections)
- **Generator** (how it turns into JavaScript)
- **Toolbox entry** (so it shows up in the palette)

Define blocks using JSON (recommended path) and register them with Blockly, then attach generator functions for JavaScript output.

### Toolbox design (this matters a lot on phones)

Blockly's toolbox can be category toolbox (folders) or flyout toolbox (single continuous list). Dynamic categories (contents generated on open) are perfect for "Presets" blocks that appear only when a preset is enabled and entity-specific blocks based on project state. For mobile usability, the continuous toolbox and toolbox search plugins are especially relevant.

### Workspace creation + "feel" settings (pinch/zoom/scroll)

You inject Blockly into the DOM with `Blockly.inject(container, options)` and tune the workspace via config. For phone-first, the key config families are Zoom (controls/wheel/pinch, min/max scale) and Move (scrollbars/drag/wheel movement).

### Saving and loading user programs (canonical format)

Blockly supports JSON and XML serialization, but JSON is recommended and actively developed. The modern APIs are `Blockly.serialization.workspaces.save(workspace)` and `Blockly.serialization.workspaces.load(state, workspace)`. We store Blockly workspace state (JSON) as the source of truth and generated JS as a build artifact / cache.

### Mutators, validators, and "blocks that change shape"

If a block's shape changes (like adding cases to a switch), use mutators (adds serializable custom state + optional UI). If a block shape change is driven by a field value (dropdown count, mode), use validators.

### Custom fields

You can extend an existing field or create a custom field type and register it for JSON usage. This is how we'd make blocks like "Select Entity Type", "Choose Animation Key", and "Select Preset Command/Event".

### Listening to changes (live codegen, inspector tools)

Blockly workspaces provide an event stream via `workspace.addChangeListener(fn)`. You can temporarily disable events while loading/importing state.

### Running generated JavaScript (safely, and with debugging)

Blockly docs recommend JS-Interpreter for sandboxed execution and stepping/highlighting. Use `javascriptGenerator.STATEMENT_PREFIX = 'highlightBlock(%1);\n'` and provide a host highlightBlock function outside the sandbox.

### Styling: renderer + theme

Blockly has built-in renderers: Thrasos (recommended modern), Geras (classic), Zelos (Scratch-like). For mobile-first "friendly" vibes, Zelos is a natural candidate.

### Plugins worth bookmarking

- continuous-toolbox (mobile-friendly browsing)
- toolbox-search (reduces "where is the block??" frustration)
- scroll-options (better dragging/auto-scroll ergonomics)
- keyboard navigation / accessibility

### TypeScript + Vite reality check

The blockly npm package is packaged as UMD and using imports typically expects a bundler (Vite is fine). We can keep 99% TS, and still embed Blockly cleanly.

### The InRepo-specific takeaway

To make Blockly feel powerful and not confusing, the Blockly side should be driven by a single source of truth: define a Preset/Game API schema (commands/events/state/knobs) and use it to populate the Presets tab, auto-generate the Blockly blocks, drive dynamic toolbox categories, and power toolbox search and "Enable required preset?" prompts. Dynamic categories + schema-driven blocks is the secret sauce.

---

## Preamble: Phaser 3 Operating Manual (unchanged)

*(This section remains unchanged. SceneHost, lifecycle hooks, input, physics, cameras, animations, time, events, and TypeScript expectations are all as previously defined. Key decisions: prefer event-driven Blockly over per-frame logic; the Scene is the integration point; cleanup must respect Scene shutdown.)*

---

## Preamble: Vite Integration Notes (unchanged)

*(This section remains unchanged. Static deploy + GitHub Pages base path, TypeScript reality, dependency format, dynamic module discovery via import.meta.glob, asset handling, Web Workers, and production debugging are all as previously defined.)*

---

# Part 1: Non-negotiables and constraints (v1 foundation)

This is the "constitution" for Presets + Blockly in InRepo Studio. If we agree on these rules, Parts 2–15 become straightforward and consistent.

## 1.1 Product goals (what we're optimizing for)

**Primary goals**

- **Mobile-first usability:** everything must be operable on a phone without precision frustration.
- **Low cognitive load:** users shouldn't wonder "preset or Blockly?" while building.
- **Playable quickly:** a user can pick a profile + a few presets and have something moving in minutes.
- **Stability across versions:** saved games/projects should keep working as InRepo evolves.
- **Open-source friendly:** architecture stays legible and hackable for contributors.

**Secondary goals**

- Blockly should feel "powerful enough" without letting users accidentally destroy performance or stability.

## 1.2 Scope constraints for v1 (what we will and won't do)

**v1 includes**

- Game-wide presets only (no per-entity or per-scene overrides yet)
- A Presets tab in the left berry
- A small, curated set of core presets (Controls, Movement, Camera, Animation Driver)
- A schema-first approach: preset schema drives UI and later drives Blockly blocks
- **Two Logic Targets: Game Logic (main) and Map Logic (per map)**

**v1 excludes (intentionally)**

- Full "visual scripting everything" (no attempt to replace Phaser)
- Per-entity preset overrides (too much UI + data complexity early)
- Deep physics feature matrix (slopes, one-way platforms, wall slide can wait)
- "Rewind debugging" (we can log/trace later, but not full time travel)
- Entity-scoped or trigger-scoped Logic Targets (planned for later)

## 1.3 The "No Split Brain" rule (how we prevent preset vs Blockly confusion)

**Non-negotiable:** Presets and Blockly must both operate through a single shared interface: one Game API contract (TS-defined). Presets implement systems behind it. Blockly calls commands / listens to events / reads state through it.

**User-facing principle:** If something is "preset-y" (camera follow, platformer movement), Blockly still gets hooks to control it. So users never hit: "I can't do this because it's a preset."

## 1.4 Performance guardrails (mobile survival rules)

**Non-negotiable defaults:** Blockly is event-first, not update-loop-first. We avoid letting Blockly generate giant per-frame graphs by default.

**Allowed in v1:** "When X happens" (events), timers/delays (scene time), commands (do things now), reading state (branching decisions).

**Restricted in v1:** Any "On Update / every frame" blocks are either not present in v1, or placed behind an "Advanced" toggle with throttling (e.g., max 10–20Hz). Phones + Blockly graphs + scene update can melt FPS fast.

## 1.5 Safety and stability guardrails (don't crash the editor)

**Non-negotiable:** User logic errors must not crash the editor or hard-freeze the game. Scripts run in a controlled execution model: controlled API exposure, timeouts/limits where feasible, clear error reporting.

**Error UX:** Friendly runtime message: what happened, where (which block / script / **Logic Target**), and how to recover. "Stop scripts" should always work. Undo and reset paths always exist.

## 1.6 Persistence rules (what is "source of truth")

**Non-negotiable:** The canonical source of user logic is Blockly workspace JSON (not generated JS). Generated JS is derived (cache/preview/build artifact) and can be regenerated anytime. Presets are saved as data (`/game/presets.json`), never as ad-hoc code edits.

## 1.7 Versioning rules (future-proofing without pain)

**Non-negotiable:** Stable IDs for preset categories, preset definitions, commands/events/state names exposed via the Game API. Additive evolution preferred: we can add new knobs and new commands. Renames require aliasing/migrations, not breaking changes.

## 1.8 UX guardrails (the "confidence" rules)

**Non-negotiable:** Every change is reversible: presets have Reset-to-defaults, preset switching has Undo, enabling a dependency from Blockly is one-tap and undoable. "Modified" vs "Default" is visible at a glance. Conflicts show clear suggestions ("Switch to suggested preset") and never trap the user.

## 1.9 The "Power Ladder" (so users don't feel boxed in)

We commit to a clear escalation path:

1. Preset defaults (instant playable)
2. Preset knobs (tune)
3. Blockly hooks (events/commands/state)
4. Advanced escape hatch (later): optional "Custom JS" node/block, clearly labeled and gated

v1 aims to make levels 1–3 feel complete enough that level 4 isn't needed for most games.

## 1.10 ✨ NEW: Scope clarity (non-negotiable UX constraint)

**"Scope is never hidden."** Logic scope is always visible and changeable via the top-bar **Logic Target** dropdown in Blockly Mode.

**Mode clarity constraint:** In Blockly Mode, the dropdown must display `"Logic Target: …"` (e.g., `"Logic Target: Game Logic"` or `"Logic Target: Map: Forest"`), not just a bare map name. This prevents confusion between "what map am I on" and "what script am I editing."

**The dropdown is the universal "editing context selector" across both modes:**
- In World Mode → selects which map you're editing
- In Blockly Mode → selects which Logic Target (script scope) you're editing

## 1.11 Part 1 acceptance criteria

Part 1 is "done" when we can say yes to these statements:

- A user can build gameplay with presets + Blockly hooks without guessing where logic belongs.
- Blockly cannot accidentally tank performance just by existing.
- Everything important is data-driven and versionable.
- The plan is aligned with Phaser Scene lifecycles and Vite static deploy constraints (formalized in Parts 2–3).
- **Scope is always visible via the Logic Target dropdown in Blockly Mode.**
- **The dropdown clearly labels itself as "Logic Target" to distinguish from map selection.**

---

# Part 2: Phaser integration contract (SceneHost + lifecycle)

This part answers one question: where does InRepo runtime logic live inside Phaser, and how does it attach/clean up without leaks or mystery behavior?

We're going to treat Phaser Scenes as the "ground" and InRepo systems as "equipment" that gets mounted onto a Scene.

## 2.1 The core idea: one SceneHost per running Scene

**Non-negotiable:** Presets and Blockly never "run the game loop" themselves. They attach to a Scene and ride Phaser's lifecycle.

**SceneHost owns:**
- PresetManager (applies preset systems to the scene)
- **ScriptHost (runs Blockly scripts against the Game API — one per Logic Target)**
- ApiContext (the shared Game API instance bound to that scene)
- Disposables (all subscriptions/timers/listeners for clean teardown)

**SceneHost does not own:**
- Asset loading (that's still Phaser's loader / your project pipeline)
- Rendering (Phaser)
- Scene switching logic (Phaser / game code)
- Editor UI (InRepo UI layer should be separate)

## 2.2 Lifecycle contract (when things happen)

**Attach timing:** Attach in `Scene.create()`, after the scene has created its main world objects (tilemap, player spawn, etc.), but before gameplay begins. Presets need cameras/physics layers/entities to exist, and scripts often want to bind events immediately after creation.

**Update loop usage:** PresetManager may use per-frame updates only when needed (camera smoothing, certain input sampling). ScriptHost is event-first. No per-frame execution in v1 by default.

**Shutdown and destroy cleanup:** On shutdown: stop timers, unsubscribe events, disable systems, but allow scene to restart cleanly. On destroy: hard dispose everything, free references, nothing remains reachable. Rule: anything we add to the Scene must be removed on shutdown/destroy.

## 2.3 How we hook into Phaser without invasive edits

**Option A: Explicit attach call** in scene code (simplest, most explicit). Each game scene calls `InRepoRuntime.attach(scene)` in `create()`.

**Option B: Phaser plugin auto-attach** (best for a "tool" like InRepo). Install an InRepo Scene Plugin or Global Plugin that listens for Scene start/create and attaches SceneHost automatically to eligible scenes.

Recommendation for InRepo Studio: Option B long-term, Option A fine for v1 bootstrapping.

## 2.4 "Which scenes should get InRepo runtime?"

**Scene eligibility rule (v1):** Attach only if Scene has `inrepoRole === "play"` OR Scene is the configured "main playable scene" in `/game` metadata. This avoids accidental attachment to editor scenes.

## 2.5 The API context: what Presets and Scripts receive

**ApiContext must include:** events (InRepo event bus, scene-scoped), time (wrapper around Phaser time), entities (lookup by stable entity IDs/tags), presets (commands/events/state exposed by enabled presets), log (structured logging).

**ApiContext must NOT expose by default:** raw scene object to Blockly scripts, raw Phaser plugins (input, physics) directly to Blockly. Presets can use raw Phaser internals. Blockly should use safe wrappers.

## 2.6 Event bridging: Phaser → InRepo → Blockly

**What we bridge in v1:** Scene lifecycle events (scene started, scene shutdown), input events (abstracted by Controls preset), collision/overlap events (abstracted by Movement/Physics system), custom game events (emitted via API).

**Where the bridge lives:** SceneHost is responsible for bridging Phaser events into the InRepo event bus. Presets can emit higher-level events (preferred).

**Rule:** Blockly listens to InRepo events, not Phaser events.

## 2.7 Resource management: the "No Leaks" policy

Everything SceneHost registers must be tracked. Every listener/timer/subscription returns a disposer and gets stored. On shutdown/destroy: call all disposers, clear arrays, null references to scene-bound objects. This is critical on mobile where memory leaks are brutal.

## 2.8 Ownership per preset category

- Controls preset: owns input abstraction; may set velocity intent, but should not directly own camera
- Movement/Physics preset: owns Arcade body config, grounded detection, movement math
- Camera preset: owns camera follow, deadzone, bounds, shake
- Animation Driver preset: owns animation selection based on state

Rule: presets can read each other's state, but should not silently override each other's owned systems.

## 2.9 ✨ NEW: ScriptHost binding per Logic Target

**ScriptHost is instantiated per SceneHost and binds to the script for the selected Logic Target.** For v1, both Game Logic and Map Logic ultimately attach to the same playable SceneHost, but remain separate scripts (separate workspace files, separate generated JS, separate runtime registrations).

At runtime, the SceneHost can run **both** scripts simultaneously:
- Game Logic script (`main.json`) — global behaviors
- Map Logic script (`maps/<mapId>.json`) — map-specific behaviors

Editing is always scoped to the current Logic Target selection in the dropdown. Runtime execution runs all enabled scripts.

## 2.10 Part 2 acceptance criteria

Part 2 is done when we can truthfully say:

- There is a clear single attach point and a clear single cleanup point.
- SceneHost can attach to multiple scenes safely (no shared mutable state collisions).
- Presets and Blockly share one ApiContext, and Blockly is sandboxed away from raw Phaser internals.
- There's a defined eligibility rule so we don't attach runtime logic to editor/UI scenes by accident.
- **ScriptHost supports multiple Logic Targets per SceneHost (Game Logic + Map Logic in v1).**

---

# Part 3: Vite integration contract (build, deploy, module loading, workers)

This part locks down how we structure InRepo so dev server, production build, and GitHub Pages all behave the same, especially once we add Blockly (big dependency) + schema-driven registries + optional workers.

## 3.1 Deployment target reality: GitHub Pages + static output

**Non-negotiable:** InRepo is a static site. Everything must work when served from `dist/` with no server logic.

**Base path strategy:** Use Strategy A (relative base: `base: './'`) unless there's a strong reason not to. This keeps InRepo Studio easy to fork and deploy.

## 3.2 Folder conventions

We separate three worlds:

- **A) Editor code:** `src/editor/...`
- **B) Runtime code:** `src/runtime/...`
- **C) Game project data:** `/game/...` in the repo root

Vite bundles `src/` into JS. `/game` is user/project content and should be treated as data/assets, not code.

## 3.3 Registry loading with import.meta.glob

Preset definitions registry: `src/runtime/presets/defs/*.ts`. Each file exports a PresetDefinition. Registry build uses `import.meta.glob('./defs/*.ts', { eager: true })`.

Blockly blocks registry: `src/runtime/blockly/blocks/*.ts` (or `src/editor/blockly/blocks` if purely editor-side). Same pattern.

Rule (v1): use `{ eager: true }` until performance proves we need lazy.

## 3.4 Handling preload errors (production robustness)

Add a global handler for `vite:preloadError`: show "New version available. Refresh?" prompt. This prevents "it works locally but breaks on Pages after update" headaches.

## 3.5 Dependency format expectations (Blockly + plugins)

Vite dev server is ESM-first and will prebundle deps. If any dependency behaves weirdly in dev, use `optimizeDeps.include` or `.exclude` in vite.config.ts. Only add these once we observe actual issues.

## 3.6 Asset strategy (hashed imports vs public vs /game)

- **A) Bundled assets** (imported from src): UI icons, editor images, small built-in templates. Use `import url from './thing.png'`.
- **B) Public stable assets** (`public/`): assets that must keep exact names/paths.
- **C) Project assets under `/game`**: user/project data, served as-is by GitHub Pages.

**Safe URL rule:** Any runtime fetch of `/game/...` must be built as `new URL('game/....', import.meta.env.BASE_URL).toString()`.

## 3.7 Worker policy

**What goes in a worker:** Blockly workspace → JS generation, optional static analysis/validation, inspector indexing and log processing.

**What stays on main thread:** Phaser runtime, editor UI, any DOM-bound Blockly workspace rendering.

Worker is a "compiler helper", not the place Blockly renders.

## 3.8 TypeScript build expectations (isolated modules)

Design schema and registries in a way that compiles cleanly with `isolatedModules`. Prefer data objects + light typing over heavy conditional type magic. Run `tsc --noEmit` in CI separately from Vite build.

## 3.9 Saving/loading project data: never rely on bundler internals

All persisted project state is JSON in `/game`. No importing from `/game` as modules. Use fetch/read via file system abstraction that produces URLs safe for base path.

## 3.10 ✨ NEW: Logic script storage paths

Logic scripts are stored in `/game/logic/...` and loaded via URL helper with `import.meta.env.BASE_URL`. The editor must be able to load different script files depending on Logic Target selection without bundler involvement.

File mapping:
- Game Logic → `/game/logic/main.json`
- Map Logic → `/game/logic/maps/<mapId>.json`

The editor resolves the correct file path from the Logic Target dropdown selection and fetches it as data (not as a module import).

## 3.11 Part 3 acceptance criteria

Part 3 is done when:

- We have a chosen base strategy (default: `./`) and a URL helper rule.
- Preset and block definitions live in standard folders and are registry-loaded via `import.meta.glob`.
- We have a worker plan for compilation/analysis tasks (not DOM rendering).
- Asset strategy is clear: imported vs public vs `/game`, with safe runtime URL building.
- We have a plan to handle preload/version mismatch errors gracefully.
- **Logic script files are stored under `/game/logic/` and loaded per Logic Target selection via URL helper.**

---

# Part 4: The Unified Game API contract (the only doorway)

This is the single most important technical artifact. It's the one interface that presets implement behind the scenes, Blockly-generated JS calls and listens to, the editor can introspect to generate UI and blocks, and future features can expand without breaking old projects.

The Game API is scene-scoped: each running Phaser Scene gets its own bound API instance.

## 4.1 Principles (non-negotiables)

- **Scene-bound, not global:** API instance is created per playable Scene and disposed on shutdown/destroy.
- **Stable IDs and names:** Public names (commands/events/state) are versioned and don't change casually.
- **Event-first:** Blockly is driven by events and timers, not the update loop by default.
- **No raw Phaser exposure to Blockly by default:** Presets can use Phaser internally. Blockly sees safe wrappers.
- **Introspectable:** The API includes metadata for commands/events/state so we can generate blocks and UI.

## 4.2 High-level structure

Top-level shape:
- `api.meta` (version + registry metadata)
- `api.events` (scene-scoped bus for game events)
- `api.time` (safe timer helpers)
- `api.log` (structured logging)
- `api.entities` (stable entity lookup and tagging)
- `api.presets` (enabled preset modules by category, exposing commands/state/events)
- `api.scene` (optional, internal only; not exposed to Blockly in v1)

## 4.3 Concrete contract (TypeScript-level spec)

### 4.3.1 API Meta and Introspection

`api.meta`:
- `apiVersion`: semantic-ish string
- `schemaVersion`: for block generation compatibility
- `categories`: list of categories with their exposed surface
- `capabilities`: feature flags (e.g., `supportsAdvancedTick`)
- ✨ **`logicTarget`**: metadata identifying which Logic Target this script instance belongs to (e.g., `"main"` or `"map:forest"`), so runtime logs/errors can report which target script caused an error

### 4.3.2 Event Bus (game-wide within a scene)

`api.events`: `on(eventId, handler)` returns disposer, `once(eventId, handler)` returns disposer, `off(eventId, handler)` optional, `emit(eventId, payload)` for game/presets to emit events, `list()` for introspection/debug. Payload must be plain JSON.

### 4.3.3 Time helpers

`api.time`: `after(ms, fn)` returns cancel, `every(ms, fn)` returns cancel, `clear(handle)` optional. All timers auto-cancel on scene shutdown. Internally wraps Phaser's `scene.time.delayedCall`.

### 4.3.4 Logging / diagnostics

`api.log`: `info(msg, details?)`, `warn(msg, details?)`, `error(msg, details?)`, `event(eventId, payload)` optional. Details must be JSON; logs should include source info when available (Blockly block id **+ Logic Target**).

### 4.3.5 Entities (stable references without leaking Phaser)

`api.entities`: `getById(id)`, `getByTag(tag)`, `setTag(entityId, tag, enabled)`, `exists(id)`. EntityHandle (v1): lightweight, serializable reference with id, minimal read-only state via getters, commands through API not direct mutation.

### 4.3.6 Preset modules (category surfaces)

`api.presets`: `getCategory(categoryId)`, `isEnabled(categoryId)`, `activePresetId(categoryId)`. Two levels: typed TS layer (internal) and generic call layer (Blockly-friendly): `api.call(commandId, args)`, `api.read(stateId)`.

## 4.4 The Generic Script Surface (the sandbox-friendly layer)

`api.call(commandId, args)`, `api.on(eventId, fn)`, `api.read(stateId)`. This makes generated JS stable and easy to validate.

## 4.5 Naming conventions

Category prefixes: `controls.*`, `movement.*`, `camera.*`, `animation.*`. Event naming uses present/past tense clarity. Command naming uses verbs. State naming uses nouns/adjectives.

## 4.6 Versioning and migration rules

`api.meta.apiVersion = "1.x"`. Breaking changes require new command IDs while keeping old as aliases, OR migration layer. Saved Blockly logic stores block workspace JSON; if block definitions change, we migrate blocks or preserve old blocks under versioned names.

## 4.7 Part 4 acceptance criteria

Part 4 is done when:

- We have a clear top-level API shape and strict "no raw Phaser in Blockly" rule.
- We have event, time, log, entities, and presets surfaces defined.
- We have generic call/on/read methods suitable for Blockly codegen.
- We have naming + versioning rules that prevent future breakage.
- **`api.meta.logicTarget` identifies which Logic Target a script instance belongs to for error reporting.**

---

# Part 5: Preset contract (Knobs, Commands, Events, State) — unchanged

This is the rulebook that makes presets and Blockly feel like one coherent system.

## 5.1 The core rule (non-negotiable)

Every preset must expose four surfaces, even if some are small: Knobs (configuration options), Commands (actions you can call), Events (signals it emits), State (read-only values you can query). This prevents "presets are magic" and makes Blockly feel powerful.

**Reinforcement: Presets are global systems. They do not vary per Logic Target.** In Blockly Mode, presets remain visible in the left berry regardless of which Logic Target is selected in the dropdown. Preset hooks (commands/events/state) are available to all Logic Targets equally.

## 5.2–5.7

*(Sections 5.2 through 5.7 remain unchanged: what each surface is for, compatibility/conflicts, ownership model, runtime lifecycle, schema requirements, and the "Developer clarity" UX guarantee with Configure + Blockly Hooks tabs.)*

## 5.8 Part 5 acceptance criteria

Part 5 is done when:

- Every preset is required to declare knobs/commands/events/state + schemas.
- Compatibility/conflict and "suggested alternative" are part of the contract.
- Lifecycle is standardized so PresetManager can manage attach/apply/dispose cleanly.
- Ownership rules are stated so categories don't stomp each other.
- We have a UI guarantee that exposes "Blockly hooks" for every preset category.
- **Presets are confirmed as game-wide / global and not Logic-Target-specific.**

---

# Part 6: Preset schema format (single source of truth) — unchanged

*(This entire part remains unchanged. PresetDefinition shape, option schema, command schema, event schema, state schema, versioning inside schema, compatibility metadata, schema-to-API connection, and file layout are all as previously defined.)*

---

# Part 7: Presets persistence model (/game/presets.json) — unchanged

*(This entire part remains unchanged. Persistence principles, file location, file format, defaulting rules, unknown presetId behavior, config migrations, modified vs default detection, game profile behavior, and saving rules are all as previously defined.)*

---

# Part 8: Presets UI plan (Left Berry tab) — UPDATED

This part defines exactly what the Presets UI looks like and how it behaves, using the schema (Part 6) + saved state (Part 7). This part now covers **two contexts**: Presets in World Mode and Presets in Blockly Mode.

Design goal: mobile-friendly "systems cockpit" that also answers "can Blockly control this?" instantly.

## 8.1 UI entry: Left Berry tab "Presets"

**Tab identity:** Label: Presets. Icon: sliders/gear (simple). Purpose: enable systems, choose preset implementations, tune knobs, view Blockly hooks.

**This tab appears in both World Mode and Blockly Mode.** In World Mode, it's a tab in the left berry. In Blockly Mode, the entire left berry is dedicated to Presets (global systems).

## 8.2 Screen 1: Presets Dashboard (home)

Layout (top to bottom):

**A) Game Profile selector (sticky at top):** Chips: Top-down | Platformer | Custom. Selecting Top-down/Platformer applies recommended preset selections (with Undo). Custom is auto-set when user mixes incompatible presets.

**B) Status strip (compact):** "X categories enabled". Warnings badge if any conflicts/missing presets.

**C) Category list (scroll):** Rows for v1 categories (Controls, Movement/Physics, Camera, Animation Driver, plus optional stub disabled rows for future ones). Each row includes icon + category name, active preset label or "Off", status chips (Off, Default, Modified, ⚠ Conflict, ⚠ Missing, ⬆ Newer), and a chevron to drill-in.

**D) Quick enable toggle:** Keep row tap = drill-in; put enable toggle inside drill-in for v1 to avoid accidental toggles on mobile.

**Dashboard states:** Empty project shows "Choose a profile to begin" card. Conflicts present shows a small banner above list.

## 8.3 Screen 2: Category Detail (drill-in)

Header: Back button, category name, status chip, optional "Reset" icon.

**Sub-tabs (critical UX):** Two tabs: **Configure** and **Blockly Hooks**. This is the "no more guessing" feature.

### 8.3.1 Configure tab

Section A) Enable + preset picker. Section B) Compatibility/conflicts banner. Section C) Options (accordion groups: Basics default open, Advanced closed, Debug hidden behind toggle). Section D) Footer actions (Reset to Defaults, Undo toast). Auto-apply on change with Undo toast.

### 8.3.2 Blockly Hooks tab

This renders from schema (commands/events/state) plus current enabled status.

A scrollable list with three collapsible sections: Events (rows with label + description, expandable payload details), Commands (rows with label + description, expandable args), State (rows with label + type + description).

**✨ NEW: Blockly Mode behavior:** When viewing the Blockly Hooks tab while in Blockly Mode, each event/command/state row gains an additional action:

- **"Insert block" button** — inserts the corresponding block into the workspace of the **currently selected Logic Target**.
- The inserted block is placed near the current selection or cursor anchor in the Blockly workspace.
- This provides a direct bridge: user sees a hook in the Presets panel → taps Insert → block appears in their current script.

**Dependency UX:** If category is disabled, show "Enable this category to use its hooks" with an Enable Category button.

## 8.4 Screen 3: Preset Picker (modal or full screen)

Search bar, list of preset cards (label, description, tags, recommended profile, compatibility warning). Selecting a preset immediately switches and loads defaults with Undo toast.

## 8.5 Screen 4: Issues modal

Shows a list of conflicts/missing/newer issues. Tap an issue jumps to the category detail.

## 8.6 UI logic rules (deterministic behavior)

Modified detection, reset rules, switching presets, enabling/disabling — all as previously defined.

## 8.7 Mobile-first UI constraints

Avoid multi-column layouts, use accordions, sliders need numeric display, touch targets ≥ ~44px, search in preset picker mandatory after presets grow beyond ~6 per category.

## 8.8 ✨ NEW: Blockly Cockpit Screen Spec

This section defines the complete Blockly Mode layout.

### Blockly Mode layout

| Zone | Content |
|------|---------|
| **Top bar** | Back (exit Blockly Mode), **"Logic Target" dropdown**, Run/Stop buttons, status indicator |
| **Left berry** | Presets panel (global systems) — same content as World Mode Presets tab, plus "Insert block" actions on Blockly Hooks |
| **Center** | Blockly workspace (replaces the map viewport) |
| **Right berry** | **Tab 1:** Blocks Palette for selected Logic Target. **Tab 2:** Inspect/Errors panel |

### Logic Target dropdown behavior

- **Location:** Same position as the map dropdown in World Mode.
- **Label:** Always prefixed with "Logic Target:" to distinguish from map selection.
- **v1 items:**
  - `Logic Target: Game Logic (main)` — edits `/game/logic/main.json`
  - `Logic Target: Map: <mapName>` — edits `/game/logic/maps/<mapId>.json`
- **Default on entry:** When entering Blockly Mode, the Logic Target defaults to the currently selected map's logic (because that's what you were just looking at). If no map logic exists yet, prompt to create or switch to Game Logic.
- **Switching:** Changing the dropdown swaps the currently open workspace file. The center workspace loads the new Logic Target's script. The right berry palette may update (map targets get map-specific blocks).

### Navigation into Blockly Mode

Users can enter Blockly Mode from:
- **Left berry → Logic tab → "Edit" button** (opens Blockly for the current map's logic)
- **Presets → Blockly Hooks → "Open in Blockly"** (opens Blockly and scrolls to relevant category in palette)
- **Direct mode toggle** (top bar or equivalent)

### Right berry: Blocks Palette

The right berry in Blockly Mode shows the blocks palette for the currently selected Logic Target. Content changes with target type:

- **Game Logic palette:** Events, Preset categories (Controls, Movement, Camera, Animation), Logic/Math/Vars/Time/Debug
- **Map Logic palette:** Everything above **plus** Map category (even if minimal in v1 — map-specific events like "When map entered")

Search lives at the top of the right berry palette and searches across all visible categories.

### Inspect/Errors tab (right berry, tab 2)

Shows: script status (running/stopped/error), last error with block highlight, active timer count, recent log entries. This is the lightweight v1 inspector.

## 8.9 Part 8 acceptance criteria

Part 8 is done when:

- We have 4 defined screens: Dashboard, Category Detail, Preset Picker, Issues modal.
- Category Detail has Configure + Blockly Hooks tabs.
- Conflict/missing/newer states are fully specified and recoverable.
- Change behavior is auto-apply with Undo.
- Rendering is driven entirely by schema + persisted state.
- **Blockly Cockpit layout is fully specified: top bar with Logic Target dropdown, left berry Presets, center workspace, right berry palette + inspector.**
- **"Insert block into current Logic Target" action exists on Blockly Hooks in Blockly Mode.**
- **Logic Target dropdown behavior (default on entry, switching, labeling) is defined.**

---

# Part 9: Preset runtime engine (PresetManager) — minor update

Goal: A single manager that can load `/game/presets.json`, instantiate the chosen preset per category, apply config changes live, expose commands/events/state into the Game API, and dispose cleanly on scene shutdown.

## 9.1–9.10

*(All sections remain unchanged: responsibilities, inputs/outputs, core runtime interfaces, lifecycle flow, config merging/validation, missing preset handling, conflict handling, API registration, update loop management, debug diagnostics hooks.)*

**Clarification added:** PresetManager is **not** Logic-Target-specific. It manages game-wide preset systems. Both Game Logic and Map Logic scripts share the same PresetManager instance and the same preset command/event/state surface. This reinforces the principle that presets are global systems.

## 9.11 Part 9 acceptance criteria

Part 9 is done when:

- We have a clear runtime contract and lifecycle for presets (instantiate/attach/apply/dispose).
- Config merging + validation behavior is defined and safe.
- Missing preset IDs and conflicts never crash runtime.
- Commands/state/events are registered into the Game API in a generic way.
- Update loop usage is optional and centralized.
- **PresetManager is confirmed as not Logic-Target-specific; it serves all scripts equally.**

---

# Part 10: v1 preset set (Playable Core) — unchanged

*(This entire part remains unchanged. Game Profiles, Controls presets (topdown + platformer), Movement presets (topdown + platformer), Camera preset, Animation Driver preset, cross-category expectations — all as previously defined.)*

---

# Part 11: Blockly runtime model (execution + safety) — UPDATED

This part defines how Blockly-generated JavaScript actually runs in a Phaser scene without crashing the editor, tanking FPS, or confusing users.

Goal: event-driven gameplay scripting that feels powerful and predictable on mobile.

## 11.1 Core decisions (v1)

**Execution style:** Event-first scripting (default). Timers allowed (after, every). No unrestricted per-frame loops in v1.

**Script scope:** Scripts are scene-scoped (bound to a specific playable SceneHost). **In v1, there are two Logic Target types producing scripts:**
- **Game Logic (main):** one global script
- **Map Logic:** one script per map

**✨ NEW: Multi-script runtime model:** ScriptHost must support running multiple scripts per scene simultaneously:
- Game Logic script (main) — always runs if it exists
- Map Logic script (current map) — runs if it exists for the current map

Both scripts can run together (recommended v1 behavior). Editing is per Logic Target (via the dropdown). A future toggle can enable/disable map script execution independently.

**Sandbox boundary:** Blockly scripts receive only the generic Game API surface: `api.on(...)`, `api.call(...)`, `api.read(...)`, `api.time.after/every`, `api.log...`. Blockly scripts do not receive raw scene, Phaser, DOM, window, etc.

## 11.2 Script lifecycle (start/stop/restart)

ScriptHost owned by SceneHost.

**States:** Stopped (default), Running, Error (stopped due to fatal script error, but editor still alive).

**Lifecycle events:** `script.starting`, `script.started`, `script.stopping`, `script.stopped`, `script.error({ message, blockId?, stack?, logicTarget? })`.

**✨ NEW:** Error events include `logicTarget` field so the UI can report which script caused the error (e.g., "Error in Map: Forest logic" vs "Error in Game Logic").

## 11.3 When scripts run (entry points)

v1 provides two "entry styles" for Blockly, both event-first:

**A) "When Scene Starts"** — standard Blockly hat block that registers a handler on a SceneHost start event.

**B) Event hats ("When X happens")** — `When Player Lands`, `When Jump Pressed`, etc. Under the hood: `api.on(eventId, handler)`.

Rule: scripts never poll Phaser state constantly by default.

**✨ NEW:** Both Game Logic and Map Logic scripts can register handlers for the same events. They run independently. If both scripts register for `movement.landed`, both handlers fire. This is the expected composition behavior.

## 11.4 Timers (safe delays/intervals)

Blocks for "Wait X ms then do", "Every X ms do", "Cancel timer". Under the hood use `api.time.after/every`. All timers tracked by ScriptHost, auto-cancel on script stop or scene shutdown. Timer handlers wrapped in try/catch.

## 11.5 Error handling (don't brick the editor)

**Compilation/generation errors:** Blockly workspace invalid or generator fails → show error in editor console, script does not start.

**Runtime errors inside handlers:** Exception thrown → stop scripts (enter Error), log error with context **including Logic Target**, show "Stop/Restart" options.

**Error reporting requirements:** User-friendly message, block id if possible, **Logic Target that caused it**, stack trace (optional for advanced view).

## 11.6 Preventing runaway scripts (limits)

v1 safety limits: minimum interval for "Every" timers (clamp to ≥ 50ms), hard cap on active timers per script (e.g., 64), guard recursion depth, optional execution time budget per handler. If limits hit: warn via `api.log.warn`, optionally stop script if severe.

## 11.7 How generated JS is structured

Generated JS exports a single function like `register(api)` that registers event handlers and timers and returns a disposer list. "Register my hats" then exit. Handlers run later on events. No main thread loops.

## 11.8 Integration with Presets

Because presets expose hooks, Blockly scripts can call commands, react to semantic events, and read state for conditional logic. Example: on `movement.landed`, if `api.read("movement.fallSpeed") > 700` then `api.call("camera.shake", ...)`.

## 11.9 "Advanced tick" (explicitly gated, not default)

Planned but not enabled by default in v1. When added: "Every frame (Advanced)" hat block, throttled alternative, must require enabling "Performance mode" toggle with warning.

## 11.10 ✨ NEW: v1 default runtime behavior

When a scene starts:
1. ScriptHost checks for Game Logic script (`/game/logic/main.json`). If exists, generate JS and register.
2. ScriptHost checks for Map Logic script (`/game/logic/maps/<mapId>.json`). If exists, generate JS and register.
3. Both scripts run simultaneously against the same ApiContext.
4. Both scripts share the same event bus, so they can indirectly communicate via custom events.
5. If either script errors, only that script enters Error state; the other continues running.

**Future toggle:** Allow users to enable/disable map script execution independently (not required for v1).

## 11.11 Part 11 acceptance criteria

Part 11 is done when:

- ScriptHost lifecycle is defined (start/stop/error).
- Scripts are event-first and scene-scoped.
- Timers are safe and auto-cancel on stop/shutdown.
- Runtime errors don't crash the editor, and are reported meaningfully **with Logic Target attribution**.
- Guardrails exist to prevent runaway performance problems.
- There's a clear generated code structure (register handlers, no main loop).
- **ScriptHost supports running Game Logic + Map Logic simultaneously.**
- **Independent error handling per script (one script erroring doesn't kill the other).**

---

# Part 12: Blockly storage model (workspace JSON as source of truth) — MAJOR UPDATE

This part defines how Blockly programs are saved in the repo under `/game`, how we keep them stable across versions, and how the runtime finds and runs them.

Goal: Git-diffable, portable, resilient project scripts — **now supporting multiple Logic Targets.**

## 12.1 Persistence principles (non-negotiable)

- **Workspace JSON is canonical:** We save the Blockly workspace state (JSON) as the "source". Generated JS is derived and disposable.
- **Stable script identity:** Scripts have stable IDs/paths so they can be referenced by scenes/presets.
- **Versioned for migration:** Each saved script includes a format/version field.
- **Diff-friendly:** Keep JSON clean: avoid huge redundant metadata, avoid random ordering churn.

## 12.2 ✨ REVISED: Where scripts live in `/game`

**File structure:**

```
/game/logic/
├── main.json                    ← Game Logic target
└── maps/
    ├── <mapId-1>.json           ← Map Logic target for map 1
    ├── <mapId-2>.json           ← Map Logic target for map 2
    └── ...
```

**Logic Target → file mapping:**

| Logic Target dropdown item | File path |
|----------------------------|-----------|
| Game Logic (main) | `/game/logic/main.json` |
| Map: \<mapName\> | `/game/logic/maps/<mapId>.json` |

**Future expansion (not v1):**

```
/game/logic/
├── main.json
├── maps/
│   └── <mapId>.json
├── entities/                    ← Entity-scoped scripts (future)
│   └── <entityId>.json
└── triggers/                    ← Trigger-scoped scripts (future)
    └── <triggerId>.json
```

## 12.3 Script file format

Use Blockly's recommended modern serialization: `Blockly.serialization.workspaces.save(workspace)`.

Wrap with a metadata envelope:

```json
{
  "formatVersion": 1,
  "scriptId": "main",
  "logicTarget": {
    "type": "game",
    "label": "Game Logic (main)"
  },
  "blockly": {
    "workspace": { /* Blockly serialization JSON */ }
  },
  "generated": {
    "language": "js",
    "hash": "optional",
    "lastGeneratedAt": "optional"
  }
}
```

For map scripts:

```json
{
  "formatVersion": 1,
  "scriptId": "map:forest",
  "logicTarget": {
    "type": "map",
    "mapId": "forest",
    "label": "Map: Forest"
  },
  "blockly": {
    "workspace": { /* Blockly serialization JSON */ }
  }
}
```

Notes:
- `generated` is optional (cache only). In v1 we can omit entirely to keep diffs clean.
- `logicTarget` metadata makes the file self-describing; you can tell what scope a script belongs to without relying on file path alone.

## 12.4 ✨ REVISED: How the runtime finds scripts

**v1 rules:**

The playable SceneHost resolves scripts in two steps:

1. **Game Logic:** Look for `/game/logic/main.json`. If missing, no game logic runs (safe).
2. **Map Logic:** Look for `/game/logic/maps/<currentMapId>.json`. If missing, no map logic runs (safe).

Both are optional. The game can run with zero scripts, one, or both.

## 12.5 ✨ NEW: Empty-state behavior (no script file yet)

When the editor opens a Logic Target and the corresponding file doesn't exist:

- Show a friendly empty state: **"No script exists for [Logic Target]. Create one?"**
- **"Create Script" button** creates the file on first save (not immediately — avoid empty JSON files in the repo).
- Until created, the Blockly workspace shows empty with a centered prompt.
- Switching Logic Targets that have no script shows this same empty state.

This means: **script files are created on demand, not pre-populated for every map.**

## 12.6 Naming and identity rules

**Script identity:**
- Game Logic: `scriptId: "main"`
- Map Logic: `scriptId: "map:<mapId>"`
- Must be stable and filesystem-safe (letters, numbers, underscore, colon for compound IDs)

## 12.7 Block definition versioning (avoid breaking projects)

Two layers of versioning: Script file `formatVersion` (envelope format) and block set version (what block types exist). Add `blockSetVersion` inside the envelope (optional v1, recommended v1.1).

When blocks change: prefer additive changes (new blocks, new fields). If a block must be replaced: keep old block type as "legacy" or provide a migration.

## 12.8 Migration strategy (pragmatic)

**A) Envelope migrations (formatVersion):** If formatVersion is old, run script-file migration to update wrapper fields.

**B) Workspace migrations:** If blocks changed and we have a mapping, transform workspace JSON before loading.

**C) Soft-fail fallback:** If a block type is unknown, script can't run (compile fails), editor shows warnings and highlights unknown blocks, user can replace/update.

Rule: unknown blocks should not silently disappear.

## 12.9 Preventing "generated JS drift"

v1 policy: do not commit generated JS by default. Generate on-the-fly for preview/run, or cache temporarily in memory.

## 12.10 Script-to-API coupling

Scripts should call only `api.on(...)`, `api.call(...)`, `api.read(...)`, `api.time...`, `api.log...`. No direct Phaser. This keeps scripts stable even when runtime internals change.

## 12.11 Part 12 acceptance criteria

Part 12 is done when:

- **`/game/logic/main.json` and `/game/logic/maps/<mapId>.json` paths are defined.**
- **Logic Target → file mapping is explicit and deterministic.**
- Workspace JSON is the source of truth; generated JS is optional and disposable.
- **Empty-state behavior is defined: prompt to create, create on save, no pre-populated empty files.**
- Runtime script discovery rules are defined (missing script is safe).
- We have a plan for block evolution (versioning + migrations + unknown block handling).
- The system remains Git-friendly (minimal noisy diffs).
- **Script files include `logicTarget` metadata for self-description.**

---

# Part 13: Block taxonomy + palette UX (mobile-first) — MAJOR REWRITE

This part defines how Blockly feels inside InRepo: where blocks live, how users find them fast on a phone, and how we prevent "where the heck is that block?" fatigue.

**✨ KEY CHANGE:** The primary block palette lives in the **right berry**, not in a Blockly toolbox drawer or bottom sheet. The right berry is the "placeables/tools" zone, consistent with World Mode where the right berry holds map placeables.

Goal: predictable navigation + zero dead ends.

## 13.1 Palette goals (what the right berry palette must achieve)

- **Mirrors how users think:** categories match game concepts, not engine internals.
- **Mirrors presets:** if a preset exists, its hooks show up as blocks in the same category.
- **Search-first:** on mobile, scrolling a giant tree is pain. Search must be prominent and useful.
- **No dead ends:** if a block requires a preset that's off, the UI offers to enable it.
- **Changes with Logic Target:** the palette reflects what's available for the selected target.

## 13.2 Right berry palette structure (v1 categories)

The right berry in Blockly Mode shows a scrollable categorized block palette.

**Category list for Game Logic target:**

- Events (common "When …" hats)
- Controls (preset-driven)
- Movement (preset-driven)
- Camera (preset-driven)
- Animation (preset-driven)
- Logic (if/else, comparisons)
- Math
- Variables
- Time (wait/interval)
- Debug (log, show overlay) — collapsed/advanced

**Category list for Map Logic target:**

- Everything above, **plus:**
- **Map** (map-specific events and blocks, even if minimal in v1)
  - v1 stubs: "When map entered", "When map exited"
  - Future: map-specific entity references, trigger zones

Why "Events" is separate: "When X happens" is the mental entry point for most users. It reduces "where do I start?" friction.

## 13.3 "Beginner vs Advanced" split

Each preset-based category has two sub-sections:
- **Common** (default visible)
- **Advanced** (hidden behind "Show advanced blocks" toggle)

Examples: Common: When Jump Pressed, Set Run Speed, Shake Camera. Advanced: Apply Impulse, Set Deadzone, Force Animation State.

## 13.4 Dynamic categories (content reflects project state)

**If a category's preset is disabled:** Show a minimal placeholder: "Enable [Camera] preset to use these blocks" with an Enable Preset button.

**If enabled:** Show blocks generated from the preset schema (events, commands, state, optional knob setters).

**If preset is missing:** Show "Missing preset" warning and actions: "Choose replacement" (opens Presets in left berry at that category).

**Category visibility by Logic Target:** Map-specific blocks (Map category) only appear when a Map Logic target is selected. Game Logic target does not show Map category blocks.

## 13.5 Search UX (mandatory on mobile)

**Search bar at the top of the right berry palette.** Searches across all visible categories for the current Logic Target.

**Search behavior requirements:**
- Matches block label + keywords + help text
- Shows results grouped by category
- Each result includes block name, category, small "requires preset" indicator if relevant
- Selecting a result: inserts the block OR opens a prompt if dependencies are missing

**Dependency prompt (no dead ends):** If the selected block requires a preset that is disabled: "This block requires Camera preset. Enable it?" → Enable / Cancel.

## 13.6 "Start here" templates (v1 optional but very helpful)

A small "Starter" mini-category or modal: "Player can move + jump", "Camera follows player", "Collect coins". These templates drop in a small working block graph. Optional but a huge UX boost against blank-canvas paralysis.

## 13.7 Block naming and discoverability rules

Labels must read like a sentence: "Shake camera", "Set run speed to ___", "When player lands".

Keywords must include synonyms. Example: camera shake → shake, rumble, hit, impact. Movement friction → friction, ice, slippery. Stored in schema so search stays useful.

## 13.8 Palette style (mobile ergonomics)

- Scrollable categorized list (not deep nested tree)
- Keep categories flat
- Large touch targets
- Prefer fewer blocks with dropdown variants over many near-duplicates
- **No bottom-sheet toolbox requirement** — the right berry IS the palette

## 13.9 How this ties to Presets UI

Presets tab (left berry) shows Configure (knobs) and Blockly Hooks (events/commands/state). The right berry palette mirrors the same categories. So the mental model becomes: "Preset config is here (left)" + "Blockly blocks for that preset are here (right)" — and both share names/labels.

**"Insert block" bridge:** From Presets → Blockly Hooks, tapping "Insert block" places the block in the current workspace. From the right berry palette, dragging/tapping a block places it in the workspace. Both paths work; users can discover blocks from either side.

## 13.10 Part 13 acceptance criteria

Part 13 is done when:

- **Right berry palette category list is defined and small for v1.**
- **Palette content varies by Logic Target (Map blocks only for map targets).**
- Each preset-based category supports placeholder state when disabled, schema-driven blocks when enabled, and missing preset handling.
- Search UX and dependency prompt behavior are defined.
- Beginner/Advanced block segmentation is defined.
- Naming + keywords rules are defined.
- **No reference to bottom-sheet toolbox as primary — right berry is the palette.**

---

# Part 14: Schema-driven block generation rules (PresetDefinition → Blockly blocks) — UPDATED

This is where everything snaps into place: one schema produces both the Presets UI and the Blockly block set, so users never feel a mismatch.

Goal: define deterministic rules for generating hat blocks (events), action blocks (commands), reporter blocks (state), optional knob blocks (set/get knobs), plus validation, tooltips, keywords, dependency prompts, and codegen.

## 14.1 Inputs and outputs

**Input:** A PresetDefinition (Part 6) containing category metadata, options (knobs), commands, events, state, compatibility info, keywords/tags.

**Output:** A generated Blockly "pack" containing block JSON definitions, generator functions (JS), **right berry palette entries** (category items), and dependency metadata per block.

## 14.2 Block families (the mapping)

### 1) Events → Hat blocks

For every EventDef: create a hat block `when_<eventId>`. Shape: no previous connection, has next connection. Fields: label from schema, optional output payload fields as variables (v1 keep simple).

**v1 payload access model:** The hat block provides an implicit "event payload" object accessible via helper blocks: `event.<field>` reporter blocks that are only valid within that event scope.

### 2) Commands → Action blocks

For every CommandDef: create a statement block `do_<commandId>`. Block inputs correspond to args.

**Arg UI rules:** booleans → checkbox toggle field, enums → dropdown field, numbers/ints → number input with validator + optional slider, entityId → dropdown populated from entities/tags (dynamic), strings → text field.

**Codegen:** `api.call("<commandId>", { arg1: <value>, arg2: <value> })`

### 3) State → Reporter blocks

For every StateDef: create an output reporter `get_<stateId>`. Output type hints: boolean → boolean output, number → number output, string → string output, vec2 → helper blocks `vector x` / `vector y` (v1 recommended).

**Codegen:** `api.read("<stateId>")`

## 14.3 Knob blocks (optional in v1, but likely worth it)

Allowing Blockly to adjust knobs at runtime is useful (ice zone friction, temporary speed boosts, slow motion camera lerp). Direct knob mutation goes through commands for safety. Only generate `set_<category>_<key>` blocks for knobs marked `runtimeSettable: true`.

Best v1 compromise: one generic command per category (`controls.setOption({ key, value })`) and only expose it in Blockly for runtimeSettable keys (dropdown filtered).

## 14.4 Dependency system (no dead ends)

Each generated block carries dependency metadata: `requiresCategoryEnabled: "camera"`, `requiresPresetId?` (rare; generally category-level).

If user tries to place a block whose category is disabled: show prompt "Enable Camera preset?", enabling selects recommended preset if none chosen.

This can happen on block drag from **right berry palette** and on search selection.

## 14.5 Naming and grouping rules

Block labels derived from schema labels with consistent verb/noun formatting: event hats start with "When …", commands start with verbs, state starts with "Get …" or reads naturally. Blocks include keywords list for search.

## 14.6 Field and validation rules

**Numeric validation:** clamp to min/max in UI, show inline error state, generator always emits a number. **Enum fields:** always use dropdown, never free text. **Entity fields:** if entity not found, show "(missing)" in dropdown, generator emits string id anyway, runtime handles with warning. **Strings:** escape properly in generator.

## 14.7 Code generation rules (always through Game API)

All generated code must use only: `api.on(eventId, handler)`, `api.call(commandId, args)`, `api.read(stateId)`, `api.time.after/every`, `api.log...`.

Never generate: `scene.*`, `Phaser.*`, DOM access, imports/exports.

**Event hat codegen pattern:** Hat blocks generate `api.on("movement.landed", (payload) => { ...statements... })`. Inside a hat, set context var `__eventPayload`. Payload field reporter blocks compile to `__eventPayload.<fieldName>`. If used outside a hat: compile to undefined and log warning.

## 14.8 Time blocks (global, not per preset)

"Wait ms then" → `api.time.after(ms, () => {...})`, "Every ms do" → `api.time.every(ms, () => {...})` with min clamp, "Cancel timer" (stores handle in variable). These blocks are in the "Time" category.

## 14.9 Block IDs and versioning

Stable type string naming: `inrepo_when_<eventId>`, `inrepo_do_<commandId>`, `inrepo_get_<stateId>`, `inrepo_event_<eventId>_<field>`. Block type must not change once released. Deprecated blocks keep old type as "legacy" with alias or provide workspace JSON migration.

## 14.10 "Schema → Blockly" build pipeline

**v1 recommendation: Runtime generation in editor (Option A).** Read preset registry, create Blockly blocks dynamically. Always in sync, no build step. Later, if performance becomes an issue, migrate to build-time generation.

## 14.11 ✨ NEW: Block insertion and placement

Blocks are inserted via two paths:
1. **Right berry palette** — drag or tap to place
2. **Presets → Blockly Hooks → "Insert block" buttons** — direct insert from left berry

**Placement rules:** Inserted blocks are placed near the current selection or cursor anchor in the workspace. If nothing is selected, place near the viewport center.

**Category visibility filtering:** Block categories can be filtered by Logic Target. Map-specific blocks (Map category) only appear when a Map Logic target is selected in the dropdown. This prevents confusion about "why can I see map blocks when I'm editing Game Logic?"

## 14.12 Part 14 acceptance criteria

Part 14 is done when:

- We have deterministic rules to generate hat/command/state blocks from schema.
- Codegen exclusively uses `api.on/call/read/time/log`.
- Event payload access strategy is chosen (v1: implicit payload + field blocks).
- Dependency prompts are defined and blocks carry dependency metadata.
- Validation rules prevent invalid values from generating broken code.
- Block type IDs and versioning rules are stable and explicit.
- We choose generation timing (v1: runtime generation).
- **Blocks are insertable from both right berry palette and Presets Hooks "Insert block" buttons.**
- **Category visibility respects Logic Target selection.**

---

# Part 15: Implementation sequencing and vertical slice (unchanged)

*(If Part 15 exists in the original plan, it remains unchanged. The Logic Target model is a UI/architecture concern that doesn't alter the recommended build order — the vertical slice should simply include Logic Target switching as part of the Blockly Mode milestone.)*

---

# Appendix: Terminology Glossary (new)

| Term | Definition |
|------|------------|
| **Logic Target** | The scope/script currently being edited in Blockly Mode. Selected via the top-bar dropdown. v1 targets: Game Logic (main) and Map Logic (per map). |
| **Game Logic** | The global script (`/game/logic/main.json`) that runs regardless of which map is active. |
| **Map Logic** | A per-map script (`/game/logic/maps/<mapId>.json`) that runs when that map is the current scene. |
| **Blockly Cockpit** | The Blockly Mode screen layout: top bar (Logic Target dropdown, Run/Stop), left berry (Presets), center (workspace), right berry (palette + inspector). |
| **Right Berry Palette** | The blocks palette that lives in the right berry during Blockly Mode. Content varies by Logic Target. |
| **Logic Target dropdown** | The top-bar control that selects editing scope. Reuses the same UI position as the map dropdown in World Mode, but is labeled "Logic Target: …" in Blockly Mode. |
