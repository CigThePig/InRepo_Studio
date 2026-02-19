# Track 13: Deploy Flow — Blueprint

## Overview

This blueprint details the technical design for committing changes to GitHub, including change detection, SHA management, conflict handling, and the commit flow. This completes the vertical slice MVP.

---

## Architecture

### Module Structure

```
src/deploy/
├── auth.ts              # EXISTS - Authentication
├── commit.ts            # NEW - Commit operations
├── changeDetector.ts    # NEW - Change detection logic
├── shaManager.ts        # NEW - SHA tracking
├── conflictResolver.ts  # NEW - Conflict handling
├── deployUI.ts          # NEW - Deploy progress UI
└── AGENTS.md            # EXISTS - Deploy rules

src/editor/panels/
├── deployPanel.ts       # MODIFY - Add deploy functionality
```

### Deploy Flow

```
User taps "Deploy":
  1. changeDetector.detectChanges()
     → Compare hot storage with last known SHAs
     → Return list of changed files

  2. shaManager.fetchRemoteSHAs()
     → Get current SHAs from GitHub
     → Identify conflicts

  3. If conflicts:
     → Show conflict resolution UI
     → User resolves each conflict
     → Filter files based on resolution

  4. commit.commitFiles()
     → For each file:
        → Encode content as base64
        → Call GitHub Contents API
        → Update local SHA on success

  5. Update hot storage with new SHAs
  6. Show success/failure result
```

---

## Detailed Design

### 1. Change Detection

**Interfaces:**

```typescript
interface FileChange {
  /** File path relative to repo root */
  path: string;

  /** Type of change */
  status: 'added' | 'modified' | 'deleted';

  /** Content to commit (JSON stringified) */
  content: string;

  /** SHA of file as last deployed (null for new) */
  localSha: string | null;
}

interface ChangeDetectorConfig {
  getProject: () => Promise<HotProject | null>;
  getScenes: () => Promise<Scene[]>;
  getShaStore: () => ShaStore;
}

interface ChangeDetector {
  /** Detect all changes between hot storage and last deploy */
  detectChanges(): Promise<FileChange[]>;
}

function createChangeDetector(config: ChangeDetectorConfig): ChangeDetector;
```

**Implementation:**

```typescript
function createChangeDetector(config: ChangeDetectorConfig): ChangeDetector {
  const { getProject, getScenes, getShaStore } = config;

  return {
    async detectChanges() {
      const changes: FileChange[] = [];
      const shaStore = getShaStore();

      // Check project.json
      const hotProject = await getProject();
      if (hotProject) {
        const projectContent = JSON.stringify(hotProject.project, null, 2);
        const projectPath = 'game/project.json';
        const localSha = shaStore.get(projectPath);

        // Compare content hash or always include
        changes.push({
          path: projectPath,
          status: localSha ? 'modified' : 'added',
          content: projectContent,
          localSha,
        });
      }

      // Check scenes
      const scenes = await getScenes();
      for (const scene of scenes) {
        const scenePath = `game/scenes/${scene.id}.json`;
        const sceneContent = JSON.stringify(scene, null, 2);
        const localSha = shaStore.get(scenePath);

        changes.push({
          path: scenePath,
          status: localSha ? 'modified' : 'added',
          content: sceneContent,
          localSha,
        });
      }

      return changes;
    },
  };
}
```

### 2. SHA Manager

**Interfaces:**

```typescript
interface ShaStore {
  /** Get stored SHA for path */
  get(path: string): string | null;

  /** Set SHA for path */
  set(path: string, sha: string): void;

  /** Remove SHA for path */
  remove(path: string): void;

  /** Get all stored SHAs */
  getAll(): Record<string, string>;

  /** Persist to storage */
  save(): Promise<void>;
}

interface ShaManagerConfig {
  authManager: AuthManager;
  repoOwner: string;
  repoName: string;
}

interface ShaManager {
  /** Create SHA store from storage */
  createStore(): Promise<ShaStore>;

  /** Fetch remote SHA for a file */
  fetchRemoteSha(path: string): Promise<string | null>;

  /** Fetch remote SHAs for multiple files */
  fetchRemoteShas(paths: string[]): Promise<Record<string, string | null>>;
}

function createShaManager(config: ShaManagerConfig): ShaManager;
```

