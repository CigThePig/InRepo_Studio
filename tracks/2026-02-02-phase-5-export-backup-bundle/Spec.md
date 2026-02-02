# Phase 5: Export/Backup — Spec (Tracks 23-24 Bundle)

## Overview

This bundle covers the complete Export/Backup system for InRepo Studio, enabling users to safely export their project data from the browser and restore from backups. The export/import system builds on the existing hot storage infrastructure (Track 2) to provide reliable data portability and protection against browser storage loss.

**Bundled Tracks:**
- Track 23: Export Functions (6.1)
- Track 24: Import Functions (6.2)

---

## Track 23: Export Functions

### Goal

Enable users to export their project data from browser storage to downloadable files for backup and portability.

### User Story

As a mobile game developer, I want to export my project data so that I can back up my work, transfer it to another device, or recover from browser storage being cleared.

### Scope

**In Scope:**
1. JSON export (full project with all scenes)
2. Individual scene export
3. ZIP export (project + scenes + optional assets)
4. Clipboard export (for quick sharing of small data)
5. Export reminder system (nudge user to back up periodically)

**Out of Scope (deferred):**
- Cloud backup integration (Google Drive, Dropbox)
- Automatic scheduled backups
- Incremental/differential exports
- Export to other game engine formats
- Asset-only export

### Acceptance Criteria

1. **JSON Export (Full Project)**
   - [ ] Export button accessible from settings/menu
   - [ ] Exports project.json and all scenes in single file
   - [ ] Includes export metadata (version, timestamp)
   - [ ] Downloads as `[project-name]-backup-[date].json`
   - [ ] Export succeeds even with large projects (100+ entities, 10+ scenes)
   - [ ] Works on iOS Safari and Android Chrome

2. **Individual Scene Export**
   - [ ] Can export single scene from scene management UI
   - [ ] Scene export includes scene data only (not full project)
   - [ ] Downloads as `[scene-name].json`
   - [ ] Exported scene can be imported into same or different project

3. **ZIP Export**
   - [ ] Option to export as ZIP archive
   - [ ] ZIP contains project.json, scenes/, and assets/
   - [ ] Assets include only referenced tile images
   - [ ] Uses browser-compatible ZIP library (no server required)
   - [ ] Progress indicator for large exports
   - [ ] Downloads as `[project-name]-full-[date].zip`

4. **Clipboard Export**
   - [ ] Quick copy for scene data or selection
   - [ ] Uses Clipboard API with fallback for older browsers
   - [ ] Visual confirmation of successful copy
   - [ ] Suitable for sharing snippets (single scene, entity config)

5. **Export Reminder System**
   - [ ] Track last export timestamp in EditorState
   - [ ] Show gentle reminder if not exported in 7 days
   - [ ] Reminder dismissible with "remind later" option
   - [ ] Reminder appears after significant changes (N edits)
   - [ ] User can disable reminders in settings

### Verification

- Manual: Export full project, verify file downloads
- Manual: Export ZIP, verify contents extractable
- Manual: Copy to clipboard, paste to verify data
- Manual: Test reminder appears after 7 days of edits
- Manual: Test on mobile browsers (iOS Safari, Android Chrome)
- Automated: Export/import round-trip test

---

## Track 24: Import Functions

### Goal

Enable users to restore project data from backup files with validation and conflict handling.

### User Story

As a mobile game developer, I want to import backed-up project data so that I can restore my work on a new device or recover from data loss.

### Scope

**In Scope:**
1. JSON import with validation
2. Merge vs replace options
3. Import preview (show what will change)
4. ZIP import
5. Import validation errors (clear feedback)
6. Scene import (add scene to existing project)

**Out of Scope (deferred):**
- Cloud import integration
- Import from other game engine formats
- Partial import (cherry-pick specific data)
- Conflict resolution for individual entities
- Import history/undo

### Acceptance Criteria

