# Phase 5: Export/Backup — Blueprint (Tracks 23-24 Bundle)

## Overview

This blueprint details the technical design for the complete Export/Backup system, covering export functions, import functions, and the reminder system. The system builds on the existing hot storage infrastructure while introducing new modules for file handling, validation, and user-facing UI.

---

## Architecture

### Module Structure

```
src/
├── export/
│   ├── exportManager.ts       # NEW - Export orchestration
│   ├── jsonExporter.ts        # NEW - JSON export logic
│   ├── zipExporter.ts         # NEW - ZIP export logic
│   ├── clipboardExporter.ts   # NEW - Clipboard export
│   └── index.ts               # NEW - Export module entry
├── import/
│   ├── importManager.ts       # NEW - Import orchestration
│   ├── jsonImporter.ts        # NEW - JSON import + validation
│   ├── zipImporter.ts         # NEW - ZIP import logic
│   ├── validator.ts           # NEW - Schema validation
│   └── index.ts               # NEW - Import module entry
├── editor/
│   └── panels/
│       └── exportImportPanel.ts  # NEW - Export/Import UI
├── storage/
│   └── hot.ts                 # MODIFY - Add export reminder state
└── types/
    └── export.ts              # NEW - Export/import type definitions
```

### Data Flow

```
Export Flow:
  1. User triggers export (button click)
  2. ExportManager.export(format, options)
  3. Gather data from IndexedDB (project, scenes)
  4. Format data (JSON or ZIP with JSZip)
  5. Generate file blob
  6. Trigger download via anchor element
  7. Update lastExportedAt in EditorState

Import Flow:
  1. User selects file (file picker)
  2. Read file contents (FileReader API)
  3. Detect format (JSON or ZIP)
  4. Validate structure and schema
  5. Show preview to user
  6. User confirms merge/replace strategy
  7. ImportManager.import(data, strategy)
  8. Write to IndexedDB
  9. Reload editor state

Export Reminder Flow:
  1. On editor load, check lastExportedAt
  2. If > 7 days ago, set reminderPending = true
  3. Show reminder banner (non-blocking)
  4. User can: Export Now | Remind Later | Disable
  5. Track change count; remind after N significant changes
```

---

## Track 23: Export Functions — Detailed Design

### 1. Export Manager

**Interface:**

```typescript
interface ExportOptions {
  format: 'json' | 'zip';
  includeAssets?: boolean;
  scenesOnly?: boolean;
  sceneIds?: string[];
}

interface ExportResult {
  success: boolean;
  filename: string;
  size: number;
  error?: string;
}

interface ExportManager {
  /** Export full project */
  exportProject(options: ExportOptions): Promise<ExportResult>;

  /** Export single scene */
  exportScene(sceneId: string): Promise<ExportResult>;

  /** Copy data to clipboard */
  copyToClipboard(data: unknown): Promise<boolean>;

  /** Get export reminder status */
  shouldShowReminder(): boolean;

  /** Dismiss reminder */
  dismissReminder(duration: 'session' | 'week' | 'forever'): void;
}

function createExportManager(storage: HotStorageAPI): ExportManager;
```

### 2. JSON Exporter

**Interface:**

```typescript
interface JsonExportData extends ExportData {
  // Extends existing ExportData from hot.ts
  version: number;
  exportedAt: number;
  project: Project | null;
  scenes: Scene[];
  // Additional metadata
  exportFormat: 'full' | 'scene';
  sourceVersion: string;
}

function exportToJson(data: JsonExportData): Blob;
function generateFilename(project: Project | null, format: string): string;
function triggerDownload(blob: Blob, filename: string): void;
```

**Implementation Details:**

```typescript
function exportToJson(data: JsonExportData): Blob {
  const json = JSON.stringify(data, null, 2);
  return new Blob([json], { type: 'application/json' });
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function generateFilename(project: Project | null, format: string): string {
  const name = project?.name ?? 'inrepo-project';
  const sanitized = name.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  const date = new Date().toISOString().split('T')[0];
  return `${sanitized}-backup-${date}.${format}`;
}
```

