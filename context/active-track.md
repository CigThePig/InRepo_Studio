Active track: Track 47 — Multi-tile Prop Zoom Anchor Fix — COMPLETE

Current phase: Track 47 — complete
Next task: Phase 7 planning (TBD)

Note: Track 41 (Left Berry Presets UI + Blockly Hooks) is complete.
Files delivered include: src/editor/presets/presetsTab.ts, categoryDetail.ts, knobEditor.ts,
blocklyHooksTab.ts, presetPicker.ts, issuesModal.ts, undoToast.ts; plus leftBerry/cockpit wiring.

Track planning documents:
- `/context/Blockly_Plan_Revised.md` (Parts 1–15 — the Blockly constitution)
- `/context/track-index.md` (Tracks 31–42)
- `/tracks/2026-02-19-track-42-inspect-errors-panel/spec.md`
- `/tracks/2026-02-19-track-42-inspect-errors-panel/blueprint.md`
- `/tracks/2026-02-19-track-42-inspect-errors-panel/plan.md`

Authority: `/context/Blockly_Plan_Revised.md`

---

Completed tracks:
- Phase 0 (Foundation Architecture): Tracks 1-4 (Data Structures, Hot Storage, Cold Storage, Boot System)
- Phase 1 (Editor Shell): Tracks 5-9 (Canvas, Panels, Tilemap Rendering, Paint Tool, Touch Foundation)
- Phase 2 (Playtest & Deploy): Tracks 10-11 (Playtest Bridge, Runtime Loader)
- Phase 2 (Playtest & Deploy): Track 12 (Authentication)
- Phase 2 (Playtest & Deploy): Track 13 (Deploy Flow)
- Phase 3 (Full Tilemap Editing): Track 14 (Erase Tool)
- Phase 3 (Full Tilemap Editing): Track 15 (Select Tool)
- Phase 3 (Full Tilemap Editing): Track 16 (Undo/Redo System)
- Phase 3 (Full Tilemap Editing): Track 17 (Scene Management)
- Phase 3 (Full Tilemap Editing): Track 18 (Layer System)
- Phase 4 (Entity System): Tracks 19-22 (Entity Palette, Entity Placement, Entity Manipulation, Property Inspector)
- Editor Architecture Migration: Tracks 23–30 (mode-driven UI, berries, asset library — complete)
- Phase 5 (Presets + Blockly): Track 31 (Game API Contract + Types)
- Phase 5 (Presets + Blockly): Track 32 (Preset Schema + Definition Types)
- Phase 5 (Presets + Blockly): Track 33 (Script Envelope + Storage)
- Phase 5 (Presets + Blockly): Track 34 (Preset Registry + PresetManager)
- Phase 5 (Presets + Blockly): Track 35 (SceneHost + ApiContext Runtime)
- Phase 5 (Presets + Blockly): Track 36 (ScriptHost Engine)
- Phase 5 (Presets + Blockly): Track 37 (Schema-Driven Block Generation)
- Phase 5 (Presets + Blockly): Track 38 (Core Block Definitions)
- Phase 5 (Presets + Blockly): Track 39 (Blockly Workspace UI — Cockpit)
- Phase 5 (Presets + Blockly): Track 40 (Right Berry Blocks Palette)
- Phase 5 (Presets + Blockly): Track 41 (Presets UI + Blockly Hooks)
- Phase 5 (Presets + Blockly): Track 42 (Right Berry Inspect/Errors Panel)
- Phase 6 (Integration + Polish): Track 43 (UX Polish — Foundation + Save/Deploy)
- Phase 6 (Integration + Polish): Track 44 (UX Polish — Assets + Animations)
- Phase 6 (Integration + Polish): Track 45 (UX Polish — Entities + Tilemap)
- Phase 6 (Integration + Polish): Track 46 (UX Polish — State Machine + Empty States + Audit)

Note: Phase 2 completed the vertical slice MVP: edit → playtest → deploy → verify on live site.
Phase 3 Full Tilemap Editing is now complete with scene management and layer visibility/lock controls.
Phase 4 Entity System is now complete.
Editor Architecture Migration is now complete. The editor uses mode-driven architecture per `/context/editor-architecture.md`.
Phase 5 (Presets + Blockly) is now complete. Tracks 31–42 delivered the full Blockly + Presets feature set.
Phase 6 (Integration + Polish) is now complete. Tracks 43–46 wired uxFeedback into all editor systems and implemented standardized empty states.

Last updated: 2026-02-21

---

## Context Refresh Prompt (optional, use only when needed)

Use this prompt only when:
- resuming after a long break (hours/days),
- switching models/agents,
- you suspect drift or confusion,
- or before high-risk tracks (schemas, storage, boot, auth, deploy).

Paste this to your agent:

"""
Read `/AGENTS.md` first.

Then read:
- `/INDEX.md`
- `/context/repo-map.md`
- `/context/schema-registry.md`
- `/context/architecture.md`
- `/context/active-track.md`
- the active track's `spec.md` / `blueprint.md` / `plan.md` (if any)

Now respond with:
1) Current track + phase + next task (as written in active-track.md / plan.md).
2) The invariants that apply to this work (hot/cold, deploy vs playtest, editor/runtime separation, offline-after-load).
3) A list of files you intend to touch and why each is necessary.
4) The verification steps you will run for this phase.
5) Any conflicts, missing info, or risks you see before coding.
"""

---

## Stalled Track Protocol

If a track cannot continue (blocked, deprioritized, or abandoned):

1. Update this file:
   - Active track: (stalled) or (abandoned)
   - Reason: <why it stopped>

2. Add an entry to `/context/history.md` under "Stalled / Abandoned Tracks":
   - Include: what was completed, why it stopped, any salvageable work

3. If resuming later:
   - Decide: continue the old track or start fresh
   - If continuing: update active-track.md and pick up from plan.md
   - If starting fresh: create a new track that incorporates learnings