1. **JSON Import with Validation**
   - [ ] Import button accessible from settings/menu
   - [ ] Accepts files via file picker (mobile-friendly)
   - [ ] Validates JSON structure before import
   - [ ] Validates schema version compatibility
   - [ ] Validates required fields present
   - [ ] Validates data types match schema
   - [ ] Shows validation errors with line/field details

2. **Merge vs Replace Options**
   - [ ] Clear choice presented before import
   - [ ] **Replace**: Clear all existing data, import backup (default for full project)
   - [ ] **Merge**: Add imported scenes to existing project
   - [ ] Merge handles scene ID conflicts (rename or skip)
   - [ ] User can review merge strategy before confirming

3. **Import Preview**
   - [ ] Show summary before import executes
   - [ ] Preview shows: project name, scene count, total entities
   - [ ] Preview shows what will change (added, modified, removed)
   - [ ] User confirms or cancels after preview
   - [ ] Large imports show estimated completion

4. **ZIP Import**
   - [ ] Accepts ZIP files via file picker
   - [ ] Extracts and validates ZIP contents
   - [ ] Handles project.json, scenes/, assets/ structure
   - [ ] Progress indicator for large imports
   - [ ] Assets copied to appropriate locations (if supported)

5. **Import Validation Errors**
   - [ ] Clear error messages for common issues
   - [ ] "Invalid JSON" - syntax error with position
   - [ ] "Unsupported version" - version mismatch
   - [ ] "Missing required field" - which field, where
   - [ ] "Invalid data type" - expected vs actual
   - [ ] "Corrupted file" - checksum mismatch (if applicable)
   - [ ] Errors displayed in scrollable list
   - [ ] Option to import partial data if some scenes valid

6. **Scene Import**
   - [ ] Import single scene into existing project
   - [ ] Handle scene ID conflicts (auto-rename or user choice)
   - [ ] Validate scene references valid entity types
   - [ ] Missing entity types shown as warning (not error)
   - [ ] Scene appears in scene list after import

### Verification

- Manual: Import valid JSON, verify data restored
- Manual: Import invalid JSON, verify clear error
- Manual: Import ZIP, verify full restoration
- Manual: Test merge mode with existing data
- Manual: Test scene import with ID conflict
- Manual: Test on mobile browsers (iOS Safari, Android Chrome)
- Automated: Import validation tests

---

## Dependencies

| Track | Depends On |
|-------|------------|
| Track 23 | Track 2 (Hot Storage - existing exportAllData) |
| Track 24 | Track 23 (Export Functions), Track 2 (Hot Storage) |

**Internal Dependencies:**
```
Track 23 → Track 24
```

---

## Risks

1. **Browser Storage Volatility**: IndexedDB can be cleared by browser
   - Mitigation: Export reminders, clear messaging about backup importance

2. **Large File Downloads on Mobile**: ZIP exports may be large
   - Mitigation: Progress indicators, chunked processing, size warnings

3. **File Picker Compatibility**: Mobile browsers vary in file picker support
   - Mitigation: Test on target browsers, provide fallback UI

4. **Clipboard API Limitations**: Some browsers restrict clipboard access
   - Mitigation: Graceful fallback, execCommand for older browsers

5. **ZIP Library Size**: Client-side ZIP adds bundle size
   - Mitigation: Dynamic import, only load when needed

6. **Import Performance**: Large imports may freeze UI
   - Mitigation: Web Worker for processing, progress indicators

7. **Schema Version Drift**: Old exports may not match current schema
   - Mitigation: Version field, migration logic, clear error messages

---

## Notes

- Export/import infrastructure exists in `/src/storage/hot.ts` (exportAllData, importAllData)
- ExportData schema: { version: 1, exportedAt: number, project: Project | null, scenes: Scene[] }
- ZIP library recommendation: JSZip (well-maintained, browser-compatible)
- Export reminder state stored in EditorState (lastExportedAt, exportReminderDismissedUntil)
- Import validation uses existing type definitions from `/src/types/`
- Clipboard API requires secure context (HTTPS) on most browsers
- File downloads use Blob URL + anchor click pattern
- Consider base64-encoded assets in ZIP for full portability
