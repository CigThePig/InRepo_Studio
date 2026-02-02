# Tracks 23-30: Editor V2 Migration — Blueprint

## Overview

This blueprint details the technical design for migrating InRepo Studio to the Editor V2 architecture. The migration transforms the editor from a layer+tool dual-state system to a mode-driven architecture with clearly defined UI regions.

**Authority:** `/context/editor-v2-architecture.md` is the source of truth for all design decisions.

---

## Architecture Overview

### Target UI Regions

```
+------------------------------------------+
| TOP BAR (global only)                    |
| [Undo] [Redo]              [Settings] [▶]|
+------------------------------------------+
|                                          |
| LEFT        CANVAS           RIGHT       |
| BERRY       (workspace)      BERRY       |
| (asset                       (world      |
|  pipeline)                   editing)    |
|                                          |
+------------------------------------------+
| BOTTOM BAR (selection + context actions) |
| [Select]        [Copy][Paste][Delete]... |
+------------------------------------------+
```

### Target State Model

```typescript
// Primary editing state (replaces layer+tool dual-state)
type EditorMode = 'select' | 'ground' | 'props' | 'entities' | 'collision' | 'triggers';

interface EditorV2State {
  editorMode: EditorMode;
  selectionState: SelectionState;
  activePaletteSelection: PaletteSelection | null;
  rightBerryOpen: boolean;
  leftBerryOpen: boolean;
}
```

---

## Module Structure

### New Files

```
src/editor/
├── v2/
│   ├── index.ts                    # V2 public exports
│   ├── editorMode.ts               # Mode state management
│   ├── modeMapping.ts              # Legacy tool/layer → mode mapping
│   └── featureFlags.ts             # V2 feature flag management
│
├── panels/
│   ├── bottomContextStrip.ts       # Track 23: Selection action strip
│   ├── topBarV2.ts                 # Track 24: Global-only top bar
│   ├── rightBerry.ts               # Track 25: Right berry shell
│   ├── rightBerryTabs.ts           # Track 25: Mode tab definitions
│   ├── entitiesTab.ts              # Track 26: Entities mode UI
│   ├── leftBerry.ts                # Track 27: Left berry shell
│   ├── spriteSlicerTab.ts          # Track 27: Sprite slicing tool
│   └── assetLibraryTab.ts          # Track 28: Asset library UI
│
├── assets/
│   ├── index.ts                    # Asset module exports
│   ├── assetRegistry.ts            # Track 28: In-editor asset registry
│   ├── assetGroup.ts               # Track 28: Group management
│   ├── spriteSlider.ts             # Track 27: Slicing logic
│   └── groupSlugify.ts             # Track 29: Name → folder slug
│
└── deploy/
    └── assetUpload.ts              # Track 30: Asset upload to GitHub
```

### Modified Files

```
src/editor/
├── init.ts                         # Wire V2 components
├── panels/
│   ├── bottomPanel.ts              # Add context strip integration
│   ├── topPanel.ts                 # Migrate to V2 or replace
│   ├── selectionBar.ts             # Add feature flag, deprecate
│   ├── entitySelectionBar.ts       # Add feature flag, deprecate
│   └── propertyInspector.ts        # Deprecate (move to entitiesTab)

src/storage/
└── hot.ts                          # Add EditorV2State fields

src/types/
└── editor.ts                       # Add EditorMode, EditorV2State types
```

---

## Track 23: Bottom Interaction Strip

### Design

**Bottom Bar Layout:**
```
+------------------------------------------+
| [Select Tool]        [Context Actions...] |
+------------------------------------------+
        ↑                      ↑
   Persistent anchor     Dynamic based on selection
```

**Context Actions by Selection Type:**

| Selection Type | Actions |
|---------------|---------|
| None | (empty or default tools) |
| Tiles | Move, Copy, Paste, Delete, Fill, Cancel |
| Entities | Duplicate, Delete, Clear Selection |
| Triggers | Edit, Resize, Delete, Duplicate |

### State

```typescript
interface BottomContextStripState {
  selectionType: 'none' | 'tiles' | 'entities' | 'triggers';
  actions: ContextAction[];
}

interface ContextAction {
  id: string;
  icon: string;
  label: string;
  onTap: () => void;
  disabled?: boolean;
}
```

### Integration Points

- Listens to `selectTileController` for tile selection changes
- Listens to `entitySelection` for entity selection changes
- Renders actions based on current selection type
- Feature flag: `EDITOR_V2_BOTTOM_STRIP`

---

## Track 24: Top Bar Globalization

### Design

**Top Bar V2 Layout:**
```
+------------------------------------------+
| [↶ Undo] [↷ Redo]    [Scene: Level 1 ▾]  |
|                          [⚙] [▶ Play]    |
+------------------------------------------+
```

