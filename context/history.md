# History (append-only)

Purpose:
- Record what shipped, what was learned, and any follow-up needed.
- Useful for onboarding new agents and understanding past decisions.

---

## Entry Template (copy/paste)

### Track N — <Title>
- **Dates**: YYYY-MM-DD → YYYY-MM-DD
- **Status**: Completed | Stalled | Abandoned
- **Summary**: <1–2 sentences: what changed>
- **Shipped**:
  - <Key deliverable 1>
  - <Key deliverable 2>
- **Verification**: <How it was verified (manual + automated)>
- **Learned**: <What surprised you, what would you do differently>
- **Follow-up**: <Any deferred work, tech debt, or next steps>

---

## Completed Tracks

### Phase 0 — Foundation Architecture (Tracks 1–4)
- **Dates**: 2026-01-31
- **Status**: Completed
- **Summary**: Established the core data structures, storage layer, and boot system for InRepo Studio. Project scaffolding created with Vite, TypeScript, and Phaser.
- **Shipped**:
  - Track 1: TypeScript types for Project, Scene, Entity schemas with validation
  - Track 2: IndexedDB hot storage with idb library (save/load project, scenes, editor state)
  - Track 3: Cold storage fetch operations with migration support
  - Track 4: Boot system with mode router (editor vs game), entry point
  - Example project.json and main.json scene files
  - Placeholder editor and runtime init modules
- **Verification**:
  - TypeScript type-checking passes (tsc --noEmit)
  - Vite build completes successfully
  - Example JSON files conform to defined schemas
- **Learned**:
  - Need vite-env.d.ts for import.meta.env types
  - idb library provides clean IndexedDB wrapper
- **Follow-up**:
  - Track 5: Canvas System (pan/zoom/grid)
  - Track 6: Panels + Tile Picker

### Track 5 — Canvas System
- **Dates**: 2026-01-31
- **Status**: Completed
- **Summary**: Implemented the central workspace canvas with pan/zoom gestures and grid overlay. This is the foundation for all visual editing in InRepo Studio.
- **Shipped**:
  - Phase 1: Viewport state management with coordinate transforms (screen↔world↔tile)
  - Phase 2: Canvas controller with gesture handling (two-finger pan, pinch zoom)
  - Phase 3: Grid rendering with culling and 'G' toggle
  - ResizeObserver for responsive canvas sizing
  - Debounced viewport persistence to IndexedDB
- **Verification**:
  - TypeScript compiles without errors
  - Transform functions verified as inverses
  - Grid renders and scales correctly with zoom
  - Viewport state saved and restored on reload
- **Learned**:
  - Pointer events provide unified touch/mouse handling
  - 0.5px offset needed for crisp grid lines on non-retina displays
  - Debouncing viewport saves prevents excessive IndexedDB writes
- **Follow-up**:
  - Track 6: Panels + Tile Picker
  - Track 9: Touch Foundation (gesture refinements)

---

## Stalled / Abandoned Tracks

(none yet)
