# Phase 5: Export/Backup — Plan (Tracks 23-24 Bundle)

## Overview

This plan breaks the Export/Backup bundle into implementation phases with verification checklists and stop points. Each phase delivers a functional increment.

**Bundle Type**: Full Track Bundle
**Estimated Phases**: 6
**Tracks Covered**: 23 (Export Functions), 24 (Import Functions)

---

## Recon Summary

### Files Likely to Change

**New Files:**
- `src/export/exportManager.ts` - Export orchestration
- `src/export/jsonExporter.ts` - JSON export logic
- `src/export/zipExporter.ts` - ZIP export logic
- `src/export/clipboardExporter.ts` - Clipboard operations
- `src/export/index.ts` - Export module entry
- `src/import/importManager.ts` - Import orchestration
- `src/import/jsonImporter.ts` - JSON import + validation
- `src/import/zipImporter.ts` - ZIP import logic
- `src/import/validator.ts` - Schema validation
- `src/import/index.ts` - Import module entry
- `src/types/export.ts` - Type definitions
- `src/editor/panels/exportImportPanel.ts` - Export/Import UI

**Modified Files:**
- `src/storage/hot.ts` - Export reminder state
- `package.json` - Add jszip dependency
- `src/editor/init.ts` - Wire export/import UI

### Key Modules/Functions Involved

- Existing: exportAllData, importAllData in storage/hot.ts
- New: ExportManager, ImportManager, Validator, UI panel

### Invariants to Respect

- Hot/Cold boundary: All data read from IndexedDB for export
- No data loss: Import should never silently lose data
- Schema compliance: Exported data must match defined schemas
- Offline capable: Export/import work without network

### Apply/Rebuild Semantics

- Export: Read-only operation on IndexedDB
- Import (replace): Clears and rebuilds all hot storage
- Import (merge): Additive operation, may require editor reload

### Data Migration Impact

- Adding export reminder fields to EditorState
- Use defaults if missing on load (backward compatible)

---

## Phase 1: JSON Export Foundation (Track 23 - Part 1)

**Goal**: Implement basic JSON export with download functionality.

### Tasks

- [ ] Create `src/types/export.ts`
  - [ ] Define ExportOptions interface
  - [ ] Define ExportResult interface
  - [ ] Define JsonExportData interface (extends ExportData)
  - [ ] Define ImportPreview interface
  - [ ] Define ValidationError interface
- [ ] Create `src/export/jsonExporter.ts`
  - [ ] Implement `exportToJson()` function
  - [ ] Implement `generateFilename()` function
  - [ ] Implement `triggerDownload()` function
  - [ ] Handle Blob creation with proper MIME type
- [ ] Create `src/export/exportManager.ts`
  - [ ] Define ExportManager interface
  - [ ] Implement `createExportManager()` factory
  - [ ] Implement `exportProject()` for JSON format
  - [ ] Integrate with existing exportAllData from hot.ts
- [ ] Create `src/export/index.ts`
  - [ ] Export all public APIs

### Files Touched

- `src/types/export.ts` (new)
- `src/export/jsonExporter.ts` (new)
- `src/export/exportManager.ts` (new)
- `src/export/index.ts` (new)

### Verification

- [ ] Call exportManager.exportProject({ format: 'json' }) triggers download
- [ ] Downloaded file is valid JSON
- [ ] File contains project and scenes data
- [ ] Filename follows pattern: `[name]-backup-[date].json`
- [ ] TypeScript compiles without errors
- [ ] `npm run build` succeeds

### Stop Point

Pause for review. Basic JSON export working before UI integration.

---

## Phase 2: Export UI and Reminder System (Track 23 - Part 2)

**Goal**: Add export UI panel and implement reminder system.

### Tasks

- [ ] Create `src/editor/panels/exportImportPanel.ts`
  - [ ] Define ExportImportPanelConfig interface
  - [ ] Create panel container with header
  - [ ] Add "Export Project (JSON)" button
  - [ ] Add "Export Project (ZIP)" button (disabled initially)
  - [ ] Add "Copy to Clipboard" button
  - [ ] Display last export timestamp
  - [ ] Style consistent with existing panels
- [ ] Modify `src/storage/hot.ts`
  - [ ] Add `lastExportedAt: number | null` to EditorState
  - [ ] Add `exportReminderDismissedUntil: number | null` to EditorState
  - [ ] Add `changesSinceExport: number` to EditorState
  - [ ] Add defaults to DEFAULT_EDITOR_STATE
  - [ ] Ensure merged state includes new fields
