# Tracks 23-30: Editor V2 Migration — Plan

## Overview

This plan organizes the Editor V2 Migration into phases aligned with each track. Each track is implemented as one or more phases with explicit verification and stop points.

**Track Type**: Full (high-risk: UI architecture overhaul, state model changes)
**Total Phases**: 16 (approximately 2 phases per track)

---

## Recon Summary

### Files Likely to Change

**New Files:**
- `src/editor/v2/index.ts` - V2 module exports
- `src/editor/v2/editorMode.ts` - Mode state management
- `src/editor/v2/modeMapping.ts` - Legacy → V2 mapping
- `src/editor/v2/featureFlags.ts` - Feature flag management
- `src/editor/panels/bottomContextStrip.ts` - Selection action strip
- `src/editor/panels/topBarV2.ts` - Global-only top bar
- `src/editor/panels/rightBerry.ts` - Right berry shell
- `src/editor/panels/rightBerryTabs.ts` - Mode tab definitions
- `src/editor/panels/entitiesTab.ts` - Entities mode UI
- `src/editor/panels/leftBerry.ts` - Left berry shell
- `src/editor/panels/spriteSlicerTab.ts` - Sprite slicing UI
- `src/editor/panels/assetLibraryTab.ts` - Asset library UI
- `src/editor/assets/index.ts` - Asset module exports
- `src/editor/assets/assetRegistry.ts` - Asset registry
- `src/editor/assets/assetGroup.ts` - Group management
- `src/editor/assets/spriteSlider.ts` - Slicing logic
- `src/editor/assets/groupSlugify.ts` - Name slugification
- `src/deploy/assetUpload.ts` - Asset upload to GitHub

**Modified Files:**
- `src/editor/init.ts` - Wire V2 components
- `src/editor/panels/bottomPanel.ts` - Add context strip
- `src/editor/panels/topPanel.ts` - Migrate to V2
- `src/editor/panels/selectionBar.ts` - Add feature flag, deprecate
- `src/editor/panels/entitySelectionBar.ts` - Add feature flag, deprecate
- `src/editor/panels/propertyInspector.ts` - Deprecate
- `src/editor/panels/layerPanel.ts` - Hide by default
- `src/storage/hot.ts` - Add V2 state fields
- `src/types/index.ts` - Export V2 types

### Key Modules/Functions Involved

- `createBottomPanel()` - Add context strip integration
- `createTopPanel()` - Replace with V2 version
- `createLayerPanel()` - Make optional/hidden
- Canvas gesture handling - Mode-aware tool selection
- Entity selection - Move-first behavior
- Hot storage - V2 state persistence

### Invariants to Respect

- Hot/Cold boundary: V2 state goes to IndexedDB
- Touch-first interaction: All new UI must be touch-friendly
- No data loss: Mode changes don't lose selection or edits
- Editor/Runtime separation: V2 is editor-only
- Offline-safe editing: V2 features work offline after load

### Cross-Module Side Effects

- Mode changes affect: canvas gestures, tool behavior, bottom bar, berry panels
- Asset registry affects: tile picker, entity palette, right berry tabs
- Feature flags affect: which UI renders

### Apply/Rebuild Semantics

- `editorMode`: Live-applying
- `rightBerryOpen`/`leftBerryOpen`: Live-applying
- `assetRegistry`: Live-applying (in-memory), persisted on change
- GitHub upload: Explicit action (commit button)

### Data Migration Impact

- Adding V2 fields to EditorState (defaults if missing)
- Asset registry structure is new (starts empty)
- No schema changes to project/scene data

### File Rules Impact

- New `src/editor/v2/` directory for V2 core
- New `src/editor/assets/` directory for asset pipeline
- Multiple new panel files (watch for size limits)

### Risks/Regressions

- Core editing flows must not break during migration
- Feature flags enable gradual rollout
- Legacy UI coexists until V2 verified

### Verification Commands/Checks

- `npm run build` - TypeScript compilation
- `npm run lint` - Code style
- Manual testing on mobile device
- End-to-end workflow tests

---

## Phase 1: V2 Foundation + Feature Flags (Track 23 prep)

**Goal**: Establish V2 module structure and feature flag system.

### Tasks

- [ ] Create `src/editor/v2/` directory
- [ ] Create `src/editor/v2/index.ts`
  - [ ] Export V2 public API
