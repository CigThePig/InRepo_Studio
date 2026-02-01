Active track: (none — ready for next track)

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

Prepared tracks (planning artifacts created):
- (none pending)

Next tracks to implement (in order):
1. Track 19: Entity Tool — Place and edit entities
2. Track 20: Entity Inspector — Property editing panel

Note: Phase 2 completed the vertical slice MVP: edit → playtest → deploy → verify on live site.
Phase 3 Full Tilemap Editing is now complete with scene management and layer visibility/lock controls.

Last updated: 2026-02-01

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
