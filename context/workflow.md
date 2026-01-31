# Workflow (Track Index → Recon → Spec → Blueprint → Plan → Build → Verify → Closeout)

## Core idea
Work is organized into **Tracks** (bounded units of change) with explicit verification.

## Track definition
A Track is a single unit of work from `context/track-index.md` (or an explicitly defined custom track) that produces a verifiable improvement.

## Track types (proportional planning)
### Full Tracks (default for high-risk work)
Use Full Tracks when touching schemas, persistence, boot routing, auth, deploy, or wide refactors.
Required artifacts:
- `spec.md` (what/why/acceptance)
- `blueprint.md` (technical design: files/APIs/state/risks; **NO CODE**)
- `plan.md` (phases + verification per phase + stop points)

### Micro Tracks (allowed for low-risk/local work)
Use Micro Tracks for UI polish, local tool UX tweaks, small bug fixes, and isolated perf work that does not change schemas or persistence formats.
Minimum artifact:
- Micro Plan (may live in `plan.md`): goal, files touched, steps, verification, stop point.

## Docs-only phases policy
Docs-only phases are allowed only when:
- creating a track (spec/blueprint/plan),
- resolving drift between registries and code,
- or designing high-risk work before implementation.
Otherwise, each phase should ship working behavior (code/tests) plus any doc updates.

## Required per Full Track
- `spec.md`
- `blueprint.md`
- `plan.md`
- Update the following when relevant:
  - `INDEX.md` (file roles + lists-of-truth names)
  - `context/repo-map.md` (module boundaries)
  - `context/schema-registry.md` (schema-like lists-of-truth)

If new info changes the approach:
- Write a Deviation Note in plan.md
- Update blueprint/plan before continuing

## Closeout (completed tracks)
- Append summary to `context/history.md` using the Entry Template (Track N + verification + learnings)
- Clear `context/active-track.md`
- Ensure `INDEX.md` matches reality

## Stalled / Abandoned tracks
If a track cannot continue:
- Follow the Stalled Track Protocol in `context/active-track.md`
- Record in `context/history.md` under "Stalled / Abandoned Tracks"
- Include: what was completed, why it stopped, salvageable work