- [ ] Create `src/editor/v2/featureFlags.ts`
  - [ ] Define EDITOR_V2_FLAGS constant
  - [ ] `isV2Enabled(flag)` function
  - [ ] `setV2Flag(flag, value)` function
  - [ ] Persist flags to localStorage
- [ ] Create `src/editor/v2/editorMode.ts`
  - [ ] Define EditorMode type
  - [ ] `getEditorMode()` function
  - [ ] `setEditorMode(mode)` function
  - [ ] `onEditorModeChange(callback)` subscription
- [ ] Create `src/editor/v2/modeMapping.ts`
  - [ ] MODE_TO_LAYER mapping
  - [ ] MODE_TO_TOOL mapping
  - [ ] `getLegacyState(mode)` helper
- [ ] Update `src/storage/hot.ts`
  - [ ] Add `editorMode: EditorMode` to EditorState
  - [ ] Add migration for missing field
- [ ] Update `INDEX.md` with new files
- [ ] Update `context/schema-registry.md` with EditorMode

### Files Touched

- `src/editor/v2/index.ts` (new)
- `src/editor/v2/featureFlags.ts` (new)
- `src/editor/v2/editorMode.ts` (new)
- `src/editor/v2/modeMapping.ts` (new)
- `src/storage/hot.ts` (modify)
- `INDEX.md` (modify)
- `context/schema-registry.md` (modify)

### Verification

- [ ] V2 module exports work
- [ ] Feature flags can be toggled
- [ ] EditorMode state persists
- [ ] Mode mapping returns correct legacy values
- [ ] TypeScript compiles without errors
- [ ] `npm run build` succeeds

### Stop Point

Pause for review. V2 foundation ready.

---

## Phase 2: Bottom Context Strip (Track 23)

**Goal**: Implement bottom bar context strip for selection actions.

### Tasks

- [ ] Create `src/editor/panels/bottomContextStrip.ts`
  - [ ] BottomContextStripConfig interface
  - [ ] `createBottomContextStrip(container, config)` factory
  - [ ] Tile selection actions: Copy, Paste, Delete, Fill, Cancel
  - [ ] Entity selection actions: Duplicate, Delete, Clear
  - [ ] Touch-friendly button sizing (44×44px minimum)
  - [ ] Horizontal scrollable if overflow
- [ ] Update `src/editor/panels/bottomPanel.ts`
  - [ ] Add context strip container area
  - [ ] Wire context strip creation
  - [ ] Listen to selection changes
  - [ ] Update strip based on selection type
- [ ] Update `src/editor/panels/selectionBar.ts`
  - [ ] Add feature flag check
  - [ ] Hide when V2 enabled
- [ ] Update `src/editor/panels/entitySelectionBar.ts`
  - [ ] Add feature flag check
  - [ ] Hide when V2 enabled
- [ ] Update `src/editor/init.ts`
  - [ ] Wire context strip to selection state
  - [ ] Pass action handlers
- [ ] Enable `EDITOR_V2_BOTTOM_STRIP` flag by default

### Files Touched

- `src/editor/panels/bottomContextStrip.ts` (new)
- `src/editor/panels/bottomPanel.ts` (modify)
- `src/editor/panels/selectionBar.ts` (modify)
- `src/editor/panels/entitySelectionBar.ts` (modify)
- `src/editor/init.ts` (modify)

### Verification

- [ ] Context strip visible in bottom bar
- [ ] Tile selection shows tile actions
- [ ] Entity selection shows entity actions
- [ ] No selection shows empty/default
- [ ] Floating selection bars hidden (V2 enabled)
- [ ] Feature flag can restore floating bars
- [ ] Touch targets are 44×44px minimum
- [ ] Actions execute correctly
- [ ] Manual test on mobile device
- [ ] `npm run build` succeeds
- [ ] `npm run lint` passes

### Stop Point

Pause for review. Track 23 complete.

---

## Phase 3: Top Bar Globalization (Track 24)

**Goal**: Make top bar global-only with Undo/Redo/Settings/Play.

### Tasks

- [ ] Create `src/editor/panels/topBarV2.ts`
  - [ ] TopBarV2Config interface
  - [ ] `createTopBarV2(container, config)` factory
  - [ ] Undo button with disabled state
  - [ ] Redo button with disabled state
  - [ ] Settings button
  - [ ] Play/Test button
  - [ ] Scene name display (read-only)
  - [ ] Touch-friendly sizing
