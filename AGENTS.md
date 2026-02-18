# AGENTS.md — Rules for AI coding help (Codex, etc.)

This file is written for *agents*. Follow it literally.

---

## 0) Project commands (MUST keep in sync with /context/tech-stack.md)
- Install: `npm install`
- Dev: `npm run dev`
- Build: `npm run build`
- Test: `npm test`
- Lint: `npm run lint`
- Preview: `npm run preview`

---

## 1) Instruction resolution order (root → local)
1) Always follow this root `/AGENTS.md`.
2) Before touching files in a folder, read the nearest **local** `AGENTS.md` in that folder (and any parent folder between repo root and the target folder).
3) If a change spans multiple folders, read each relevant local `AGENTS.md`.
4) If local rules conflict with root rules, **stop and report the conflict**. Root rules win unless the user explicitly overrides.

Local rules exist to reduce token waste and prevent cross-module mistakes. Use them.

---

## 2) Required reading order (before any work)

For planning (spec/blueprint/plan):
1) `/INDEX.md`
2) `/context/track-index.md`
3) `/context/product.md`
4) `/context/architecture.md`
5) `/context/schema-registry.md`
6) `/context/workflow.md`
7) `/context/planning-checklist.md`
8) `/context/active-track.md`
9) Active track files (spec/blueprint/plan)

For Blockly/Presets work (add to planning reads):
10) `/context/Blockly_Plan_Revised.md` (the Blockly constitution — Parts 1–15)

For implementation (add these):
11) `/context/repo-map.md`
12) `/context/tech-stack.md`
13) `/context/code-style.md`

**Before editing files in any folder**: read the nearest local `AGENTS.md` for that folder (and any other folders you will touch).

**Context priority** (if running low on tokens):
- Essential: `/AGENTS.md`, `/context/active-track.md`, active track files, local `AGENTS.md` for touched folders
- High: `/context/architecture.md`, `/context/schema-registry.md`
- Medium: `/INDEX.md`, `/context/repo-map.md`
- Low: `/context/product.md`, `/context/history.md`

When resuming after a break, switching models/agents, suspecting drift, or before high-risk work:
- Use the Context Refresh Prompt in `/context/active-track.md` (optional, conditional).

---

## 3) Track Index rule (the roadmap is the boss)
- `/context/track-index.md` defines the official track order and scope.
- Follow the track order unless explicitly overridden.
- If asked to "Create Track N":
  - Create the track folder and generate `spec.md`, `blueprint.md` (**NO CODE**), `plan.md`.
  - Do NOT write implementation code unless the user explicitly requests a Micro Track + Phase 1 in the same run.

---

## 4) Workflow gates (Full Tracks vs Micro Tracks)

### Full Track (default for high-risk work)
A Full Track requires:
- `spec.md`
- `blueprint.md` (required unless the change is tiny and low-risk)
- `plan.md` (phases + verification per phase + stop points)

Full Tracks are required when touching any of:
- JSON schemas or persistence formats (project/scene data, exported formats)
- IndexedDB storage layout, migrations, or hot/cold routing
- Boot/mode routing (`/?tool=editor`, base paths, entry wiring)
- GitHub auth/token handling
- Deploy/commit/conflict detection logic
- Cross-cutting refactors across many modules
- Game API contract (`api.on/call/read/time/log` surface)
- Preset schema format (PresetDefinition shape, knobs/commands/events/state)
- Logic script storage format (`/game/logic/*.json` envelope schema)
- SceneHost/ScriptHost lifecycle or attachment model
- Blockly block definitions, generators, or codegen rules

### Micro Track (allowed for low-risk/local work)
Micro Tracks are allowed when the change is clearly low-risk and local:
- UI polish and layout adjustments
- Tool UX tweaks that do not change persistence formats
- Rendering performance improvements within an existing module boundary
- Small bug fixes that do not change public APIs or schemas

