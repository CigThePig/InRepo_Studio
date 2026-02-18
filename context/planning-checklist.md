# Planning Checklist (Ritual for creating Tracks from Track Index)

Purpose:
- Generate spec/blueprint/plan reliably as the repo grows.
- Prevent drift by always pulling the same canonical inputs.
- Make "Create Track N" deterministic and repeatable.

Canonical Inputs (read before planning):
1) `/INDEX.md` — file inventory
2) `/context/track-index.md` — roadmap
3) `/context/product.md` — intent and scope
4) `/context/architecture.md` — invariants and apply semantics
5) `/context/schema-registry.md` — data contracts
6) `/context/repo-map.md` — module boundaries
7) `/context/history.md` — past learnings (once it has entries)

For implementation, also read:
8) `/context/tech-stack.md` — tooling and commands
9) `/context/code-style.md` — module rules

## Micro Track Checklist (low-risk/local changes)
Use a Micro Track only when the change does NOT touch schemas/persistence/auth/deploy/boot routing.

Micro Track steps:
- Confirm the change is local and low-risk.
- Write a Micro Plan (goal, files touched, steps, verification, stop point).
- Implement Phase 1 in the same run if requested.
- Verify with the smallest meaningful checks (smoke test, targeted unit test, lint).
- Update INDEX.md / schema-registry.md only if you actually changed file roles or lists-of-truth.


Golden rule:
- Do NOT plan from memory.
- Plans are derived from: Track Index + current repo state + Recon Summary.

---

## Step -1) Context Refresh (when resuming work)

If resuming after a break or switching agents, first re-orient:

### Codex prompt: CONTEXT REFRESH
```
Read AGENTS.md, then read:
- /context/active-track.md
- /context/history.md
- The active track files (spec.md, blueprint.md, plan.md)

Tell me:
1. What track is active and what phase we're in
2. What was completed in the last session
3. What's the next task according to plan.md
4. Any blockers or deviations noted

Do NOT write code yet. Just summarize the current state.
```

---

## Step 0) Choose scope
Default:
- Pick Track N from /context/track-index.md.

Custom:
- If user explicitly requests a custom track, write it in the same format as Track Index items
  (Goal, Includes, Acceptance, Risks, Verification).

---

## Step A) CREATE TRACK N (skeleton + artifacts)
When asked "Create Track N":

1) Create folder: /tracks/YYYY-MM-DD-track-N-short-slug/
2) Generate:
   - spec.md
   - blueprint.md (NO CODE)
   - plan.md
3) Update:
   - /context/active-track.md (point to the new folder)
   - /INDEX.md (add the new track folder)
   - /context/repo-map.md (if module boundaries change)

### Codex prompt: CREATE TRACK N (NO CODE)
Paste to Codex:

Read AGENTS.md and:
- /INDEX.md
- /context/track-index.md
- /context/repo-map.md
- /context/schema-registry.md
- /context/product.md
- /context/architecture.md
- /context/workflow.md
- /context/history.md

Task:
Create Track <N> exactly as defined in track-index.md.

Rules:
- Do not write code.
- Create the track folder /tracks/YYYY-MM-DD-track-<N>-<slug>/.
- Generate spec.md, blueprint.md (no code), plan.md.
- Plan must include phases mapped to the "Includes" steps for Track N.
- Each phase must include: tasks, files touched, verification, stop point.
- Include a "Recon Summary" section at the top of plan.md (can be empty initially).
- Update /context/active-track.md to point to this track.
- Update /INDEX.md with the new track folder entry.

---

## Step B) Recon (refresh relevant context WITHOUT bloat)
Goal:
- Identify what's relevant before blueprint/implementation.

Output (Recon Summary):
- Files likely to change (why)
- Key modules/functions involved (or "not found yet")
- Invariants to respect (from /context/architecture.md + AGENTS.md)
- Cross-module side effects (who depends on this? what could break?)
- Apply/rebuild semantics (does anything require an explicit apply/rebuild action?)
- Data migration impact (format changes, persistence, backwards-compat)
- File rules impact (new subsystem => new file; any file at risk of exceeding size limits?)
- Risks/regressions
- Verification commands/checks

Store Recon:
- Paste into tracks/<id>/plan.md under "Recon Summary".

### Codex prompt: RECON ONLY (NO CODE)
Read AGENTS.md, then read:
- /INDEX.md
- /context/repo-map.md
- /context/product.md
- /context/architecture.md
- /context/schema-registry.md
- /context/history.md
- the active track files

My change request is the active track scope.
Do NOT modify code.

Produce a Recon Summary with:
- files likely to change (why)
- key modules/functions involved
- invariants to respect
- cross-module side effects
- apply/rebuild semantics
- data migration impact
- file rules impact
- risks/regressions
- verification commands/checks

---

## Step C) Spec / Blueprint / Plan refinement
If the initial artifacts need tightening:
- Update spec.md first
- Then blueprint.md
- Then plan.md

Blueprint must contain NO CODE.
Plan must map directly to included steps from track-index.

**If the track touches settings or config**:
- Include a plan checkbox to document apply/rebuild semantics in /context/architecture.md

---

## Step D) Execute (Builder mode)
### Codex prompt: BUILD ONE PHASE ONLY
Read AGENTS.md and the active track.
Implement Phase <N> only.
- Follow plan.md precisely.
- Run verification for the phase.
- Update plan checkboxes.
- Update /INDEX.md if any files were added or roles changed.
- Update /context/repo-map.md if module boundaries changed.
- Update /context/schema-registry.md if any lists-of-truth changed.
- If settings/config touched: confirm apply/rebuild semantics in /context/architecture.md.
- If any file exceeds 450 lines: add refactor task to next phase.
Stop after Phase <N> is verified.

---

## Step E) Closeout
When track complete:
- Append summary to /context/history.md using the Entry Template (include Track N, verification, learnings).
- Clear /context/active-track.md.
- Ensure /INDEX.md and /context/repo-map.md match reality.

When track stalled or abandoned:
- Follow the Stalled Track Protocol in /context/active-track.md.
- Record in /context/history.md under "Stalled / Abandoned Tracks".