- [ ] Update `src/editor/panels/topPanel.ts`
  - [ ] Add feature flag check
  - [ ] Delegate to V2 when enabled
  - [ ] Remove layer tabs from V2 path
- [ ] Update `src/editor/init.ts`
  - [ ] Wire Undo to historyManager.undo()
  - [ ] Wire Redo to historyManager.redo()
  - [ ] Wire Settings to settings panel
  - [ ] Wire Play to playtest trigger
  - [ ] Subscribe to history changes for button states
- [ ] Enable `EDITOR_V2_TOP_BAR` flag by default

### Files Touched

- `src/editor/panels/topBarV2.ts` (new)
- `src/editor/panels/topPanel.ts` (modify)
- `src/editor/init.ts` (modify)

### Verification

- [ ] Top bar shows Undo, Redo, Settings, Play
- [ ] Top bar does NOT show layer controls
- [ ] Undo/Redo buttons reflect history state
- [ ] Undo/Redo execute correctly
- [ ] Settings opens settings (or placeholder)
- [ ] Play triggers playtest
- [ ] Top bar never changes based on mode
- [ ] Manual test on mobile device
- [ ] `npm run build` succeeds
- [ ] `npm run lint` passes

### Stop Point

Pause for review. Track 24 complete.

---

## Phase 4: Right Berry Shell (Track 25 part 1)

**Goal**: Create right berry slide-out panel structure.

### Tasks

- [ ] Create `src/editor/panels/rightBerry.ts`
  - [ ] RightBerryConfig interface
  - [ ] `createRightBerry(container, config)` factory
  - [ ] Slide-out animation (from right)
  - [ ] Tab bar at top
  - [ ] Content area (scrollable)
  - [ ] Close button
  - [ ] Touch swipe to close
  - [ ] Overlay/backdrop when open
- [ ] Create `src/editor/panels/rightBerryTabs.ts`
  - [ ] Tab definitions for each mode
  - [ ] Tab icons and labels
  - [ ] Tab click handler
- [ ] Update `src/storage/hot.ts`
  - [ ] Add `rightBerryOpen: boolean` to EditorState
  - [ ] Add migration for missing field
- [ ] Update `src/editor/init.ts`
  - [ ] Create right berry instance
  - [ ] Wire tab changes to setEditorMode()
  - [ ] Wire close to setEditorMode('select')
  - [ ] Persist open/close state

### Files Touched

- `src/editor/panels/rightBerry.ts` (new)
- `src/editor/panels/rightBerryTabs.ts` (new)
- `src/storage/hot.ts` (modify)
- `src/editor/init.ts` (modify)

### Verification

- [ ] Right berry slides out from right edge
- [ ] Five tabs visible: Ground, Props, Entities, Collision, Triggers
- [ ] Tab click changes active tab
- [ ] Close button/swipe closes berry
- [ ] Berry state persists across reload
- [ ] Touch interactions feel natural
- [ ] `npm run build` succeeds

### Stop Point

Pause for review. Right berry shell ready.

---

## Phase 5: Mode State Integration (Track 25 part 2)

**Goal**: Wire right berry tabs to editor mode state.

### Tasks

- [ ] Update `src/editor/v2/editorMode.ts`
  - [ ] Integrate with right berry open/close
  - [ ] Berry open → set mode to active tab
  - [ ] Berry close → set mode to select
  - [ ] Notify subscribers on mode change
- [ ] Update `src/editor/init.ts`
  - [ ] Map mode to legacy layer/tool
  - [ ] Update canvas tool on mode change
  - [ ] Update active layer on mode change
  - [ ] Update bottom context strip on mode change
- [ ] Add placeholder content for each tab
  - [ ] Ground tab: existing tile picker
  - [ ] Props tab: placeholder
  - [ ] Entities tab: placeholder (Track 26)
  - [ ] Collision tab: placeholder
  - [ ] Triggers tab: placeholder
- [ ] Enable `EDITOR_V2_RIGHT_BERRY` flag by default
- [ ] Update `context/schema-registry.md`
  - [ ] Add rightBerryOpen to EditorStateSchema

### Files Touched

- `src/editor/v2/editorMode.ts` (modify)
- `src/editor/init.ts` (modify)
- `src/editor/panels/rightBerry.ts` (modify)
- `context/schema-registry.md` (modify)