### 3. ZIP Exporter

**Interface:**

```typescript
interface ZipExportOptions {
  includeAssets: boolean;
  compressionLevel?: number;
}

interface ZipExporter {
  /** Create ZIP from export data */
  createZip(data: ExportData, options: ZipExportOptions): Promise<Blob>;

  /** Add assets to ZIP */
  addAssets(zip: JSZip, project: Project): Promise<void>;
}

function createZipExporter(): ZipExporter;
```

**ZIP Structure:**

```
project-backup-2026-02-02.zip
├── project.json              # Project metadata
├── scenes/
│   ├── scene-1.json          # Individual scene files
│   └── scene-2.json
├── assets/
│   ├── tiles/
│   │   ├── terrain.png
│   │   └── objects.png
│   └── entities/
│       └── player.png
└── manifest.json             # ZIP metadata (version, contents)
```

**Implementation with JSZip:**

```typescript
import JSZip from 'jszip';

async function createZip(data: ExportData, options: ZipExportOptions): Promise<Blob> {
  const zip = new JSZip();

  // Add manifest
  zip.file('manifest.json', JSON.stringify({
    version: 1,
    createdAt: Date.now(),
    projectName: data.project?.name,
    sceneCount: data.scenes.length,
  }, null, 2));

  // Add project
  if (data.project) {
    zip.file('project.json', JSON.stringify(data.project, null, 2));
  }

  // Add scenes
  const scenesFolder = zip.folder('scenes');
  for (const scene of data.scenes) {
    scenesFolder?.file(`${scene.id}.json`, JSON.stringify(scene, null, 2));
  }

  // Add assets if requested
  if (options.includeAssets && data.project) {
    await addAssets(zip, data.project);
  }

  return zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: options.compressionLevel ?? 6 },
  });
}
```

### 4. Clipboard Exporter

**Interface:**

```typescript
interface ClipboardExporter {
  /** Copy JSON data to clipboard */
  copyJson(data: unknown): Promise<boolean>;

  /** Check if clipboard API available */
  isAvailable(): boolean;
}

function createClipboardExporter(): ClipboardExporter;
```

**Implementation with Fallback:**

```typescript
async function copyJson(data: unknown): Promise<boolean> {
  const json = JSON.stringify(data, null, 2);

  // Modern Clipboard API
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(json);
      return true;
    } catch (err) {
      console.warn('Clipboard API failed, trying fallback');
    }
  }

  // Fallback: execCommand (deprecated but wider support)
  try {
    const textarea = document.createElement('textarea');
    textarea.value = json;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
  } catch (err) {
    console.error('Clipboard fallback failed', err);
    return false;
  }
}
```

### 5. Export Reminder System

**State Additions:**

```typescript
interface EditorState {
  // ... existing fields

  /** Timestamp of last export */
  lastExportedAt: number | null;

  /** Reminder dismissed until this timestamp */
  exportReminderDismissedUntil: number | null;

  /** Count of significant changes since last export */
  changesSinceExport: number;
}

// Defaults
const DEFAULT_EXPORT_STATE = {
  lastExportedAt: null,
  exportReminderDismissedUntil: null,
  changesSinceExport: 0,
};
```

**Reminder Logic:**

```typescript
const REMINDER_INTERVAL_DAYS = 7;
const SIGNIFICANT_CHANGES_THRESHOLD = 50;

function shouldShowReminder(state: EditorState): boolean {
  // Dismissed permanently
  if (state.exportReminderDismissedUntil === -1) return false;

  // Dismissed temporarily
  if (state.exportReminderDismissedUntil && Date.now() < state.exportReminderDismissedUntil) {
    return false;
  }

  // Never exported
  if (!state.lastExportedAt) return true;

  // Time-based reminder
  const daysSinceExport = (Date.now() - state.lastExportedAt) / (1000 * 60 * 60 * 24);
  if (daysSinceExport > REMINDER_INTERVAL_DAYS) return true;

  // Change-based reminder
  if (state.changesSinceExport > SIGNIFICANT_CHANGES_THRESHOLD) return true;

  return false;
}

function dismissReminder(state: EditorState, duration: 'session' | 'week' | 'forever'): EditorState {
  const now = Date.now();
  let dismissedUntil: number | null;

  switch (duration) {
    case 'session':
      dismissedUntil = now + 24 * 60 * 60 * 1000; // 24 hours
      break;
    case 'week':
      dismissedUntil = now + 7 * 24 * 60 * 60 * 1000; // 7 days
      break;
    case 'forever':
      dismissedUntil = -1; // Special value for permanent dismissal
      break;
  }

  return { ...state, exportReminderDismissedUntil: dismissedUntil };
}
```