Micro Track minimum artifacts:
- A Micro Plan (can live in the track's `plan.md`):
  - Goal (1–2 lines)
  - Files touched
  - Steps (5–10 bullets)
  - Verification checklist
  - Stop point

Micro Tracks may combine plan + implementation Phase 1 in the same run **only when the user asks**.

### Docs-only phases (avoid token churn)
Docs-only phases are allowed only when:
- Creating a new track (spec/blueprint/plan),
- Resolving drift (INDEX/schema-registry/repo-map mismatch),
- Designing high-risk work before implementation.
Otherwise, each phase should ship working behavior (code/tests) in addition to any doc updates.

---

## 5) INDEX rule (file inventory)
- `/INDEX.md` is the canonical full file list.
- Every time you add a file OR substantially change a file's role, update `INDEX.md` in the same phase.
- Keep each entry short: Role + Lists-of-truth names (no details).

---

## 6) Repo Map rule (module boundaries)
- `/context/repo-map.md` is the module map: how major parts connect.
- Update when module boundaries or responsibilities change.

---

## 7) Schema Registry rule (lists of truth)
- `/context/schema-registry.md` is the canonical inventory of "lists of truth":
  metadata lists, form models, JSON definitions, lookup tables, allow/deny key lists.
- When you add/rename/move one of these lists, update `schema-registry.md` in the same phase.

Before changing any schema-driven system (settings panels, inspectors, serializers, import/export):
- Schema references only canonical keys (no orphan keys).
- Export/import uses one canonical key set and round-trips cleanly (excluded keys handled consistently).
- Any "requires apply/rebuild" setting has an explicit apply hook or an explicit "Apply/Rebuild" action. Never silent no-ops.

Minimum verification before committing schema/UI work:
- A toggle truly disables and round-trips.
- Export → import restores values without key loss.

---

## 8) File-level Schema Inventory rule (agents must update)
- Any file that owns a list-of-truth MUST include a near-top comment header:
  **SCHEMA INVENTORY (lists-of-truth)**.
- The inventory is names-only + apply semantics. Use templates from `/context/schema-registry.md`.

---

## 9) Code boundaries + size rules
- New subsystem or domain concept = new module/file.
- Avoid files > 600 lines (soft limit ~450).
- Keep UI, domain logic, and I/O boundaries separated.
- Enforcement: If any file exceeds 450 lines during a phase, the next phase MUST include a refactor task to split it.

Prefer running tools over manual polish:
- If formatting/style matters, use lint/format tooling where available.
- Do not burn tokens hand-formatting text that a tool can enforce.

---

## 10) Entry-point rule (prevent main file bloat)
- The app entry file (e.g., `main.ts`, `index.ts`) may contain ONLY:
  - boot/config loading
  - module initialization
  - wiring event handlers
  - lifecycle control
- It must NOT contain deep domain logic.
- If it starts growing, split wiring into helper modules.

---

## 11) Project invariants (do not violate)
- **Hot/Cold boundary**: IndexedDB is the only write target; fetch is read-only.
- **Deploy ≠ iterate**: Playtest must load from hot storage; GitHub/Pages deploy is publishing.
- **Editor/Runtime separation**: Editor code never runs in game mode; runtime code works independently.
- **Schema compliance**: All persisted/exported JSON must validate against schemas in `/context/schema-registry.md`.
- **Touch-first interaction**: Canvas interactions must account for finger occlusion (touch offset).
- **Offline-after-load editing**: Editing must work without network after initial load. Offline cold-start is not guaranteed until a Service Worker track exists.
- **No data loss**: Auto-save to IndexedDB on every meaningful change.
- **No Split Brain (Presets + Blockly)**: Presets and Blockly both operate through one unified Game API contract. Presets implement systems behind it; Blockly calls commands / listens to events / reads state through it. Users must never hit "I can't do this because it's a preset."
- **Blockly workspace JSON is source of truth**: Generated JS is derived and disposable. Never persist generated JS as canonical state.
- **Event-first scripting**: Blockly is event-driven by default. No unrestricted per-frame loops in v1. "Every frame" blocks require Advanced toggle + throttling.
- **No raw Phaser in Blockly**: Blockly scripts receive only safe Game API wrappers (`api.on/call/read/time/log`). Presets may use raw Phaser internally.
- **Scope is never hidden**: In Blockly Mode, the Logic Target (which script you're editing) is always visible via the top-bar dropdown and labeled as "Logic Target: …".
- **Presets are global**: Presets are game-wide systems. They do not vary per Logic Target. Both Game Logic and Map Logic scripts share the same preset surface.
- **Script errors don't crash the editor**: Runtime errors in user scripts enter Error state for that script only, with clear reporting (which block, which Logic Target). "Stop scripts" always works.

If a requested change conflicts with an invariant, stop and report the conflict.

---

## 12) Plan lint (a plan is invalid unless it has this)

### Full Track plan lint
Each phase in `plan.md` must include:
- Tasks (checkboxes)
- Files touched
- Verification checklist
- Stop point (pause for review)

Also:
- Include checkbox reminders to update `INDEX.md` and `/context/schema-registry.md` when relevant.
- If the track touches settings/config: include a checkbox confirming apply/rebuild semantics are documented in `/context/architecture.md`.

### Micro Track plan lint (valid alternative)
- Goal (1–2 lines)
- Files touched
- Steps (5–10 bullets)
- Verification checklist
- Stop point

---

## 13) Risk gates (ask before doing)
HIGH RISK (must ask):
- deleting files
- changing schemas or persistence formats (project.json, scene schemas, export/import formats)
- changing hot/cold routing or storage layout
- changing boot/mode routing (`/?tool=editor`, base path behavior for GitHub Pages)
- changing build/deploy pipeline
- changing GitHub authentication logic
- changing token storage policy (session vs persistent) or token handling UX
- wide refactors across many files
- changing Game API contract (command/event/state surface names or signatures)
- changing preset schema format (PresetDefinition shape)
- changing logic script envelope format (`/game/logic/*.json`)
- changing SceneHost/ScriptHost lifecycle or attachment model
- changing Blockly block type IDs (stable once released; renames require aliasing)

MEDIUM RISK (notify):
- changing module boundaries
- changing performance-critical code paths (tilemap rendering, IndexedDB operations)
- changing deploy batching / GitHub API call patterns
- adding/removing Blockly block categories or preset categories
- changing Logic Target dropdown behavior or palette filtering rules
- changing Blockly codegen output patterns

LOW RISK (auto):
- adding tests
- adding small pure helper functions
- improving comments/docs

**When stuck or uncertain**:
1. Stop and state what's unclear.
2. List the options you see and their tradeoffs.
3. Ask for clarification before proceeding.
4. Never guess at schema changes, storage behavior, or auth logic.

---

## 14) InRepo Studio specific rules
- Mobile-first: touch targets ≥ 44×44px, bottom sheets over tiny side panels.
- Hot/Cold storage: edit + playtest in hot storage; publish from hot → repo.
- GitHub Pages reality: project sites live under `/<repo>/`; avoid hardcoded absolute paths.
- Conflict safety: Deploy must check remote SHAs before writing; no silent overwrites.
- Asset uploads: keep v1 scoped to small/medium images; warn and refuse large binaries by default.
- Editor/Runtime separation: runtime must not import editor modules.

## 14b) Blockly + Presets specific rules
- **Dual-mode editor**: The editor operates in World Mode (map editing) and Blockly Mode (script editing). The top-bar dropdown is a universal context selector — selects map in World Mode, selects Logic Target in Blockly Mode.
- **Berry UI model**: Left berry = Presets (global systems, available in both modes). Right berry = placeables/tools (tiles/entities in World Mode, blocks palette in Blockly Mode).
- **Logic Targets (v1)**: Game Logic (`/game/logic/main.json`) and Map Logic (`/game/logic/maps/<mapId>.json`). Scripts are created on demand, not pre-populated.
- **Schema-driven blocks**: Blockly blocks are generated from PresetDefinition schemas. One schema drives both the Presets UI (left berry) and the block palette (right berry). Keep them in sync.
- **Preset registries**: Use `import.meta.glob` for preset defs (`src/runtime/presets/defs/*.ts`) and block defs (`src/runtime/blockly/blocks/*.ts`). Use `{ eager: true }` in v1.
- **Game API naming**: Category prefixes (`controls.*`, `movement.*`, `camera.*`, `animation.*`). Events use present/past tense. Commands use verbs. State uses nouns/adjectives.
- **Versioning**: Stable IDs for preset categories, command/event/state names. Additive evolution preferred. Renames require aliasing/migration, never silent breakage.
- **Performance guardrails**: Minimum interval for "Every" timers (≥ 50ms). Hard cap on active timers per script (e.g., 64). Guard recursion depth. No per-frame Blockly execution in v1 default.

---

## 15) Closeout
When a track is done:
- Append a summary to `/context/history.md` (include Track N, use the Entry Template).
- Clear `/context/active-track.md`.
- Ensure `INDEX.md`, `repo-map.md`, and `schema-registry.md` match reality.

If a track is stalled or abandoned:
- Follow the Stalled Track Protocol in `/context/active-track.md`.
- Record the incomplete track in `/context/history.md` under "Stalled / Abandoned Tracks".