**Removed from Top Bar:**
- Layer tabs/selector
- Tool-specific controls
- Mode-dependent elements

### State

Top bar is stateless regarding mode. It only reflects:
- Undo/redo availability (from historyManager)
- Current scene name
- Settings/Play as static buttons

### Integration Points

- Undo/Redo: wire to `historyManager.undo()` / `historyManager.redo()`
- Settings: open settings panel/modal (existing or placeholder)
- Play: trigger playtest (existing playtestBridge)

---

## Track 25: Right Berry Shell + Mode State

### Design

**Right Berry Structure:**
```
+------------------+
| [G][P][E][C][T]  |  ← Tab bar (Ground, Props, Entities, Collision, Triggers)
+------------------+
|                  |
| Tab Content      |  ← Palette/tools for current mode
| (scrollable)     |
|                  |
+------------------+
| [Close ×]        |  ← Close button
+------------------+
```

**Mode State Machine:**
```
                    ┌─────────────┐
         open tab   │             │  close berry
    ┌──────────────►│ ground/etc  │──────────────┐
    │               │             │              │
    │               └─────────────┘              │
    │                     ▲                      ▼
    │                     │ switch tab     ┌─────────┐
    │                     └────────────────│ select  │
    │                                      └─────────┘
    │                                           │
    └───────────────────────────────────────────┘
                       open berry
```

### State

```typescript
interface EditorModeState {
  editorMode: EditorMode;
  rightBerryOpen: boolean;
  activeTab: EditorMode | null;  // null when closed
}

// Mode → legacy mapping (for gradual migration)
const MODE_TO_LAYER: Record<EditorMode, LayerType | null> = {
  select: null,
  ground: 'ground',
  props: 'props',
  entities: null,  // entities layer is conceptual
  collision: 'collision',
  triggers: 'triggers',
};

const MODE_TO_TOOL: Record<EditorMode, ToolType> = {
  select: 'select',
  ground: 'paint',
  props: 'paint',  // props use placement, similar to paint
  entities: 'entity',
  collision: 'paint',
  triggers: 'entity',  // triggers are entity-like
};
```

### Integration Points

- Tab switch updates `editorMode`
- Mode change notifies canvas, tools, bottom bar
- Berry close triggers `editorMode = 'select'`
- Persists `editorMode` and `rightBerryOpen` to EditorState

---

## Track 26: Entities Mode + Move-First Behavior

### Design

**Entities Tab Content:**
```
+------------------+
| Entity Palette   |
| [◆ Player      ] |
| [◆ Enemy       ] |
| [◆ NPC         ] |
| [◆ Collectible ] |
+------------------+
| Selected Entity  |
| ─────────────── |
| Name: enemy_01   |
| Type: Enemy      |
|                  |
| Properties:      |
| health: [100]    |
| speed:  [1.5]    |
| patrol: [✓]      |
+------------------+
```

**Move-First Behavior:**
```
Tap entity → Select → Drag immediately available
                    → Properties shown in tab (not popup)
```

### State

```typescript
interface EntitiesTabState {
  selectedEntityType: string | null;  // for placement
  selectedEntityIds: string[];        // selected instances
  showPropertyEditor: boolean;        // show inline editor
}
```

### Migration from Legacy

| Legacy | V2 |
|--------|-----|
| Tap entity → popup inspector | Tap entity → select, show in tab |
| Tap popup "Move" → drag mode | Tap → immediate drag capability |
| Property edits in popup | Property edits in Entities tab |

### Integration Points

- Reuses `entityManager` for CRUD
- Reuses `entitySelection` for tracking
- Replaces `propertyInspector.ts` usage
- Entity renderer unchanged

---

## Track 27: Left Berry Shell + Sprite Slicing MVP

### Design

**Left Berry Structure:**
```
+------------------+
| [Sprites][Assets]|  ← Tab bar
+------------------+
|                  |
| Sprites Tab:     |
|                  |
| [Import Image]   |
|                  |
| Slice Size:      |
| [16×16 ▾]        |
|                  |
| +──────────────+ |
| │ ┌──┬──┬──┐  │ |  ← Preview with grid overlay
| │ ├──┼──┼──┤  │ |
| │ └──┴──┴──┘  │ |
| +──────────────+ |
|                  |
| [Confirm Slice]  |
+------------------+
```

**Sprite Slicer Flow:**
```
1. Import image → store as temporary blob
2. Select slice size → render grid overlay
3. Preview slices → show individual cells
4. Confirm → create sprite entries in registry
```

### State

```typescript
interface SpriteSlicerState {
  importedImage: Blob | null;
  imageUrl: string | null;  // object URL for preview
  imageWidth: number;
  imageHeight: number;
  sliceWidth: number;   // 16, 32, or custom
  sliceHeight: number;
  previewSlices: SlicePreview[];
}

interface SlicePreview {
  x: number;
  y: number;
  width: number;
  height: number;
}
```

