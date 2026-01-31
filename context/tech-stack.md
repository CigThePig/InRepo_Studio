# Tech Stack

Purpose:
- Keep tooling/build/test/deploy decisions in one place.
- Help agents run the right commands without guessing.

---

## Repo conventions
- Root `AGENTS.md` defines global rules; local `AGENTS.md` files exist in key folders to scope instructions to the module being edited.
- GitHub Pages base path: project sites run under `/<repo>/`; build configs must set base accordingly.


## Runtime / platform
- Target platform: Mobile web (browser-based)
- Supported environments: iOS Safari 15+, Android Chrome 90+, desktop Chrome/Firefox/Safari (secondary)

## Language(s)
- Primary: TypeScript
- Secondary: HTML/CSS (minimal, canvas-based UI)

## Frameworks / libraries
- **Phaser 3**: Game runtime (tilemap rendering, game loop)
- **Vite**: Build tool and dev server
- **idb**: IndexedDB wrapper (or raw IndexedDB API)

## Build / run
- Install: `npm install`
- Dev: `npm run dev`
- Test: `npm test`
- Lint: `npm run lint`
- Build: `npm run build`
- Preview: `npm run preview`
- Deploy: Manual (via editor UI to GitHub)

## Dependencies policy
- OK to add: Well-maintained libraries that solve a specific problem (idb, etc.)
- Avoid: Large frameworks for small tasks, anything that bloats bundle size significantly
- Prefer: Phaser built-ins over external game libraries

## Testing strategy
- Unit tests: Schema validation, coordinate transforms, storage functions
- Integration tests: Round-trip storage (save → load), deploy flow mocking
- E2E / manual tests: Touch interactions, full editing workflow, playtest cycle

## Observability
- Logging: Console logs with prefixes (e.g., `[Storage]`, `[Canvas]`, `[Deploy]`)
- Metrics: Performance marks for render time, storage operation duration
- Debug mode: `?debug=true` query param for verbose logging

## Release / hosting
- Hosting: GitHub Pages (the game itself lives in the repo)
- Editor access: `?tool=editor` query param on the game URL
- Versioning: Git commits (no separate version numbers for editor)

## File structure (planned)
```
/game/                    # Deployed game files
  project.json            # Project manifest
  scenes/                 # Scene JSON files
  assets/                 # Tile images, sprites
  
/src/                     # Source code
  boot/                   # Entry point, mode detection
  storage/                # IndexedDB and fetch abstractions
  deploy/                 # GitHub auth + commit publishing
  editor/                 # Editor-only code
    canvas/
    panels/
    tools/
  runtime/                # Shared runtime code
  types/                  # TypeScript types/schemas
  
/public/                  # Static assets for dev
```