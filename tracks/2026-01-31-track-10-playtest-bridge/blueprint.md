# Track 10: Playtest Bridge — Blueprint

## Overview

This blueprint details the technical design for bridging editor and runtime modes, enabling instant playtesting with hot storage data. The system manages mode transitions, data source selection, and state preservation.

---

## Architecture

### Module Structure

```
src/editor/
├── init.ts              # MODIFY - Add playtest trigger
├── panels/
│   └── topPanel.ts      # MODIFY - Add playtest button

src/runtime/
├── init.ts              # MODIFY - Accept data source mode
├── loader.ts            # NEW - Unified data loader (hot/cold)
├── playtestOverlay.ts   # NEW - Playtest mode UI overlay

src/boot/
├── main.ts              # MODIFY - Handle mode transitions
├── modeRouter.ts        # MODIFY - Add playtest mode
```

### Mode Transitions

```
Editor Mode
    ↓ [Playtest button]
Save current scene → Set playtest flag → Init runtime (hot mode)
    ↓
Playtest Mode (runtime with hot data)
    ↓ [Exit button]
Clean runtime → Clear playtest flag → Init editor → Restore state
    ↓
Editor Mode (state preserved)
```

---

## Detailed Design

### 1. Data Source Mode

**Type definition:**

```typescript
type DataSourceMode = 'hot' | 'cold';

interface RuntimeConfig {
  dataSource: DataSourceMode;
  startSceneId?: string;
}
```

**Detection logic:**

```typescript
function getDataSourceMode(): DataSourceMode {
  // Playtest from editor uses hot storage
  if (sessionStorage.getItem('playtest') === 'true') {
    return 'hot';
  }
  // Direct game access uses cold storage (deployed data)
  return 'cold';
}
```

### 2. Playtest State Management

**Session storage keys:**

```typescript
const PLAYTEST_FLAG = 'inrepo_playtest';
const PLAYTEST_SCENE = 'inrepo_playtest_scene';
const EDITOR_STATE_BACKUP = 'inrepo_editor_backup';
```

**State flow:**

```typescript
// Before playtest
function preparePlaytest(currentSceneId: string): void {
  // Save editor state for restoration
  const editorState = await getEditorState();
  sessionStorage.setItem(EDITOR_STATE_BACKUP, JSON.stringify(editorState));

  // Mark playtest mode
  sessionStorage.setItem(PLAYTEST_FLAG, 'true');
  sessionStorage.setItem(PLAYTEST_SCENE, currentSceneId);
}

// After playtest
function cleanupPlaytest(): void {
  sessionStorage.removeItem(PLAYTEST_FLAG);
  sessionStorage.removeItem(PLAYTEST_SCENE);
  // Keep EDITOR_STATE_BACKUP for restoration
}
```

### 3. Unified Loader

**Interface:**

```typescript
interface UnifiedLoader {
  /** Load project data */
  loadProject(): Promise<Project>;

  /** Load scene data */
  loadScene(sceneId: string): Promise<Scene>;

  /** Get current data source mode */
  getMode(): DataSourceMode;
}

function createUnifiedLoader(mode: DataSourceMode): UnifiedLoader;
```

**Implementation:**

```typescript
function createUnifiedLoader(mode: DataSourceMode): UnifiedLoader {
  return {
    getMode() {
      return mode;
    },

    async loadProject() {
      if (mode === 'hot') {
        const hotData = await getProject();
        if (!hotData) {
          throw new Error('No project data in hot storage');
        }
        return hotData.project;
      } else {
        return await fetchProject();
      }
    },

    async loadScene(sceneId: string) {
      if (mode === 'hot') {
        const scene = await getScene(sceneId);
        if (!scene) {
          throw new Error(`Scene ${sceneId} not found in hot storage`);
        }
        return scene;
      } else {
        return await fetchScene(sceneId);
      }
    },
  };
}
```

### 4. Playtest Button

**Location:** Top panel, right side

**Component:**

```typescript
interface PlaytestButtonConfig {
  onPlaytest: () => void;
  disabled?: boolean;
}

function createPlaytestButton(
  container: HTMLElement,
  config: PlaytestButtonConfig
): HTMLButtonElement;
```

**UI Design:**

```
+------------------------------------------+
| Scene: Main    | Ground ▼ |  [▶ Playtest] |
+------------------------------------------+
```

### 5. Playtest Overlay

**Overlay component:**

```typescript
interface PlaytestOverlay {
  /** Show the overlay */
  show(): void;

  /** Hide the overlay */
  hide(): void;

  /** Set exit callback */
  onExit(callback: () => void): void;
}

function createPlaytestOverlay(container: HTMLElement): PlaytestOverlay;
```

**Visual design:**

```
+------------------------------------------+
|                                    [Exit] |
|                                          |
|           (Game renders here)            |
|                                          |
|   ┌──────────────┐                       |
|   │  PLAYTEST    │                       |
|   └──────────────┘                       |
+------------------------------------------+

- "PLAYTEST" badge: bottom-left, semi-transparent
- "Exit" button: top-right, touch-friendly (44x44px minimum)
```

### 6. Mode Router Updates

**Add playtest mode:**

```typescript
type AppMode = 'editor' | 'game' | 'playtest';

function detectMode(): AppMode {
  // Check for playtest flag first
  if (sessionStorage.getItem(PLAYTEST_FLAG) === 'true') {
    return 'playtest';
  }

  // Existing editor detection
  const params = new URLSearchParams(window.location.search);
  if (params.get('tool') === 'editor') {
    return 'editor';
  }

  return 'game';
}
```