---

## Track 24: Import Functions — Detailed Design

### 1. Import Manager

**Interface:**

```typescript
type ImportStrategy = 'replace' | 'merge';

interface ImportOptions {
  strategy: ImportStrategy;
  sceneConflictResolution: 'rename' | 'skip' | 'overwrite';
}

interface ImportPreview {
  projectName: string | null;
  sceneCount: number;
  totalEntities: number;
  conflicts: SceneConflict[];
  warnings: string[];
  errors: ValidationError[];
  isValid: boolean;
}

interface SceneConflict {
  importedSceneId: string;
  importedSceneName: string;
  existingSceneId: string;
  existingSceneName: string;
}

interface ImportResult {
  success: boolean;
  scenesImported: number;
  warnings: string[];
  errors: string[];
}

interface ImportManager {
  /** Parse and validate import file */
  parseFile(file: File): Promise<ImportPreview>;

  /** Execute import with options */
  importData(data: ExportData, options: ImportOptions): Promise<ImportResult>;

  /** Import single scene */
  importScene(scene: Scene, options: ImportOptions): Promise<ImportResult>;
}

function createImportManager(storage: HotStorageAPI): ImportManager;
```

### 2. JSON Importer

**Validation Pipeline:**

```typescript
interface ValidationError {
  type: 'syntax' | 'schema' | 'version' | 'data';
  message: string;
  path?: string;
  line?: number;
  details?: unknown;
}

interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: string[];
  data: ExportData | null;
}

function validateJsonImport(content: string): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: string[] = [];

  // Step 1: Parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (err) {
    const syntaxError = err as SyntaxError;
    return {
      isValid: false,
      errors: [{
        type: 'syntax',
        message: `Invalid JSON: ${syntaxError.message}`,
        // Extract line number if available
      }],
      warnings: [],
      data: null,
    };
  }

  // Step 2: Check version
  if (typeof parsed !== 'object' || parsed === null) {
    errors.push({ type: 'schema', message: 'Expected JSON object at root' });
    return { isValid: false, errors, warnings, data: null };
  }

  const data = parsed as Record<string, unknown>;
  if (data.version !== 1) {
    errors.push({
      type: 'version',
      message: `Unsupported export version: ${data.version}. Expected version 1.`,
    });
  }

  // Step 3: Validate required fields
  if (!data.exportedAt || typeof data.exportedAt !== 'number') {
    warnings.push('Missing or invalid exportedAt timestamp');
  }

  // Step 4: Validate project schema
  if (data.project) {
    const projectErrors = validateProject(data.project);
    errors.push(...projectErrors);
  }

  // Step 5: Validate scenes
  if (Array.isArray(data.scenes)) {
    for (let i = 0; i < data.scenes.length; i++) {
      const sceneErrors = validateScene(data.scenes[i], i);
      errors.push(...sceneErrors);
    }
  } else {
    errors.push({ type: 'schema', message: 'scenes must be an array' });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    data: errors.length === 0 ? data as unknown as ExportData : null,
  };
}
```

### 3. Schema Validator

**Interface:**

```typescript
interface Validator {
  validateProject(data: unknown): ValidationError[];
  validateScene(data: unknown, index?: number): ValidationError[];
  validateEntity(data: unknown, scenePath: string): ValidationError[];
}

function createValidator(): Validator;
```

**Validation Rules:**