**Implementation:**

```typescript
async function fetchRemoteSha(
  authManager: AuthManager,
  owner: string,
  repo: string,
  path: string
): Promise<string | null> {
  const token = await authManager.getToken();
  if (!token) throw new Error('Not authenticated');

  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
      },
    }
  );

  if (response.status === 404) {
    return null; // File doesn't exist
  }

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status}`);
  }

  const data = await response.json();
  return data.sha;
}
```

### 3. Conflict Detection

**Interfaces:**

```typescript
interface ConflictInfo {
  /** File path */
  path: string;

  /** Local SHA (what we last deployed) */
  localSha: string | null;

  /** Remote SHA (current on GitHub) */
  remoteSha: string | null;

  /** Whether there's a conflict */
  hasConflict: boolean;
}

interface ConflictResult {
  /** Files with no conflict */
  safe: FileChange[];

  /** Files with conflicts */
  conflicts: (FileChange & ConflictInfo)[];
}

function detectConflicts(
  changes: FileChange[],
  remoteShas: Record<string, string | null>
): ConflictResult;
```

**Implementation:**

```typescript
function detectConflicts(
  changes: FileChange[],
  remoteShas: Record<string, string | null>
): ConflictResult {
  const safe: FileChange[] = [];
  const conflicts: (FileChange & ConflictInfo)[] = [];

  for (const change of changes) {
    const remoteSha = remoteShas[change.path];

    // No conflict if:
    // - File is new (no local SHA, no remote SHA)
    // - Remote hasn't changed since our last deploy (localSha === remoteSha)
    const hasConflict =
      change.localSha !== null &&
      remoteSha !== null &&
      change.localSha !== remoteSha;

    if (hasConflict) {
      conflicts.push({
        ...change,
        remoteSha,
        hasConflict: true,
      });
    } else {
      safe.push(change);
    }
  }

  return { safe, conflicts };
}
```

### 4. Conflict Resolution

**Interfaces:**

```typescript
type ConflictResolution = 'overwrite' | 'pull' | 'skip';

interface ResolvedConflict {
  path: string;
  resolution: ConflictResolution;
}

interface ConflictResolverUI {
  /** Show conflict resolution dialog */
  show(conflicts: ConflictInfo[]): Promise<ResolvedConflict[]>;
}
```

**UI Design:**

```
+----------------------------------------+
|         Resolve Conflicts              |
+----------------------------------------+
|                                        |
| The following files have been changed  |
| on GitHub since your last deploy:      |
|                                        |
| game/scenes/main.json                  |
| [Overwrite] [Pull Remote] [Skip]       |
|                                        |
| game/project.json                      |
| [Overwrite] [Pull Remote] [Skip]       |
|                                        |
| [Cancel Deploy]  [Continue with Above] |
+----------------------------------------+

Overwrite: Push your local changes, replacing remote
Pull Remote: Update your local copy with remote changes
Skip: Don't deploy this file (keep both versions as-is)
```

### 5. Commit Operations

**Interfaces:**

```typescript
interface CommitConfig {
  authManager: AuthManager;
  repoOwner: string;
  repoName: string;
  branch?: string;
}

interface CommitResult {
  success: boolean;
  path: string;
  newSha?: string;
  error?: string;
}

interface CommitProgress {
  current: number;
  total: number;
  currentFile: string;
}

interface Committer {
  /** Commit a single file */
  commitFile(
    change: FileChange,
    message: string,
    remoteSha: string | null
  ): Promise<CommitResult>;

  /** Commit multiple files with progress */
  commitFiles(
    changes: FileChange[],
    remoteShas: Record<string, string | null>,
    onProgress?: (progress: CommitProgress) => void
  ): Promise<CommitResult[]>;
}

