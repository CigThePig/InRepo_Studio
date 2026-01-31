# InRepo Studio — Context-First Development

This repository uses a context-first approach for AI-assisted development.

The core idea: keep the project's working memory inside the repo (docs + registries), so agents (and future-you) don't guess.

---


## Instruction scoping (why local AGENTS.md exists)
This template uses a layered instruction system:
- Root `/AGENTS.md` = global invariants + workflow gates.
- Local `AGENTS.md` in key folders = module-specific rules.

Agents should read only the local rules relevant to the files they are about to touch. This reduces token waste and prevents cross-module mistakes.

## What is InRepo Studio?

A mobile-first, browser-based game editor that lives inside GitHub repositories. Edit tilemaps, place entities, playtest, and deploy Phaser/Vite games directly from your phone.

---

## Setup checklist

1) Clone this repo
2) Review the project-specific docs:
   - `/context/product.md` (purpose, user value, scope boundaries)
   - `/context/architecture.md` (invariants, modules, data flow, apply/rebuild semantics)
   - `/context/tech-stack.md` (tools, build, deploy, test)
   - `/context/track-index.md` (the complete 29-track roadmap)
3) Understand the file inventory:
   - `/INDEX.md` (all files + 1-line role + lists-of-truth names)
4) Start with Track 1 from `/context/track-index.md`

---

## Repo structure (context-first)

- `AGENTS.md`
  - rules and constraints for AI coding help

- `INDEX.md`
  - full file list + short description of each file
  - includes a short "lists-of-truth" line per file (names only)

- `context/`
  - `track-index.md` — roadmap as 29 Tracks (converted from phases)
  - `planning-checklist.md` — how to create tracks (spec → blueprint → plan)
  - `repo-map.md` — module map (how major parts connect)
  - `schema-registry.md` — canonical inventory of JSON schemas and lists-of-truth
  - `product.md` — product intent + scope boundaries
  - `architecture.md` — invariants + module/data flow
  - `workflow.md` — lifecycle rules
  - `active-track.md` — pointer to the current track and phase
  - `history.md` — append-only track summaries

- `tracks/`
  - `YYYY-MM-DD-track-N-slug/` containing `spec.md`, `blueprint.md`, `plan.md`

- `game/` (created during Track 1)
  - `project.json` — project manifest
  - `scenes/` — scene JSON files
  - `assets/` — tile images, sprites

- `src/` (created starting Track 1)
  - source code organized by module

---

## How work happens here (human or agent)

1) Pick Track N from `/context/track-index.md`.
2) Create track artifacts (planning only): `spec.md`, `blueprint.md` (no code), `plan.md`.
3) Execute **one phase at a time**, verify, then stop for review.
4) Keep context in sync as you go:
   - update `INDEX.md` if file roles change
   - update `/context/repo-map.md` if module boundaries move
   - update `/context/schema-registry.md` (and file SCHEMA INVENTORY headers) if lists-of-truth change

---

## Critical Path (Vertical Slice)

The minimum path to a working editor:

```
Track 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 10 → 11 → 12 → 13
```

1. **Track 1**: Data Structures — Define JSON schemas
2. **Track 2**: Hot Storage — IndexedDB persistence
3. **Track 3**: Cold Storage — Fetch from repository
4. **Track 4**: Boot System — Mode routing
5. **Track 5**: Canvas System — Pan/zoom/grid
6. **Track 6**: Panels + Tile Picker — UI shell
7. **Track 7**: Tilemap Rendering — Display tiles
8. **Track 8**: Paint Tool — Place tiles
9. **Track 10**: Playtest Bridge — Test locally
10. **Track 11**: Runtime Loader — Phaser integration
11. **Track 12**: Authentication — GitHub PAT
12. **Track 13**: Deploy Flow — Commit to repo

**Note**: Track 9 (Touch Foundation) refines gesture handling but is not required for MVP. Include it if touch interactions feel imprecise.

After Track 13: open editor → paint tiles → playtest → deploy → verify on live site.