### Verification

- [ ] Switching tabs changes editorMode
- [ ] Mode change updates canvas tool
- [ ] Mode change updates active layer
- [ ] Closing berry sets mode to select
- [ ] Ground tab shows tile picker
- [ ] Other tabs show placeholder
- [ ] Core painting flow works via Ground tab
- [ ] Manual test on mobile device
- [ ] `npm run build` succeeds
- [ ] `npm run lint` passes

### Stop Point

Pause for review. Track 25 complete.

---

## Phase 6: Entities Tab UI (Track 26 part 1)

**Goal**: Create Entities tab content in right berry.

### Tasks

- [ ] Create `src/editor/panels/entitiesTab.ts`
  - [ ] EntitiesTabConfig interface
  - [ ] `createEntitiesTab(container, config)` factory
  - [ ] Entity palette section (existing entity types)
  - [ ] Selected entity info section
  - [ ] Property editor section (inline, not popup)
  - [ ] Touch-friendly property inputs
- [ ] Update `src/editor/panels/rightBerry.ts`
  - [ ] Render Entities tab content from entitiesTab.ts
- [ ] Wire entity selection to tab
  - [ ] Show selected entity info
  - [ ] Show property editor for selected entity

### Files Touched

- `src/editor/panels/entitiesTab.ts` (new)
- `src/editor/panels/rightBerry.ts` (modify)
- `src/editor/init.ts` (modify)

### Verification

- [ ] Entities tab shows entity palette
- [ ] Can select entity type from palette
- [ ] Selected entity shows info and properties
- [ ] Property inputs are touch-friendly
- [ ] `npm run build` succeeds

### Stop Point

Pause for review. Entities tab UI ready.

---

## Phase 7: Move-First Behavior (Track 26 part 2)

**Goal**: Implement move-first selection and deprecate popup inspector.

### Tasks

- [ ] Update `src/editor/tools/selectEntityController.ts`
  - [ ] Selection immediately enables drag
  - [ ] No popup on selection
  - [ ] Drag moves entity
- [ ] Update `src/editor/panels/propertyInspector.ts`
  - [ ] Add feature flag check
  - [ ] Hide when V2 enabled
- [ ] Update `src/editor/panels/entitiesTab.ts`
  - [ ] Listen to entitySelection changes
  - [ ] Update property editor on selection change
  - [ ] Handle multi-select (show count, disable property edit)
- [ ] Update `src/editor/init.ts`
  - [ ] Wire entity selection to Entities tab
  - [ ] Remove popup inspector calls when V2 enabled
- [ ] Enable `EDITOR_V2_ENTITY_MOVE_FIRST` flag by default

### Files Touched

- `src/editor/tools/selectEntityController.ts` (modify)
- `src/editor/panels/propertyInspector.ts` (modify)
- `src/editor/panels/entitiesTab.ts` (modify)
- `src/editor/init.ts` (modify)

### Verification

- [ ] Selecting entity allows immediate drag
- [ ] No popup appears on entity selection
- [ ] Properties shown in Entities tab
- [ ] Property edits work from tab
- [ ] Multi-select shows count, disables property edit
- [ ] Undo/redo works for entity operations
- [ ] Manual test on mobile device
- [ ] `npm run build` succeeds
- [ ] `npm run lint` passes

### Stop Point

Pause for review. Track 26 complete.

---

## Phase 8: Left Berry Shell (Track 27 part 1)

**Goal**: Create left berry slide-out panel structure.

### Tasks

- [ ] Create `src/editor/panels/leftBerry.ts`
  - [ ] LeftBerryConfig interface
  - [ ] `createLeftBerry(container, config)` factory
  - [ ] Slide-out animation (from left)
  - [ ] Tab bar: Sprites, Assets
  - [ ] Content area (scrollable)
  - [ ] Close button
  - [ ] Touch swipe to close
  - [ ] Overlay/backdrop when open
- [ ] Update `src/storage/hot.ts`
  - [ ] Add `leftBerryOpen: boolean` to EditorState
  - [ ] Add migration for missing field
- [ ] Update `src/editor/init.ts`
  - [ ] Create left berry instance
  - [ ] Add button/gesture to open left berry
  - [ ] Persist open/close state
- [ ] Update `context/schema-registry.md`
  - [ ] Add leftBerryOpen to EditorStateSchema

### Files Touched