function createCommitter(config: CommitConfig): Committer;
```

**Implementation:**

```typescript
async function commitFile(
  config: CommitConfig,
  change: FileChange,
  message: string,
  remoteSha: string | null
): Promise<CommitResult> {
  const { authManager, repoOwner, repoName, branch } = config;

  const token = await authManager.getToken();
  if (!token) {
    return { success: false, path: change.path, error: 'Not authenticated' };
  }

  try {
    // Encode content as base64
    const contentBase64 = btoa(unescape(encodeURIComponent(change.content)));

    const body: Record<string, unknown> = {
      message,
      content: contentBase64,
    };

    // Include SHA for updates (required by GitHub API)
    if (remoteSha) {
      body.sha = remoteSha;
    }

    if (branch) {
      body.branch = branch;
    }

    const response = await fetch(
      `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${change.path}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        path: change.path,
        error: errorData.message || `API error: ${response.status}`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      path: change.path,
      newSha: data.content.sha,
    };

  } catch (error) {
    return {
      success: false,
      path: change.path,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
```

### 6. Deploy UI

**Interface:**

```typescript
interface DeployStatus {
  phase: 'idle' | 'detecting' | 'fetching' | 'resolving' | 'committing' | 'done' | 'error';
  message: string;
  progress?: CommitProgress;
  results?: CommitResult[];
  error?: string;
}

interface DeployUIConfig {
  container: HTMLElement;
  onDeploy: () => void;
  onCancel: () => void;
}

interface DeployUI {
  /** Update status display */
  setStatus(status: DeployStatus): void;

  /** Show conflict resolution */
  showConflicts(conflicts: ConflictInfo[]): Promise<ResolvedConflict[]>;

  /** Enable/disable deploy button */
  setDeployEnabled(enabled: boolean): void;
}

function createDeployUI(config: DeployUIConfig): DeployUI;
```

### 7. Deploy Orchestrator

**Main flow:**

```typescript
interface DeployOrchestratorConfig {
  authManager: AuthManager;
  changeDetector: ChangeDetector;
  shaManager: ShaManager;
  committer: Committer;
  deployUI: DeployUI;
  repoOwner: string;
  repoName: string;
}

async function deploy(config: DeployOrchestratorConfig): Promise<void> {
  const {
    authManager, changeDetector, shaManager,
    committer, deployUI, repoOwner, repoName
  } = config;

  try {
    // 1. Check authentication
    const authState = await authManager.getState();
    if (!authState.isAuthenticated) {
      deployUI.setStatus({
        phase: 'error',
        message: 'Not authenticated',
        error: 'Please connect to GitHub first',
      });
      return;
    }

    // 2. Detect changes
    deployUI.setStatus({
      phase: 'detecting',
      message: 'Checking for changes...',
    });

    const changes = await changeDetector.detectChanges();
    if (changes.length === 0) {
      deployUI.setStatus({
        phase: 'done',
        message: 'No changes to deploy',
      });
      return;
    }

    // 3. Fetch remote SHAs
    deployUI.setStatus({
      phase: 'fetching',
      message: 'Checking remote files...',
    });

    const paths = changes.map(c => c.path);
    const remoteShas = await shaManager.fetchRemoteShas(paths);

    // 4. Detect conflicts
    const { safe, conflicts } = detectConflicts(changes, remoteShas);

    // 5. Resolve conflicts if any
    let filesToCommit = safe;
    if (conflicts.length > 0) {
      deployUI.setStatus({
        phase: 'resolving',
        message: `${conflicts.length} file(s) have conflicts`,
      });

      const resolutions = await deployUI.showConflicts(conflicts);

      // Process resolutions
      for (const resolution of resolutions) {
        if (resolution.resolution === 'overwrite') {
          const conflict = conflicts.find(c => c.path === resolution.path);
          if (conflict) {
            filesToCommit.push(conflict);
          }
        } else if (resolution.resolution === 'pull') {
          // Pull remote version - handled separately
          // For MVP, just skip and tell user to refresh
        }
        // 'skip' - do nothing
      }
    }

    if (filesToCommit.length === 0) {
      deployUI.setStatus({
        phase: 'done',
        message: 'No files to deploy after resolution',
      });
      return;
    }

    // 6. Commit files
    deployUI.setStatus({
      phase: 'committing',
      message: `Deploying ${filesToCommit.length} file(s)...`,
    });

    const timestamp = new Date().toISOString();
    const message = `Update via InRepo Studio - ${timestamp}`;

    const results = await committer.commitFiles(
      filesToCommit,
      remoteShas,
      (progress) => {
        deployUI.setStatus({
          phase: 'committing',
          message: `Deploying ${progress.current}/${progress.total}: ${progress.currentFile}`,
          progress,
        });
      }
    );

    // 7. Update SHAs for successful commits
    const shaStore = await shaManager.createStore();
    for (const result of results) {
      if (result.success && result.newSha) {
        shaStore.set(result.path, result.newSha);
      }
    }
    await shaStore.save();

    // 8. Show results
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    if (failCount === 0) {
      deployUI.setStatus({
        phase: 'done',
        message: `Successfully deployed ${successCount} file(s)`,
        results,
      });
    } else {
      deployUI.setStatus({
        phase: 'error',
        message: `Deployed ${successCount} file(s), ${failCount} failed`,
        results,
        error: results.find(r => !r.success)?.error,
      });
    }

  } catch (error) {
    deployUI.setStatus({
      phase: 'error',
      message: 'Deploy failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
```

---

## State Management

### SHA Store (persisted in IndexedDB)

```typescript
interface ShaStoreData {
  // Map of file path to SHA
  shas: Record<string, string>;
  // Last update timestamp
  lastUpdated: string;
}
```

### Deploy State (transient)

```typescript
interface DeployState {
  phase: DeployStatus['phase'];
  changes: FileChange[];
  conflicts: ConflictInfo[];
  resolutions: ResolvedConflict[];
  results: CommitResult[];
}
```

---

## Files Created/Modified

| File | Action | Purpose |
|------|--------|---------|
| `src/deploy/commit.ts` | Create | GitHub commit operations |
| `src/deploy/changeDetector.ts` | Create | Change detection logic |
| `src/deploy/shaManager.ts` | Create | SHA tracking and fetching |
| `src/deploy/conflictResolver.ts` | Create | Conflict handling |
| `src/deploy/deployUI.ts` | Create | Deploy progress UI |
| `src/editor/panels/deployPanel.ts` | Modify | Add full deploy flow |

---

## API Contracts

### GitHub Contents API

```
PUT /repos/{owner}/{repo}/contents/{path}

Request:
{
  "message": "commit message",
  "content": "base64 encoded content",
  "sha": "blob sha of file being replaced" (required for updates)
}

Response:
{
  "content": {
    "sha": "new blob sha"
  },
  "commit": {
    "sha": "commit sha"
  }
}
```

### Change Detector

```typescript
const detector = createChangeDetector({
  getProject: () => getProject(),
  getScenes: () => getAllScenes(),
  getShaStore: () => shaStore,
});

const changes = await detector.detectChanges();
```

### Committer

```typescript
const committer = createCommitter({
  authManager,
  repoOwner: 'username',
  repoName: 'my-game',
});

const results = await committer.commitFiles(changes, remoteShas);
```

---

## Edge Cases

1. **No Changes**: Show "No changes to deploy" message
2. **All Skipped**: Show "No files deployed" after resolution
3. **Partial Failure**: Show mixed results, allow retry
4. **Network Error Mid-Commit**: Show which files succeeded/failed
5. **Rate Limit During Commit**: Pause, show warning, offer retry
6. **Large Files**: Warn if file > 1MB, may need blob API
7. **Concurrent Deploy**: Disable button during deploy

---

## Performance Considerations

1. **Batch SHA Fetching**: Fetch SHAs in parallel where possible
2. **Rate Limit Awareness**: Check X-RateLimit headers
3. **Progress Feedback**: Update UI after each file
4. **Content Encoding**: Use efficient base64 encoding

---

## Testing Strategy

### Manual Tests

1. Edit tiles, deploy, verify on GitHub
2. Edit on GitHub, try deploy, see conflict
3. Resolve with each option (overwrite, pull, skip)
4. Deploy multiple files
5. Test deploy failure handling
6. Test network error handling

### Unit Tests

1. `detectChanges`: Identifies modified files
2. `detectConflicts`: Identifies SHA mismatches
3. `commitFile`: Correct API call structure
4. SHA encoding/decoding

---

## Notes

- GitHub Contents API has 1MB limit per file
- Rate limit: 5000 requests/hour with token
- Commit message auto-generated with timestamp
- Consider showing GitHub Pages rebuild status
- User must manually refresh to see changes after deploy