- [ ] Implement export reminder logic
  - [ ] `shouldShowReminder()` function
  - [ ] `dismissReminder()` function
  - [ ] Reminder banner component
  - [ ] "Export Now", "Remind Later", "Don't Ask" actions
- [ ] Create `src/export/clipboardExporter.ts`
  - [ ] Implement `copyJson()` with Clipboard API
  - [ ] Implement fallback with execCommand
  - [ ] Implement `isAvailable()` check
- [ ] Wire panel to editor
  - [ ] Add menu/settings access to export panel
  - [ ] Update lastExportedAt on successful export

### Files Touched

- `src/editor/panels/exportImportPanel.ts` (new)
- `src/storage/hot.ts` (modify)
- `src/export/clipboardExporter.ts` (new)
- `src/export/exportManager.ts` (modify)
- `src/editor/init.ts` (modify)

### Verification

- [ ] Export panel accessible from editor UI
- [ ] Export JSON button triggers download
- [ ] Clipboard copy shows confirmation
- [ ] lastExportedAt updates after export
- [ ] Reminder appears if never exported
- [ ] Reminder dismissal works (session, week, forever)
- [ ] Panel state persists across reload
- [ ] `npm run build` succeeds

### Stop Point

Pause for review. Export UI and reminder system complete.

---

## Phase 3: ZIP Export (Track 23 - Part 3)

**Goal**: Implement ZIP export with optional asset inclusion.

### Tasks

- [ ] Add JSZip dependency
  - [ ] `npm install jszip`
  - [ ] Add @types/jszip if needed
  - [ ] Verify bundle size impact
- [ ] Create `src/export/zipExporter.ts`
  - [ ] Define ZipExportOptions interface
  - [ ] Implement `createZip()` function
  - [ ] Create ZIP structure (manifest, project, scenes/)
  - [ ] Implement `addAssets()` for asset inclusion
  - [ ] Handle progress reporting for large exports
- [ ] Update `src/export/exportManager.ts`
  - [ ] Add ZIP format support to exportProject()
  - [ ] Dynamic import JSZip to reduce initial bundle
  - [ ] Handle includeAssets option
- [ ] Update export panel
  - [ ] Enable ZIP export button
  - [ ] Add progress indicator for ZIP exports
  - [ ] Add assets toggle option

### Files Touched

- `package.json` (modify)
- `src/export/zipExporter.ts` (new)
- `src/export/exportManager.ts` (modify)
- `src/editor/panels/exportImportPanel.ts` (modify)

### Verification

- [ ] ZIP export triggers download
- [ ] ZIP contains manifest.json, project.json, scenes/
- [ ] ZIP contents are valid JSON
- [ ] Asset inclusion works when enabled
- [ ] Progress indicator shown for large exports
- [ ] Dynamic import doesn't break build
- [ ] `npm run build` succeeds

### Stop Point

Pause for review. Track 23 (Export Functions) complete.

---

## Phase 4: Import Validation (Track 24 - Part 1)

**Goal**: Implement import file parsing and validation.

### Tasks

- [ ] Create `src/import/validator.ts`
  - [ ] Implement `validateProject()` function
  - [ ] Implement `validateScene()` function
  - [ ] Implement `validateEntity()` function
  - [ ] Return structured ValidationError objects
  - [ ] Check for duplicate IDs, missing required fields
- [ ] Create `src/import/jsonImporter.ts`
  - [ ] Implement `parseJsonFile()` using FileReader
  - [ ] Implement `validateJsonImport()` pipeline
  - [ ] Handle JSON syntax errors with position
  - [ ] Handle version compatibility
  - [ ] Return ImportPreview with validation results
- [ ] Create `src/import/importManager.ts`
  - [ ] Define ImportManager interface
  - [ ] Implement `createImportManager()` factory
  - [ ] Implement `parseFile()` for validation
  - [ ] Detect file format (JSON vs ZIP)
- [ ] Create `src/import/index.ts`
  - [ ] Export all public APIs

### Files Touched

- `src/import/validator.ts` (new)
- `src/import/jsonImporter.ts` (new)
- `src/import/importManager.ts` (new)
- `src/import/index.ts` (new)

### Verification

- [ ] Valid JSON file returns isValid: true
- [ ] Invalid JSON syntax returns error with position
- [ ] Missing required fields detected
- [ ] Duplicate IDs detected
- [ ] Version mismatch handled
- [ ] ImportPreview contains correct summary
- [ ] TypeScript compiles without errors
- [ ] `npm run build` succeeds