- `src/editor/panels/leftBerry.ts` (new)
- `src/storage/hot.ts` (modify)
- `src/editor/init.ts` (modify)
- `context/schema-registry.md` (modify)

### Verification

- [ ] Left berry slides out from left edge
- [ ] Two tabs visible: Sprites, Assets
- [ ] Tab click changes active tab
- [ ] Close button/swipe closes berry
- [ ] Berry state persists across reload
- [ ] `npm run build` succeeds

### Stop Point

Pause for review. Left berry shell ready.

---

## Phase 9: Sprite Slicing Tool (Track 27 part 2)

**Goal**: Implement sprite sheet slicing in left berry.

### Tasks

- [ ] Create `src/editor/assets/` directory
- [ ] Create `src/editor/assets/index.ts`
  - [ ] Export asset module API
- [ ] Create `src/editor/assets/spriteSlider.ts`
  - [ ] `sliceImage(blob, sliceWidth, sliceHeight)` function
  - [ ] Returns array of slice blobs/data URLs
  - [ ] Uses canvas for slicing
- [ ] Create `src/editor/panels/spriteSlicerTab.ts`
  - [ ] SpriteSlicerTabConfig interface
  - [ ] `createSpriteSlicerTab(container, config)` factory
  - [ ] Import image button (file input)
  - [ ] Slice size selector (16×16, 32×32, custom)
  - [ ] Preview canvas with grid overlay
  - [ ] Confirm slice button
  - [ ] Output to asset registry (placeholder)
- [ ] Update `src/editor/panels/leftBerry.ts`
  - [ ] Render Sprites tab content from spriteSlicerTab.ts
- [ ] Enable `EDITOR_V2_LEFT_BERRY` flag by default

### Files Touched

- `src/editor/assets/index.ts` (new)
- `src/editor/assets/spriteSlider.ts` (new)
- `src/editor/panels/spriteSlicerTab.ts` (new)
- `src/editor/panels/leftBerry.ts` (modify)

### Verification

- [ ] Can import image via file picker
- [ ] Can select slice size
- [ ] Preview shows image with grid overlay
- [ ] Confirm creates slice entries
- [ ] Slicing works correctly (correct number of tiles)
- [ ] Touch-friendly controls
- [ ] `npm run build` succeeds
- [ ] `npm run lint` passes

### Stop Point

Pause for review. Track 27 complete.

---

## Phase 10: Asset Registry (Track 28 part 1)

**Goal**: Implement in-editor asset registry with grouping.

### Tasks

- [ ] Create `src/editor/assets/assetRegistry.ts`
  - [ ] AssetRegistry interface
  - [ ] AssetGroup interface
  - [ ] AssetEntry interface
  - [ ] `createAssetRegistry(initialState)` factory
  - [ ] getGroups(), createGroup(), deleteGroup()
  - [ ] addAsset(), removeAsset(), getAsset()
  - [ ] Persist to EditorState
- [ ] Create `src/editor/assets/assetGroup.ts`
  - [ ] Group type definitions
  - [ ] Group validation
  - [ ] Default groups (tilesets, props, entities)
- [ ] Update `src/storage/hot.ts`
  - [ ] Add `assetRegistry: AssetRegistry` to EditorState
  - [ ] Add migration for missing field
- [ ] Update `src/editor/init.ts`
  - [ ] Initialize asset registry
  - [ ] Wire to sprite slicer output
- [ ] Update `context/schema-registry.md`
  - [ ] Add AssetRegistry schema

### Files Touched

- `src/editor/assets/assetRegistry.ts` (new)
- `src/editor/assets/assetGroup.ts` (new)
- `src/storage/hot.ts` (modify)
- `src/editor/init.ts` (modify)
- `context/schema-registry.md` (modify)

### Verification

- [ ] Can create asset groups
- [ ] Can add assets to groups
- [ ] Sliced sprites go to registry
- [ ] Registry persists across reload
- [ ] `npm run build` succeeds

### Stop Point

Pause for review. Asset registry ready.

---

## Phase 11: Asset Library UI (Track 28 part 2)

**Goal**: Create Asset Library tab in left berry.

### Tasks

- [ ] Create `src/editor/panels/assetLibraryTab.ts`
  - [ ] AssetLibraryTabConfig interface
  - [ ] `createAssetLibraryTab(container, config)` factory
  - [ ] Group tree view (tilesets/props/entities)
  - [ ] Asset grid within groups
  - [ ] Asset selection
  - [ ] Delete asset action
  - [ ] Touch-friendly sizing