```typescript
function validateProject(data: unknown): ValidationError[] {
  const errors: ValidationError[] = [];
  const project = data as Record<string, unknown>;

  // Required fields
  if (!project.name || typeof project.name !== 'string') {
    errors.push({ type: 'schema', message: 'Project name is required', path: 'project.name' });
  }

  // Validate tileCategories
  if (project.tileCategories) {
    if (!Array.isArray(project.tileCategories)) {
      errors.push({ type: 'schema', message: 'tileCategories must be an array', path: 'project.tileCategories' });
    } else {
      const names = new Set<string>();
      for (const cat of project.tileCategories) {
        if (names.has(cat.name)) {
          errors.push({ type: 'data', message: `Duplicate tile category name: ${cat.name}` });
        }
        names.add(cat.name);
      }
    }
  }

  // Validate entityTypes
  if (project.entityTypes && Array.isArray(project.entityTypes)) {
    const names = new Set<string>();
    for (const type of project.entityTypes) {
      if (names.has(type.name)) {
        errors.push({ type: 'data', message: `Duplicate entity type name: ${type.name}` });
      }
      names.add(type.name);
    }
  }

  return errors;
}

function validateScene(data: unknown, index?: number): ValidationError[] {
  const errors: ValidationError[] = [];
  const scene = data as Record<string, unknown>;
  const prefix = index !== undefined ? `scenes[${index}]` : 'scene';

  // Required fields
  if (!scene.id || typeof scene.id !== 'string') {
    errors.push({ type: 'schema', message: 'Scene id is required', path: `${prefix}.id` });
  }
  if (!scene.name || typeof scene.name !== 'string') {
    errors.push({ type: 'schema', message: 'Scene name is required', path: `${prefix}.name` });
  }
  if (typeof scene.width !== 'number' || scene.width <= 0) {
    errors.push({ type: 'schema', message: 'Scene width must be positive number', path: `${prefix}.width` });
  }
  if (typeof scene.height !== 'number' || scene.height <= 0) {
    errors.push({ type: 'schema', message: 'Scene height must be positive number', path: `${prefix}.height` });
  }

  // Validate layers
  if (scene.layers) {
    const expectedSize = (scene.width as number) * (scene.height as number);
    for (const layerName of ['ground', 'props', 'collision', 'triggers']) {
      const layer = (scene.layers as Record<string, unknown>)[layerName];
      if (Array.isArray(layer) && layer.length !== expectedSize) {
        errors.push({
          type: 'data',
          message: `Layer ${layerName} size mismatch: expected ${expectedSize}, got ${layer.length}`,
          path: `${prefix}.layers.${layerName}`,
        });
      }
    }
  }

  return errors;
}
```

### 4. ZIP Importer

**Interface:**

```typescript
interface ZipImportResult {
  manifest: ZipManifest | null;
  project: Project | null;
  scenes: Scene[];
  assets: Map<string, Blob>;
  errors: ValidationError[];
}

interface ZipManifest {
  version: number;
  createdAt: number;
  projectName: string;
  sceneCount: number;
}

function importFromZip(file: File): Promise<ZipImportResult>;
```

**Implementation:**

```typescript
import JSZip from 'jszip';

async function importFromZip(file: File): Promise<ZipImportResult> {
  const errors: ValidationError[] = [];
  let manifest: ZipManifest | null = null;
  let project: Project | null = null;
  const scenes: Scene[] = [];
  const assets = new Map<string, Blob>();

  try {
    const zip = await JSZip.loadAsync(file);

    // Read manifest
    const manifestFile = zip.file('manifest.json');
    if (manifestFile) {
      const content = await manifestFile.async('string');
      manifest = JSON.parse(content);
    }

    // Read project
    const projectFile = zip.file('project.json');
    if (projectFile) {
      const content = await projectFile.async('string');
      const parsed = JSON.parse(content);
      const projectErrors = validateProject(parsed);
      if (projectErrors.length === 0) {
        project = parsed as Project;
      } else {
        errors.push(...projectErrors);
      }
    }

    // Read scenes
    const scenesFolder = zip.folder('scenes');
    if (scenesFolder) {
      const sceneFiles = scenesFolder.file(/.+\.json$/);
      for (const sceneFile of sceneFiles) {
        const content = await sceneFile.async('string');
        const parsed = JSON.parse(content);
        const sceneErrors = validateScene(parsed);
        if (sceneErrors.length === 0) {
          scenes.push(parsed as Scene);
        } else {
          errors.push(...sceneErrors);
        }
      }
    }

    // Read assets
    const assetsFolder = zip.folder('assets');
    if (assetsFolder) {
      const assetFiles = assetsFolder.file(/.+\.(png|jpg|jpeg|gif|webp)$/i);
      for (const assetFile of assetFiles) {
        const blob = await assetFile.async('blob');
        assets.set(assetFile.name, blob);
      }
    }

  } catch (err) {
    errors.push({
      type: 'syntax',
      message: `Failed to read ZIP file: ${(err as Error).message}`,
    });
  }

  return { manifest, project, scenes, assets, errors };
}
```