### Integration Points

- File input for image import
- Canvas for grid overlay preview
- Output to `assetRegistry` (Track 28)

---

## Track 28: Asset Library + Grouping System

### Design

**Asset Library Tab:**
```
+------------------+
| Assets Library   |
+------------------+
| Groups:          |
| ▼ tilesets       |
|   ├─ grassland   |
|   └─ dungeon     |
| ▼ props          |
|   ├─ trees       |
|   └─ rocks       |
| ▼ entities       |
|   ├─ player      |
|   └─ enemies     |
+------------------+
| Selected: trees  |
| [Use in Editor]  |
+------------------+
```

### State

```typescript
interface AssetRegistry {
  groups: AssetGroup[];
}

interface AssetGroup {
  type: 'tilesets' | 'props' | 'entities';
  name: string;          // display name
  slug: string;          // folder-safe name
  assets: AssetEntry[];
  source: 'local' | 'repo';  // local = not yet uploaded
}

interface AssetEntry {
  id: string;
  name: string;
  type: 'tile' | 'sprite' | 'entity';
  source: AssetSource;
  metadata: AssetMetadata;
}

type AssetSource =
  | { type: 'blob'; data: Blob }
  | { type: 'url'; url: string }
  | { type: 'repo'; path: string };
```

### Integration Points

- Receives sliced sprites from `spriteSlider`
- Provides assets to right berry palettes
- Syncs with GitHub folder structure (Track 29)

---

## Track 29: GitHub Folder ↔ Group Mirroring

### Design

**Canonical Paths:**
```
game/assets/
├── tilesets/
│   ├── grassland/
│   │   ├── grass.png
│   │   └── dirt.png
│   └── dungeon/
│       └── stone.png
├── props/
│   ├── trees/
│   │   ├── oak.png
│   │   └── pine.png
│   └── rocks/
└── entities/
    └── goblin/
        ├── idle.png
        └── walk.png
```

**Slug Rules:**
```typescript
function slugifyGroupName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')      // spaces → hyphens
    .replace(/[^a-z0-9-]/g, '') // remove unsafe chars
    .replace(/-+/g, '-')        // collapse multiple hyphens
    .replace(/^-|-$/g, '');     // trim hyphens
}

// Examples:
// "My Trees" → "my-trees"
// "Goblins & Orcs" → "goblins-orcs"
// "  Spaced  " → "spaced"
```

### State

```typescript
interface RepoAssetManifest {
  scannedAt: number;
  groups: RepoGroupEntry[];
}

interface RepoGroupEntry {
  type: 'tilesets' | 'props' | 'entities';
  slug: string;
  path: string;  // full path: game/assets/props/trees
  files: string[];
}
```

### Integration Points

- Scans repo via GitHub API (cold storage fetch)
- Builds group list from folder structure
- Merges with local (unsaved) groups
- Provides path for upload operations

---

## Track 30: Asset Upload + Editor V2 Completion

### Design

**Upload Flow:**
```
1. User confirms asset group assignment
2. Build commit payload:
   - path: game/assets/{type}/{slug}/{filename}
   - content: base64-encoded blob
3. Use existing commit.ts for GitHub API
4. Update assetRegistry source to 'repo'
5. Refresh asset manifest from repo
```

**Layer Panel Behavior:**
```typescript
interface EditorPreferences {
  showLayerPanel: boolean;  // default: false
  // ... other prefs
}
```

Layer panel becomes accessible via Settings → Advanced, but hidden by default.

### Integration Points

- Uses `commit.ts` for GitHub commits
- Uses `auth.ts` for authentication
- Updates `assetRegistry` after upload
- Feature flag: `EDITOR_V2_HIDE_LAYER_PANEL`

---

## State Persistence

### EditorState Additions

```typescript
interface EditorState {
  // ... existing fields

  // V2 additions
  editorMode: EditorMode;
  rightBerryOpen: boolean;
  leftBerryOpen: boolean;
  assetRegistry: AssetRegistry;
  repoAssetManifest: RepoAssetManifest | null;
}
```

### Migration

```typescript
function migrateEditorState(state: any): EditorState {
  return {
    ...state,
    // V2 defaults
    editorMode: state.editorMode ?? 'select',
    rightBerryOpen: state.rightBerryOpen ?? false,
    leftBerryOpen: state.leftBerryOpen ?? false,
    assetRegistry: state.assetRegistry ?? { groups: [] },
    repoAssetManifest: state.repoAssetManifest ?? null,
  };
}
```

---

## Feature Flags

