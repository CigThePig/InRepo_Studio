# InRepo Studio — Track Index: Phase 7 (Asset System + Painting Overhaul)

Generated: 2026-02-24

---

## Dependency order

```
Track 47 (prop zoom fix)          — standalone, no deps
Track 48 (berry mutual exclusion) — standalone, no deps
Track 49 (source classification)  — standalone; unlocks 50, 51, 52
Track 50 (asset subtabs)          — needs 49
Track 51 (asset capsule)          — needs 49 (for isSource filtering)
Track 52 (touch interaction)      — needs 51 (capsule), 50 (move-to types)
Track 53 (grouping + palette)     — needs 49, 50
Track 54 (animation tab restore)  — needs 49 (isSource filter in frame picker)
Track 55 (animated tile lifecycle)— needs 49, 51, 54
Track 56 (random paint group)     — needs 53 (backlog)
```

Suggested execution order: 47 → 48 → 49 → 51 → 50 → 52 → 53 → 54 → 55 → 56

---

## Track summaries

### Track 47 — Multi-tile Prop Zoom Anchor Fix
**Status**: Ready  
**Effort**: Small (1–2 phases)  
**Files**: `src/editor/canvas/renderer.ts`  
**Issue resolved**: K1 — Multi-tile props shift on zoom change  

### Track 48 — Berry Panel Mutual Exclusion
**Status**: Ready  
**Effort**: Small  
**Files**: `src/editor/panels/berryShell.ts`, `src/editor/init.ts`  
**Issue resolved**: C1 — Left berry does not block right berry  

### Track 49 — Asset Source Classification + "Can't Paint" Silence
**Status**: Ready  
**Effort**: Medium (4 phases)  
**Files**: `assetRegistry.ts`, `assetGroup.ts`, `atlasImporter.ts`, `spriteAtlasRehydrate.ts`, `tilePicker.ts`, `assetPalette.ts`, `assetLibraryTab.ts`, `init.ts`  
**Issues resolved**: A1, A2 — Source spritesheets in paintable lists; refresh paint error  

### Track 50 — Asset Library Subtabs + Cross-Tab Reclassification
**Status**: Needs Track 49  
**Effort**: Medium (4 phases)  
**Files**: `assetLibraryTab.ts`, `assetRegistry.ts`  
**Issues resolved**: A3, M1 — Overloaded Assets tab; cross-tab asset moving  

### Track 51 — Asset Capsule Component Unification
**Status**: Needs Track 49  
**Effort**: Medium (4 phases)  
**New file**: `src/editor/panels/assetCapsule.ts`  
**Files**: `assetLibraryTab.ts`, `tilePicker.ts`, `assetPalette.ts`, `entitiesTab.ts`  
**Issues resolved**: B1, B2, B3, B4 — Inconsistent card UI; label overflow in Ground and Props tabs  

### Track 52 — Touch Interaction Overhaul
**Status**: Needs Track 51 (capsule), Track 50 (move-to types)  
**Effort**: Large (4 phases)  
**New file**: `src/editor/panels/assetSettingsPopup.ts`  
**Files**: `assetLibraryTab.ts`, `assetCapsule.ts`  
**Issues resolved**: D1, D2, E1, E2, E3, L1–L5 — 3-dot overlay, organize mode, long-press spec, multi-select  

### Track 53 — Asset Grouping System + Painting Palette Integration
**Status**: Needs Tracks 49, 50  
**Effort**: Large (4 phases)  
**Files**: `assetGroup.ts`, `assetLibraryTab.ts`, `assetPalette.ts`, `bottomPanel.ts`, `paint.ts`  
**Issues resolved**: F1, F2, F3, G1 — Named groups, grid layout, palette group order, bottom bar tile strip  

### Track 54 — Animation Tab Restore + Repo-Asset Source Picker
**Status**: Needs Track 49  
**Effort**: Medium (4 phases)  
**Files**: `animationTab.ts`  
**Issues resolved**: I1, I2, I3 — Animation tab CSS regression, missing bottom actions, device-only file picker  

### Track 55 — Animated Tile Lifecycle
**Status**: Needs Tracks 49, 51, 54  
**Effort**: Large (4 phases)  
**Files**: `assetRegistry.ts`, `tilePicker.ts`, `assetPalette.ts`, `assetLibraryTab.ts`, `paint.ts`, `renderer.ts`, `src/types/`  
**Issues resolved**: J1, J2 — Paint animated tiles directly; hide from static list after flagging  

### Track 56 — Random Paint Group (Backlog)
**Status**: Needs Track 53 — implement last  
**Effort**: Small–medium (3 phases)  
**Files**: `assetGroup.ts`, `assetLibraryTab.ts`, `assetPalette.ts`, `paint.ts`  
**Issues resolved**: H1 — Random variant painting  

---

## Schema changes introduced by this phase

| Field | Type | Owner | Track |
|---|---|---|---|
| `AssetEntry.isSource` | `boolean?` | `assetRegistry.ts` | 49 |
| `AssetGroupType` `'sources'` | lookup | `assetGroup.ts` | 49 |
| `AssetEntry.isAnimatedTile` | `boolean?` | `assetRegistry.ts` | 55 |
| `AssetEntry.animationId` | `string?` | `assetRegistry.ts` | 55 |
| `TileCell.animRef` | `string?` | `src/types/` | 55 |
| `AssetGroup.gridHint` | `{ cols: number }?` | `assetGroup.ts` | 53 |
| `AssetGroup.isRandomGroup` | `boolean?` | `assetGroup.ts` | 56 |