### Stop Point

Pause for review. Import validation working before execution.

---

## Phase 5: Import Execution and UI (Track 24 - Part 2)

**Goal**: Implement import execution with merge/replace strategies and UI.

### Tasks

- [ ] Implement import execution in `src/import/importManager.ts`
  - [ ] Implement `importData()` with replace strategy
  - [ ] Implement `importData()` with merge strategy
  - [ ] Handle scene ID conflicts (rename, skip, overwrite)
  - [ ] Integrate with importAllData from hot.ts
  - [ ] Implement `importScene()` for single scene
- [ ] Implement merge logic
  - [ ] `detectConflicts()` function
  - [ ] `generateUniqueId()` for rename strategy
  - [ ] Merge entity types from imported project
- [ ] Update `src/editor/panels/exportImportPanel.ts`
  - [ ] Add "Import from File" button
  - [ ] Add file picker (accepts .json, .zip)
  - [ ] Show import preview dialog
  - [ ] Show merge/replace strategy choice
  - [ ] Show conflict resolution options
  - [ ] Show validation errors
  - [ ] Confirm/cancel import actions
- [ ] Handle post-import reload
  - [ ] Reload project data
  - [ ] Reload scene list
  - [ ] Reset editor state if needed
  - [ ] Show success/error notification

### Files Touched

- `src/import/importManager.ts` (modify)
- `src/import/jsonImporter.ts` (modify)
- `src/editor/panels/exportImportPanel.ts` (modify)
- `src/editor/init.ts` (modify)

### Verification

- [ ] Import button opens file picker
- [ ] File picker accepts .json and .zip files
- [ ] Preview shows project name, scene count, entities
- [ ] Validation errors displayed clearly
- [ ] Replace strategy clears existing data
- [ ] Merge strategy adds to existing data
- [ ] Scene conflicts handled per chosen strategy
- [ ] Editor reloads after successful import
- [ ] `npm run build` succeeds

### Stop Point

Pause for review. Core import functionality complete.

---

## Phase 6: ZIP Import and Polish (Track 24 - Part 3)

**Goal**: Implement ZIP import and finalize the export/import system.

### Tasks