### 7. Main Entry Updates

**Boot sequence:**

```typescript
async function main(): Promise<void> {
  const mode = detectMode();

  switch (mode) {
    case 'editor':
      await initEditor();
      break;

    case 'playtest':
      await initPlaytest();
      break;

    case 'game':
      await initGame();
      break;
  }
}

async function initPlaytest(): Promise<void> {
  const sceneId = sessionStorage.getItem(PLAYTEST_SCENE);

  // Create loader with hot data source
  const loader = createUnifiedLoader('hot');

  // Initialize runtime with hot data
  await initRuntime({
    loader,
    startSceneId: sceneId || undefined,
  });

  // Show playtest overlay
  const overlay = createPlaytestOverlay(document.body);
  overlay.onExit(() => exitPlaytest());
  overlay.show();
}

function exitPlaytest(): void {
  cleanupPlaytest();

  // Reload as editor mode
  const url = new URL(window.location.href);
  url.searchParams.set('tool', 'editor');
  window.location.href = url.toString();
}
```

### 8. Editor Integration

**Playtest trigger:**

```typescript
// In init.ts
async function startPlaytest(): Promise<void> {
  // Ensure current scene is saved
  if (currentScene) {
    await saveScene(currentScene);
  }

  // Save editor state
  if (editorState) {
    await saveEditorState(editorState);
  }

  // Prepare playtest
  preparePlaytest(currentScene?.id || project?.defaultScene || 'main');

  // Transition to playtest mode
  window.location.reload();
}
```

**State restoration:**

```typescript
// When returning from playtest
async function restoreFromPlaytest(): Promise<void> {
  const backup = sessionStorage.getItem(EDITOR_STATE_BACKUP);
  if (backup) {
    try {
      const savedState = JSON.parse(backup);
      // Merge with loaded state
      Object.assign(editorState, savedState);
    } catch (e) {
      console.warn('Failed to restore editor state:', e);
    }
    sessionStorage.removeItem(EDITOR_STATE_BACKUP);
  }
}
```

---

## State Management

### Session Storage Schema

```typescript
interface PlaytestSessionData {
  // Flag indicating playtest mode
  playtest: 'true' | null;

  // Scene to start playtest from
  playtestScene: string | null;

  // Editor state backup for restoration
  editorBackup: string | null; // JSON-serialized EditorState
}
```

### State Transitions

```
Initial Load:
  - No playtest flag → Normal editor/game boot

Start Playtest:
  1. Save scene to IndexedDB
  2. Save editor state to IndexedDB
  3. Set playtest flag in sessionStorage
  4. Set playtest scene in sessionStorage
  5. Reload page

Playtest Boot:
  1. Detect playtest flag
  2. Create hot data loader
  3. Init runtime
  4. Show overlay

Exit Playtest:
  1. Clear playtest flags
  2. Set ?tool=editor
  3. Reload page

Editor Boot (after playtest):
  1. Normal editor init
  2. Check for backup state
  3. Restore state if found
  4. Clear backup
```

---

## Files Created/Modified

| File | Action | Purpose |
|------|--------|---------|
| `src/runtime/loader.ts` | Create | Unified hot/cold data loader |
| `src/runtime/playtestOverlay.ts` | Create | Playtest mode UI overlay |
| `src/boot/modeRouter.ts` | Modify | Add playtest mode detection |
| `src/boot/main.ts` | Modify | Handle playtest initialization |
| `src/editor/init.ts` | Modify | Add playtest trigger function |
| `src/editor/panels/topPanel.ts` | Modify | Add playtest button |

---

## API Contracts

### UnifiedLoader

```typescript
const loader = createUnifiedLoader('hot');
const project = await loader.loadProject();
const scene = await loader.loadScene('main');
```

### PlaytestOverlay

```typescript
const overlay = createPlaytestOverlay(document.body);
overlay.onExit(() => handleExit());
overlay.show();
```

### Playtest Trigger

```typescript
// From editor
await startPlaytest(); // Saves state and reloads into playtest
```

---

## Edge Cases

1. **No Scene Loaded**: Use project.defaultScene or 'main'
2. **Save Fails**: Show error, don't transition to playtest
3. **Hot Storage Empty**: Show error in playtest, offer return
4. **Browser Back Button**: Should return to editor, not previous URL
5. **Session Storage Full**: Warn user, playtest still works (state not preserved)
6. **Multiple Tabs**: Each tab independent playtest state

---

## Performance Considerations

1. **Clean Editor Resources**: Pause/destroy editor canvas before playtest
2. **Fresh Data Load**: Always reload from IndexedDB, no caching
3. **Minimal Overlay**: Simple DOM overlay, not canvas-rendered
4. **Quick Transition**: Aim for <1s mode switch

---

## Testing Strategy

### Manual Tests

1. Edit tiles → playtest → verify changes visible
2. Exit playtest → verify editor state restored
3. Playtest from different scenes
4. Test exit button on mobile
5. Test with no saved data (error handling)

### Unit Tests

1. `createUnifiedLoader`: Hot vs cold loading
2. `detectMode`: Correct mode detection
3. `preparePlaytest/cleanupPlaytest`: State management
4. Loader error handling

---

## Notes

- Session storage used for playtest flag (cleared on tab close)
- IndexedDB used for actual data (persists)
- Full page reload for mode transitions (simpler than SPA routing)
- Consider loading indicator during transition
- Runtime must handle hot data format correctly