- [ ] Update `src/editor/panels/leftBerry.ts`
  - [ ] Render Assets tab content from assetLibraryTab.ts
- [ ] Wire asset selection to right berry palettes
  - [ ] Selected asset available for placement
- [ ] Enable `EDITOR_V2_ASSET_LIBRARY` flag by default

### Files Touched

- `src/editor/panels/assetLibraryTab.ts` (new)
- `src/editor/panels/leftBerry.ts` (modify)
- `src/editor/init.ts` (modify)

### Verification

- [ ] Assets Library tab shows grouped assets
- [ ] Can expand/collapse groups
- [ ] Can select asset from library
- [ ] Selected asset usable in right berry
- [ ] Can delete assets
- [ ] Manual test on mobile device
- [ ] `npm run build` succeeds
- [ ] `npm run lint` passes

### Stop Point

Pause for review. Track 28 complete.

---

## Phase 12: Group Slugification (Track 29 part 1)

**Goal**: Implement group name to folder slug conversion.

### Tasks

- [ ] Create `src/editor/assets/groupSlugify.ts`
  - [ ] `slugifyGroupName(name)` function
  - [ ] Lowercase conversion
  - [ ] Space to hyphen
  - [ ] Remove unsafe characters
  - [ ] Collapse multiple hyphens
  - [ ] Trim hyphens
  - [ ] Prevent empty names
- [ ] Update `src/editor/assets/assetGroup.ts`
  - [ ] Use slugify when creating groups
  - [ ] Store both name and slug
- [ ] Add canonical path constants
  - [ ] ASSET_PATHS.tilesets = 'game/assets/tilesets'
  - [ ] ASSET_PATHS.props = 'game/assets/props'
  - [ ] ASSET_PATHS.entities = 'game/assets/entities'

### Files Touched

- `src/editor/assets/groupSlugify.ts` (new)
- `src/editor/assets/assetGroup.ts` (modify)

### Verification

- [ ] "My Trees" → "my-trees"
- [ ] "Goblins & Orcs" → "goblins-orcs"
- [ ] Edge cases handled (empty, special chars)
- [ ] Group creation uses slugified name
- [ ] `npm run build` succeeds

### Stop Point

Pause for review. Slugification ready.

---

## Phase 13: Repo Folder Scanning (Track 29 part 2)

**Goal**: Scan GitHub repo folders to build group list.

### Tasks

- [ ] Update `src/storage/cold.ts`
  - [ ] Add `scanAssetFolders()` function
  - [ ] Fetch folder contents via GitHub API
  - [ ] Parse into RepoAssetManifest
- [ ] Update `src/editor/assets/assetRegistry.ts`
  - [ ] `refreshFromRepo()` method
  - [ ] Merge repo groups with local groups
  - [ ] Mark assets as 'repo' or 'local' source
- [ ] Update `src/storage/hot.ts`
  - [ ] Add `repoAssetManifest: RepoAssetManifest` to EditorState
- [ ] Update `src/editor/init.ts`
  - [ ] Scan repo on startup (if online)
  - [ ] Update asset registry from repo
- [ ] Enable `EDITOR_V2_REPO_MIRRORING` flag by default
- [ ] Update `context/schema-registry.md`
  - [ ] Add RepoAssetManifest schema

### Files Touched

- `src/storage/cold.ts` (modify)
- `src/editor/assets/assetRegistry.ts` (modify)
- `src/storage/hot.ts` (modify)
- `src/editor/init.ts` (modify)
- `context/schema-registry.md` (modify)

### Verification

- [ ] Repo folders scanned successfully
- [ ] Group list reflects repo structure
- [ ] Local and repo groups merged
- [ ] Assets show correct source
- [ ] Manual test with real repo
- [ ] `npm run build` succeeds
- [ ] `npm run lint` passes

### Stop Point

Pause for review. Track 29 complete.

---

## Phase 14: Asset Upload (Track 30 part 1)

**Goal**: Upload local assets to GitHub repository.

### Tasks

- [ ] Create `src/deploy/assetUpload.ts`
  - [ ] `uploadAssetGroup(groupSlug)` function
  - [ ] Build file paths from group + asset data
  - [ ] Convert blobs to base64
  - [ ] Use existing commit.ts for GitHub API
  - [ ] Handle batch commits
  - [ ] Return success/failure per file
