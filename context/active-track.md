Active track: Track 6 — Panels + Tile Picker

Completed tracks:
- Phase 0 (Foundation Architecture): Tracks 1-4 (Data Structures, Hot Storage, Cold Storage, Boot System)
- Track 5: Canvas System (viewport, gestures, grid)

Current track details:
- Track number: 6
- Track title: Panels + Tile Picker
- Track path: tracks/2026-01-31-track-6-panels/
- Track type: Full
- Current phase: Phase 1 (Panel Containers + Layout) — COMPLETED
- Next phase: Phase 2 (Toolbar + Layer Tabs) — already largely done, Phase 3 is Tile Picker
- Last updated: 2026-01-31

Phase 1 completed:
- EditorState schema updated with activeLayer and selectedTile fields
- topPanel.ts with expand/collapse and layer tabs
- bottomPanel.ts with expand/collapse and tool buttons
- panels/index.ts with exports
- init.ts integration with panel persistence
- Build verified: TypeScript compiles without errors

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