```typescript
const EDITOR_V2_FLAGS = {
  BOTTOM_CONTEXT_STRIP: 'editor_v2_bottom_strip',
  TOP_BAR_GLOBAL: 'editor_v2_top_bar',
  RIGHT_BERRY: 'editor_v2_right_berry',
  ENTITY_MOVE_FIRST: 'editor_v2_entity_move_first',
  LEFT_BERRY: 'editor_v2_left_berry',
  ASSET_LIBRARY: 'editor_v2_asset_library',
  REPO_MIRRORING: 'editor_v2_repo_mirroring',
  ASSET_UPLOAD: 'editor_v2_asset_upload',
  HIDE_LAYER_PANEL: 'editor_v2_hide_layer_panel',
};
```

All flags default to `true` after their respective track completes.
Legacy systems removed after Track 30 verification.

---

## API Contracts

### EditorMode API

```typescript
// Get current mode
function getEditorMode(): EditorMode;

// Set mode (triggers UI updates)
function setEditorMode(mode: EditorMode): void;

// Subscribe to mode changes
function onEditorModeChange(callback: (mode: EditorMode) => void): () => void;
```

### Right Berry API

```typescript
interface RightBerry {
  open(tab?: EditorMode): void;
  close(): void;
  isOpen(): boolean;
  getCurrentTab(): EditorMode | null;
  setTab(tab: EditorMode): void;
}
```

### Asset Registry API

```typescript
interface AssetRegistryAPI {
  // Groups
  getGroups(type?: AssetGroupType): AssetGroup[];
  createGroup(type: AssetGroupType, name: string): AssetGroup;
  deleteGroup(slug: string): void;

  // Assets
  addAsset(groupSlug: string, asset: AssetEntry): void;
  removeAsset(assetId: string): void;
  getAsset(assetId: string): AssetEntry | null;

  // Sync
  refreshFromRepo(): Promise<void>;
  uploadGroup(groupSlug: string): Promise<CommitResult>;
}
```

---

## Edge Cases

### Track 23
- Selection cleared while context strip visible → hide actions
- Multiple selection types → prioritize (entities > tiles)

### Track 25
- Berry opened via swipe → set mode to last used tab
- All tabs disabled → fallback to select mode (shouldn't happen)

### Track 26
- Entity deleted while properties shown → clear selection, hide editor
- Property validation fails → show inline error, don't save

### Track 27
- Image too large → show warning, allow continue or cancel
- Non-power-of-2 slice size → show warning about edge cells

### Track 28
- Duplicate group names → append number (trees-2)
- Empty group → allow, show placeholder

### Track 29
- Folder name conflicts with slug → use existing folder name
- Nested folders → flatten to single level

### Track 30
- Upload fails mid-batch → report partial success, allow retry
- Concurrent edits → existing conflict detection handles this

---

## Performance Considerations

1. **Berry Rendering**: Only render active tab content
2. **Asset Previews**: Lazy-load thumbnails, use placeholders
3. **Repo Scanning**: Cache manifest, refresh on demand only
4. **Image Slicing**: Use OffscreenCanvas if available
5. **Context Strip**: Minimal re-renders on selection change

---

## Testing Strategy

### Unit Tests
- Mode state transitions
- Slug generation
- Asset registry CRUD
- Feature flag behavior

### Integration Tests
- Berry open/close with mode changes
- Selection → context strip update
- Asset slice → library → palette flow

### Manual Tests
- Full workflow on mobile device
- Touch interactions for berry swipe
- Upload flow with real GitHub repo

---

## Files Created Summary

| Track | New Files |
|-------|-----------|
| 23 | `bottomContextStrip.ts` |
| 24 | `topBarV2.ts` |
| 25 | `editorMode.ts`, `modeMapping.ts`, `featureFlags.ts`, `rightBerry.ts`, `rightBerryTabs.ts` |
| 26 | `entitiesTab.ts` |
| 27 | `leftBerry.ts`, `spriteSlicerTab.ts`, `spriteSlider.ts` |
| 28 | `assetLibraryTab.ts`, `assetRegistry.ts`, `assetGroup.ts` |
| 29 | `groupSlugify.ts` |
| 30 | `assetUpload.ts` |

---

## Files Modified Summary

| Track | Modified Files |
|-------|----------------|
| 23 | `bottomPanel.ts`, `selectionBar.ts`, `entitySelectionBar.ts`, `init.ts` |
| 24 | `topPanel.ts`, `init.ts` |
| 25 | `hot.ts`, `init.ts`, tools (mode awareness) |
| 26 | `entityManager.ts`, `entitySelection.ts`, `propertyInspector.ts` |
| 27 | `init.ts` |
| 28 | `init.ts`, right berry palette components |
| 29 | `cold.ts` (repo scanning) |
| 30 | `commit.ts`, `init.ts`, `layerPanel.ts` |

---

## Notes

- Blueprint describes architecture, not implementation details
- Code examples are illustrative, not literal
- Actual file sizes and splits may vary during implementation
- Feature flags enable safe rollout and rollback