### 5. Merge Strategy

**Interface:**

```typescript
interface MergeResult {
  project: Project;
  scenes: Scene[];
  renamedScenes: Map<string, string>; // oldId -> newId
  skippedScenes: string[];
}

function mergeImport(
  existingProject: Project,
  existingScenes: Scene[],
  importedProject: Project | null,
  importedScenes: Scene[],
  conflictResolution: 'rename' | 'skip' | 'overwrite'
): MergeResult;
```

**Implementation:**

```typescript
function mergeImport(
  existingProject: Project,
  existingScenes: Scene[],
  importedProject: Project | null,
  importedScenes: Scene[],
  conflictResolution: 'rename' | 'skip' | 'overwrite'
): MergeResult {
  const existingIds = new Set(existingScenes.map(s => s.id));
  const renamedScenes = new Map<string, string>();
  const skippedScenes: string[] = [];
  const mergedScenes = [...existingScenes];

  for (const scene of importedScenes) {
    if (existingIds.has(scene.id)) {
      switch (conflictResolution) {
        case 'rename': {
          const newId = generateUniqueId(scene.id, existingIds);
          renamedScenes.set(scene.id, newId);
          mergedScenes.push({ ...scene, id: newId, name: `${scene.name} (imported)` });
          existingIds.add(newId);
          break;
        }
        case 'skip':
          skippedScenes.push(scene.id);
          break;
        case 'overwrite': {
          const index = mergedScenes.findIndex(s => s.id === scene.id);
          if (index !== -1) {
            mergedScenes[index] = scene;
          }
          break;
        }
      }
    } else {
      mergedScenes.push(scene);
      existingIds.add(scene.id);
    }
  }

  // Merge project: keep existing, optionally update entity types
  const mergedProject = { ...existingProject };
  if (importedProject?.entityTypes) {
    // Add missing entity types
    const existingTypes = new Set(existingProject.entityTypes?.map(t => t.name) ?? []);
    const newTypes = importedProject.entityTypes.filter(t => !existingTypes.has(t.name));
    mergedProject.entityTypes = [...(existingProject.entityTypes ?? []), ...newTypes];
  }

  return {
    project: mergedProject,
    scenes: mergedScenes,
    renamedScenes,
    skippedScenes,
  };
}
```

---

## UI Components

### Export/Import Panel

**Layout:**

```
+------------------------------------------+
| Export / Import                     [X]  |
+------------------------------------------+
| EXPORT                                   |
| +--------------------------------------+ |
| | [Export Project (JSON)]              | |
| +--------------------------------------+ |
| | [Export Project (ZIP)]               | |
| +--------------------------------------+ |
| | [Copy to Clipboard]                  | |
| +--------------------------------------+ |
|                                          |
| IMPORT                                   |
| +--------------------------------------+ |
| | [Import from File...]                | |
| +--------------------------------------+ |
|                                          |
| Last exported: 3 days ago                |
+------------------------------------------+
```

**Export Reminder Banner:**

```
+------------------------------------------+
| You haven't exported in 7 days.          |
| [Export Now] [Remind Later] [Don't Ask]  |
+------------------------------------------+
```

---