- [ ] Update `src/editor/assets/assetRegistry.ts`
  - [ ] `uploadGroup(groupSlug)` method
  - [ ] Update asset sources after upload
- [ ] Update `src/editor/panels/assetLibraryTab.ts`
  - [ ] Add "Upload to GitHub" button per group
  - [ ] Show upload progress
  - [ ] Handle errors
- [ ] Enable `EDITOR_V2_ASSET_UPLOAD` flag by default

### Files Touched

- `src/deploy/assetUpload.ts` (new)
- `src/editor/assets/assetRegistry.ts` (modify)
- `src/editor/panels/assetLibraryTab.ts` (modify)

### Verification

- [ ] Can upload local assets to GitHub
- [ ] Files appear in correct folders
- [ ] Asset source updated to 'repo'
- [ ] Upload errors handled gracefully
- [ ] Manual test with real repo
- [ ] `npm run build` succeeds

### Stop Point

Pause for review. Asset upload ready.

---

## Phase 15: Editor V2 Completion (Track 30 part 2)

**Goal**: Finalize Editor V2 and hide legacy UI.

### Tasks

- [ ] Update `src/editor/panels/layerPanel.ts`
  - [ ] Add feature flag check
  - [ ] Hide by default when V2 enabled
  - [ ] Accessible via Settings → Advanced
- [ ] Enable `EDITOR_V2_HIDE_LAYER_PANEL` flag by default
- [ ] Remove all feature flag checks from legacy code
  - [ ] `selectionBar.ts` - remove (or keep minimal for debug)
  - [ ] `entitySelectionBar.ts` - remove
  - [ ] `propertyInspector.ts` popup - remove
- [ ] Full end-to-end test
  - [ ] Import sprite sheet
  - [ ] Slice it
  - [ ] Assign to group
  - [ ] Upload to GitHub
  - [ ] Use in world editing
- [ ] Update `INDEX.md` with all new files
- [ ] Update `context/repo-map.md` with new modules

### Files Touched

- `src/editor/panels/layerPanel.ts` (modify)
- `src/editor/panels/selectionBar.ts` (modify/remove legacy)
- `src/editor/panels/entitySelectionBar.ts` (modify/remove legacy)
- `src/editor/panels/propertyInspector.ts` (modify/remove legacy)
- `INDEX.md` (modify)
- `context/repo-map.md` (modify)

### Verification

- [ ] Layer panel hidden by default
- [ ] No floating selection popups
- [ ] No entity inspector popup
- [ ] Full workflow: import → slice → group → upload → use
- [ ] Editor V2 acceptance tests pass (see spec.md)
- [ ] Manual test on mobile device
- [ ] `npm run build` succeeds
- [ ] `npm run lint` passes

### Stop Point

Pause for review. Track 30 part 2 complete.

---

## Phase 16: Closeout

**Goal**: Finalize documentation and close track.

### Tasks

- [ ] Verify all INDEX.md entries are accurate
- [ ] Verify context/schema-registry.md is complete
- [ ] Verify context/repo-map.md reflects new modules
- [ ] Run full acceptance test suite
- [ ] Update `context/active-track.md` to clear
- [ ] Append summary to `context/history.md`
  - [ ] Include: what was done, verification, learnings
- [ ] Final `npm run build && npm run lint`

### Files Touched

- `INDEX.md` (verify)
- `context/schema-registry.md` (verify)
- `context/repo-map.md` (verify)
- `context/active-track.md` (clear)
- `context/history.md` (append)

### Verification

- [ ] All documentation accurate
- [ ] All acceptance criteria met
- [ ] Build and lint pass
- [ ] No legacy UI visible in normal use
- [ ] Full workflow tested on mobile

### Stop Point

Track complete. Editor V2 Migration finished.

---

## Risk Checkpoints

### Before Phase 2 (Track 23)
- Review bottom panel layout space
- Plan action button icons

### Before Phase 4 (Track 25)
- Review berry animation approach
- Plan tab content structure

### Before Phase 6 (Track 26)
- Review existing entity inspector code
- Plan property editor layout

### Before Phase 9 (Track 27)
- Review canvas slicing performance
- Plan file size limits for imports

