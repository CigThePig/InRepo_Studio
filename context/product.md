# Product

One sentence:
- InRepo Studio is a mobile-first, browser-based game editor that lives inside GitHub repositories, enabling editing and deployment of Phaser/Vite games directly from a phone.

Primary users:
- Mobile game developers who want to edit tilemaps and place entities without a desktop
- Hobbyist developers who build games on their phones using AI-assisted workflows
- Anyone who wants to make quick edits to a Phaser game from anywhere

Goals (what "success" looks like):
- Edit tilemaps with touch gestures that feel natural (paint, erase, select)
- Place and configure entities with a property inspector
- Playtest changes instantly without deploying
  - Playtest reads from hot storage (IndexedDB) for instant iteration.
- Deploy changes to GitHub Pages with one tap
  - Deploy publishes hot → repo (cold); Pages rebuild latency is expected.
- Work offline and sync when connected

Non-goals (explicitly out of scope for now):
- Desktop-optimized UI (mobile-first only)
- Code editing (this is not a code editor)
- Asset creation tools (import only, no drawing/sprite editing)
- Multi-user collaboration (single-user editing only)
- Version control UI (deploy only, no branch/merge)

Pillars (non-negotiables):
- **Mobile-first**: Every interaction must work well with touch
- **Repository-resident**: All project data lives in the repo as JSON
- **Instant feedback**: Playtest without deploy, see changes immediately
- **Offline capable**: Full editing works without network after initial load

Constraints:
- Security: PAT is user-supplied; default storage is session-only, with optional persistent storage on explicit opt-in.
- Platform: Mobile web browsers (iOS Safari, Android Chrome)
- Performance: 60fps canvas rendering at typical mobile resolutions
- Reliability: No data loss - auto-save to IndexedDB, manual deploy to GitHub
- Storage: IndexedDB for hot storage, GitHub fetch for cold storage

Observability (how you know it's working):
- Tiles paint where expected with correct touch offset
- Playtest launches with current hot storage data
- Deploy commits correct files to GitHub
- Export/import round-trips cleanly

Release shape:
- MVP (Vertical Slice): Paint tiles → playtest → deploy → verify on live site
- Next: Full tilemap editing (layers, erase, select/copy/paste)
- Later: Entity system, settings, mobile UX polish