- [ ] Create `src/import/zipImporter.ts`
  - [ ] Implement `importFromZip()` function
  - [ ] Read and parse manifest.json
  - [ ] Read and validate project.json
  - [ ] Read and validate scenes/*.json
  - [ ] Extract assets to map (for future use)
  - [ ] Handle partial success (some scenes valid)
  - [ ] Progress indicator for large ZIPs
- [ ] Update import manager
  - [ ] Detect ZIP format from file
  - [ ] Route to appropriate importer
  - [ ] Merge ZIP import results with existing logic
- [ ] Polish export/import UI
  - [ ] Improve error message display
  - [ ] Add loading states
  - [ ] Test mobile file picker UX
  - [ ] Add keyboard shortcuts (if applicable)
- [ ] Update INDEX.md
  - [ ] Add all new export/ files
  - [ ] Add all new import/ files
  - [ ] Add export.ts types file
- [ ] Update schema-registry.md
  - [ ] Document new EditorState fields
  - [ ] Document ExportData schema
  - [ ] Document validation error types
- [ ] Manual testing checklist
  - [ ] Test on iOS Safari
  - [ ] Test on Android Chrome
  - [ ] Test large project export/import
  - [ ] Test round-trip (export → import → verify)

### Files Touched

- `src/import/zipImporter.ts` (new)
- `src/import/importManager.ts` (modify)
- `src/editor/panels/exportImportPanel.ts` (modify)
- `INDEX.md` (modify)
- `context/schema-registry.md` (modify)

### Verification

- [ ] ZIP import parses all components
- [ ] ZIP import validates each scene
- [ ] Partial ZIP import works (valid scenes only)
- [ ] Progress shown for large ZIPs
- [ ] Full export → import round-trip preserves all data
- [ ] Mobile browsers work correctly
- [ ] INDEX.md includes all new files
- [ ] schema-registry.md updated
- [ ] `npm run build` succeeds
- [ ] `npm run lint` passes

### Stop Point

Phase complete. Track 24 and Phase 5 Bundle complete.

---

## Risk Checkpoints

### Before Phase 1
- Review existing exportAllData/importAllData implementation
- Confirm file download works on target browsers

### Before Phase 3
- Test JSZip library compatibility
- Plan dynamic import strategy

### Before Phase 5
- Test file picker on mobile browsers
- Plan UI for merge/replace choice

### Before Phase 6
- Verify ZIP extraction works correctly
- Plan progress reporting strategy

### End of Bundle

Full manual test cycle:
1. Open export panel
2. Export project as JSON
3. Verify downloaded file contents
4. Export project as ZIP
5. Verify ZIP structure
6. Copy scene to clipboard
7. Clear browser storage (simulate data loss)
8. Import JSON backup
9. Verify all data restored
10. Create new project
11. Import scene into existing project (merge)
12. Verify merge with rename conflict
13. Test reminder appears after 7 days (mock)
14. Test on mobile device
15. Test round-trip: export → clear → import → export → compare

---

## Rollback Plan

If issues arise:
- Phase 1: Remove export files, no user impact
- Phase 2: Remove UI, keep export functions
- Phase 3: Disable ZIP, keep JSON export
- Phase 4-5: Remove import, keep export
- Phase 6: Disable ZIP import, keep JSON import

---

## INDEX.md Updates

After completion, add:

```markdown
## Export Module (`src/export/`)

- `src/export/exportManager.ts`
  - Role: Export orchestration and coordination.
  - Lists of truth: ExportManager interface

- `src/export/jsonExporter.ts`
  - Role: JSON export logic and file generation.
  - Lists of truth: JsonExportData

- `src/export/zipExporter.ts`
  - Role: ZIP archive creation with JSZip.
  - Lists of truth: ZipExportOptions

- `src/export/clipboardExporter.ts`
  - Role: Clipboard copy operations with fallback.
  - Lists of truth: ClipboardExporter interface

- `src/export/index.ts`
  - Role: Export module public API.

## Import Module (`src/import/`)

- `src/import/importManager.ts`
  - Role: Import orchestration and coordination.
  - Lists of truth: ImportManager interface, ImportOptions

- `src/import/jsonImporter.ts`
  - Role: JSON file parsing and validation.
  - Lists of truth: ValidationResult

- `src/import/zipImporter.ts`
  - Role: ZIP file extraction and parsing.
  - Lists of truth: ZipImportResult

- `src/import/validator.ts`
  - Role: Schema validation for import data.
  - Lists of truth: ValidationError

- `src/import/index.ts`
  - Role: Import module public API.

## Types

- `src/types/export.ts`
  - Role: Type definitions for export/import system.
  - Lists of truth: ExportOptions, ImportPreview, ValidationError
```

---

## schema-registry.md Updates

After completion, update EditorStateSchema:

```markdown
- `EditorStateSchema` — persisted editor state
  - Keys: currentSceneId, currentTool, activeLayer, layerOrder[], selectedTile{}, brushSize, viewport{}, panelStates{}, recentTiles[], layerVisibility{}, layerLocks{}, lastExportedAt, exportReminderDismissedUntil, changesSinceExport
  - Apply mode: live (restored on load)
```

Add new entries:

```markdown
### Export/Import System (Tracks 23-24)

- `/src/types/export.ts`
  - `ExportOptions` — export configuration
    - Keys: format ('json' | 'zip'), includeAssets?, scenesOnly?, sceneIds?[]
  - `ImportOptions` — import configuration
    - Keys: strategy ('replace' | 'merge'), sceneConflictResolution ('rename' | 'skip' | 'overwrite')
  - `ValidationError` — import validation error
    - Keys: type, message, path?, line?, details?

- `/src/export/exportManager.ts`
  - `ExportManager` — export operations interface
    - Methods: exportProject, exportScene, copyToClipboard, shouldShowReminder, dismissReminder

- `/src/import/importManager.ts`
  - `ImportManager` — import operations interface
    - Methods: parseFile, importData, importScene
  - `ImportPreview` — pre-import summary
    - Keys: projectName, sceneCount, totalEntities, conflicts[], warnings[], errors[], isValid
```

---

## Notes

- Existing exportAllData/importAllData provide foundation; build on top
- JSZip should be dynamically imported to avoid bundle bloat
- File downloads require Blob URL pattern; tested on mobile browsers
- Clipboard API needs HTTPS; fallback uses deprecated execCommand
- Import validation should be fast; consider Web Worker for large files
- Export reminder is non-blocking (banner, not modal)
- Version field in exports ensures future compatibility
- Round-trip test is the ultimate verification of correctness