## Files Created/Modified

| File | Action | Track | Purpose |
|------|--------|-------|---------|
| `src/export/exportManager.ts` | Create | 23 | Export orchestration |
| `src/export/jsonExporter.ts` | Create | 23 | JSON export logic |
| `src/export/zipExporter.ts` | Create | 23 | ZIP export logic |
| `src/export/clipboardExporter.ts` | Create | 23 | Clipboard operations |
| `src/export/index.ts` | Create | 23 | Export module entry |
| `src/import/importManager.ts` | Create | 24 | Import orchestration |
| `src/import/jsonImporter.ts` | Create | 24 | JSON import + validation |
| `src/import/zipImporter.ts` | Create | 24 | ZIP import logic |
| `src/import/validator.ts` | Create | 24 | Schema validation |
| `src/import/index.ts` | Create | 24 | Import module entry |
| `src/types/export.ts` | Create | 23-24 | Type definitions |
| `src/editor/panels/exportImportPanel.ts` | Create | 23-24 | Export/Import UI |
| `src/storage/hot.ts` | Modify | 23 | Export reminder state |
| `package.json` | Modify | 23 | Add jszip dependency |

---

## API Contracts

### Export Manager
```typescript
const exportManager = createExportManager(hotStorage);

// Full project export
await exportManager.exportProject({ format: 'json' });

// ZIP with assets
await exportManager.exportProject({ format: 'zip', includeAssets: true });

// Single scene
await exportManager.exportScene('scene-1');

// Clipboard
await exportManager.copyToClipboard(sceneData);

// Reminder
if (exportManager.shouldShowReminder()) {
  showReminderBanner();
}
```

### Import Manager
```typescript
const importManager = createImportManager(hotStorage);

// Parse and preview
const preview = await importManager.parseFile(file);
if (!preview.isValid) {
  showErrors(preview.errors);
  return;
}

// Show preview to user
showPreviewDialog(preview);

// Execute import
const result = await importManager.importData(preview.data, {
  strategy: 'merge',
  sceneConflictResolution: 'rename',
});

if (result.success) {
  reloadEditor();
}
```

---

## Edge Cases

1. **Empty Project**: Export with no scenes creates valid file with empty array
2. **Large Project**: Progress indicator for exports > 1MB
3. **Corrupted IndexedDB**: Export should fail gracefully with error message
4. **Invalid JSON Syntax**: Clear error with position information
5. **Version Mismatch**: Warning for newer versions, error for unsupported
6. **Scene ID Collision**: Merge strategy handles appropriately
7. **Missing Entity Types**: Warning (not error) for scenes with unknown types
8. **Clipboard Denied**: Fallback to download if copy fails
9. **ZIP Read Failure**: Partial import of valid scenes
10. **Mobile File Picker**: Ensure input accepts .json and .zip

---

## Performance Considerations

1. **Large Exports**: Stream to blob, don't hold entire string in memory
2. **ZIP Compression**: Use DEFLATE level 6 (balanced speed/size)
3. **Validation**: Early exit on fatal errors
4. **Asset Encoding**: Base64 for small assets, blob for large
5. **Progress Updates**: Report progress for operations > 500ms

---

## Testing Strategy

### Manual Tests
1. Export JSON, verify file downloads
2. Export ZIP, extract and verify contents
3. Copy small scene to clipboard, paste elsewhere
4. Import valid JSON, verify data restored
5. Import invalid JSON, verify error messages
6. Import ZIP, verify scenes and assets
7. Test merge with scene conflicts
8. Test reminder after 7 days (mock time)
9. Test on mobile browsers

### Unit Tests
1. JSON export format correctness
2. Validation error detection
3. Merge conflict resolution
4. Filename sanitization
5. ZIP structure generation

---

## Notes

- JSZip is ~45KB gzipped; dynamic import to reduce initial bundle
- File downloads work differently on iOS Safari; test thoroughly
- Clipboard API requires HTTPS in production
- Consider Web Worker for large import validation
- Export format version 1 should be stable for long-term compatibility
- Import should be backwards compatible with all version 1 exports