### Before Phase 13 (Track 29)
- Review GitHub API rate limits
- Plan folder scanning strategy

### Before Phase 14 (Track 30)
- Review commit batching approach
- Plan error recovery

---

## Rollback Plan

If issues arise at any phase:

1. **Feature flags**: Disable problematic V2 feature, legacy UI appears
2. **State rollback**: V2 state fields have defaults, missing = legacy behavior
3. **Per-track rollback**: Each track is independently revertible via feature flags

Critical invariant: Core editing flows (paint, place, move, undo) must never break.

---

## INDEX.md Updates

After Track 30 completion, add:

```markdown
## Editor V2 (Tracks 23-30)
- `src/editor/v2/index.ts`
  - Role: V2 module public exports.
  - Lists of truth: none
- `src/editor/v2/editorMode.ts`
  - Role: Editor mode state management.
  - Lists of truth: EditorMode
- `src/editor/v2/modeMapping.ts`
  - Role: Legacy tool/layer to mode mapping.
  - Lists of truth: MODE_TO_LAYER, MODE_TO_TOOL
- `src/editor/v2/featureFlags.ts`
  - Role: V2 feature flag management.
  - Lists of truth: EDITOR_V2_FLAGS
- `src/editor/panels/bottomContextStrip.ts`
  - Role: Bottom bar selection action strip.
  - Lists of truth: none
- `src/editor/panels/topBarV2.ts`
  - Role: Global-only top bar (Undo/Redo/Settings/Play).
  - Lists of truth: none
- `src/editor/panels/rightBerry.ts`
  - Role: Right berry slide-out panel shell.
  - Lists of truth: none
- `src/editor/panels/rightBerryTabs.ts`
  - Role: Right berry mode tab definitions.
  - Lists of truth: none
- `src/editor/panels/entitiesTab.ts`
  - Role: Entities mode UI in right berry.
  - Lists of truth: none
- `src/editor/panels/leftBerry.ts`
  - Role: Left berry slide-out panel shell.
  - Lists of truth: none
- `src/editor/panels/spriteSlicerTab.ts`
  - Role: Sprite sheet slicing UI.
  - Lists of truth: none
- `src/editor/panels/assetLibraryTab.ts`
  - Role: Asset library group view UI.
  - Lists of truth: none
- `src/editor/assets/index.ts`
  - Role: Asset module public exports.
  - Lists of truth: none
- `src/editor/assets/assetRegistry.ts`
  - Role: In-editor asset registry.
  - Lists of truth: AssetRegistry, AssetGroup, AssetEntry
- `src/editor/assets/assetGroup.ts`
  - Role: Asset group type definitions.
  - Lists of truth: AssetGroupType
- `src/editor/assets/spriteSlider.ts`
  - Role: Sprite sheet slicing logic.
  - Lists of truth: none
- `src/editor/assets/groupSlugify.ts`
  - Role: Group name to folder slug conversion.
  - Lists of truth: none
- `src/deploy/assetUpload.ts`
  - Role: Upload assets to GitHub repository.
  - Lists of truth: none
```

---

## schema-registry.md Updates

After Track 30 completion, update:

```markdown
### Editor V2 (Tracks 23-30)

- `/src/editor/v2/editorMode.ts`
  - `EditorMode` — primary editing state
    - Values: select, ground, props, entities, collision, triggers
    - Invariant: single source of truth for editing context

- `/src/storage/hot.ts`
  - `EditorStateSchema` additions:
    - Keys: editorMode, rightBerryOpen, leftBerryOpen, assetRegistry, repoAssetManifest
    - Apply mode: live

- `/src/editor/assets/assetRegistry.ts`
  - `AssetRegistry` — in-editor asset storage
    - Keys: groups[]
  - `AssetGroup` — asset group definition
    - Keys: type, name, slug, assets[], source
  - `AssetEntry` — individual asset
    - Keys: id, name, type, source, metadata

- `/src/editor/assets/assetGroup.ts`
  - `AssetGroupType` — group type enum
    - Values: tilesets, props, entities

- `/src/storage/hot.ts` (additional)
  - `RepoAssetManifest` — scanned repo asset state
    - Keys: scannedAt, groups[]
```

---

## Notes

- Each phase is designed to be completable in one session
- Feature flags allow incremental rollout
- Legacy code removal happens at the end, not during migration
- Mobile testing is critical for every phase
- Core editing flows must work throughout migration
