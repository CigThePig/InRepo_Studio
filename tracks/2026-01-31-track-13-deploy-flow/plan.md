# Track 13: Deploy Flow — Plan

## Overview

This plan breaks Track 13 into phases with verification checklists and stop points.

**Track Type**: Full
**Estimated Phases**: 4

---

## Recon Summary

### Files Likely to Change

- `src/deploy/commit.ts` (new) - GitHub commit operations
- `src/deploy/changeDetector.ts` (new) - Change detection logic
- `src/deploy/shaManager.ts` (new) - SHA tracking and fetching
- `src/deploy/conflictResolver.ts` (new) - Conflict handling
- `src/deploy/deployUI.ts` (new) - Deploy progress UI
- `src/editor/panels/deployPanel.ts` - Full deploy flow

### Key Modules/Functions Involved

- `createChangeDetector()` - Detect hot storage changes
- `createShaManager()` - Track and fetch SHAs
- `detectConflicts()` - Compare local vs remote SHAs
- `createCommitter()` - Execute GitHub commits
- `deploy()` - Orchestrate full deploy flow

### Invariants to Respect

- Hot/Cold boundary: Deploy publishes hot → repo (cold)
- No data loss: Never overwrite without user consent
- Token security: Never log token in commit operations

### Cross-Module Side Effects

- Updates SHA store after successful commits
- Affects what cold storage returns after deploy

### Apply/Rebuild Semantics

- SHA store: Update after commit
- Hot storage: Unchanged by deploy

### Data Migration Impact

- New IndexedDB store for SHA tracking

### File Rules Impact

- Multiple new files in deploy module
- Keep each file focused and under limits

### Risks/Regressions

- GitHub API rate limits
- Partial commit failures
- Conflict resolution UX

### Verification Commands/Checks

- `npm run build` - TypeScript compilation
- `npm run lint` - Code style
- Manual testing with real GitHub repository

---

## Phase 1: SHA Manager + Change Detection

**Goal**: Implement SHA tracking and change detection.

### Tasks

- [ ] Read `src/deploy/AGENTS.md` before editing
- [ ] Create `src/deploy/shaManager.ts`
  - [ ] Define `ShaStore` interface
  - [ ] Implement IndexedDB-backed SHA storage
  - [ ] Implement `get()`, `set()`, `remove()`, `getAll()`
  - [ ] Implement `save()` for persistence
  - [ ] Define `ShaManager` interface
  - [ ] Implement `fetchRemoteSha()` for single file
  - [ ] Implement `fetchRemoteShas()` for multiple files
  - [ ] Handle 404 (file not found)
  - [ ] Handle rate limits
- [ ] Create `src/deploy/changeDetector.ts`
  - [ ] Define `FileChange` interface
  - [ ] Define `ChangeDetector` interface
  - [ ] Implement `createChangeDetector()` factory
  - [ ] Implement `detectChanges()` method
  - [ ] Compare project.json
  - [ ] Compare all scene files
  - [ ] Generate JSON content for each file

### Files Touched

- `src/deploy/shaManager.ts` (new)
- `src/deploy/changeDetector.ts` (new)

### Verification

- [ ] SHA store persists to IndexedDB
- [ ] SHA store retrieves correctly
- [ ] `fetchRemoteSha()` returns SHA for existing file
- [ ] `fetchRemoteSha()` returns null for missing file
- [ ] `detectChanges()` finds project.json
- [ ] `detectChanges()` finds scene files
- [ ] Change detection includes content
- [ ] TypeScript compiles without errors
- [ ] `npm run build` succeeds

### Stop Point

Pause for review. Test change detection before conflict handling.

---

## Phase 2: Conflict Detection + Resolution UI

**Goal**: Detect and resolve conflicts with remote.

### Tasks

- [ ] Update `src/deploy/changeDetector.ts`
  - [ ] Add `ConflictInfo` interface
  - [ ] Add `ConflictResult` interface
  - [ ] Implement `detectConflicts()` function
  - [ ] Compare localSha with remoteSha
  - [ ] Categorize as safe or conflict
- [ ] Create `src/deploy/conflictResolver.ts`
  - [ ] Define `ConflictResolution` type
  - [ ] Define `ResolvedConflict` interface
  - [ ] Create conflict resolution UI
  - [ ] Show list of conflicting files
  - [ ] Provide overwrite/pull/skip options
  - [ ] Return resolutions array
  - [ ] Style for mobile touch

### Files Touched

- `src/deploy/changeDetector.ts` (modify)
- `src/deploy/conflictResolver.ts` (new)

### Verification

- [ ] Conflicts detected when SHAs differ
- [ ] No conflict when SHAs match
- [ ] No conflict for new files
- [ ] Conflict UI displays correctly
- [ ] Each resolution option works
- [ ] UI is touch-friendly
- [ ] Cancel returns empty/null
- [ ] TypeScript compiles without errors
- [ ] `npm run build` succeeds

### Stop Point

Pause for review. Test conflict detection before commit operations.

---

## Phase 3: Commit Operations

**Goal**: Implement GitHub commit functionality.

### Tasks

- [ ] Create `src/deploy/commit.ts`
  - [ ] Define `CommitConfig` interface
  - [ ] Define `CommitResult` interface
  - [ ] Define `CommitProgress` interface
  - [ ] Define `Committer` interface
  - [ ] Implement `createCommitter()` factory
  - [ ] Implement `commitFile()` method
    - [ ] Base64 encode content
    - [ ] Include SHA for updates
    - [ ] Call GitHub Contents API
    - [ ] Return success/failure with new SHA
  - [ ] Implement `commitFiles()` method
    - [ ] Iterate through files
    - [ ] Call progress callback
    - [ ] Collect results
  - [ ] Generate commit message with timestamp
  - [ ] Handle API errors

### Files Touched

- `src/deploy/commit.ts` (new)

### Verification

- [ ] Single file commits successfully
- [ ] Commit includes correct SHA
- [ ] Base64 encoding works for all content
- [ ] Multi-file commit works
- [ ] Progress callback fires
- [ ] API errors handled gracefully
- [ ] Rate limit errors detected
- [ ] Commit message includes timestamp
- [ ] TypeScript compiles without errors
- [ ] `npm run build` succeeds

### Stop Point

Pause for review. Test commit on real GitHub repository.

---

## Phase 4: Deploy Orchestration + Integration

**Goal**: Wire everything together and integrate into editor.

### Tasks

- [ ] Create `src/deploy/deployUI.ts`
  - [ ] Define `DeployStatus` interface
  - [ ] Define `DeployUI` interface
  - [ ] Implement status display
  - [ ] Show progress during commit
  - [ ] Show success/failure results
  - [ ] Integrate conflict resolver
- [ ] Implement deploy orchestrator (in commit.ts or separate)
  - [ ] Check authentication
  - [ ] Run change detection
  - [ ] Fetch remote SHAs
  - [ ] Detect conflicts
  - [ ] Show conflict resolution if needed
  - [ ] Execute commits
  - [ ] Update SHA store
  - [ ] Show results
- [ ] Update `src/editor/panels/deployPanel.ts`
  - [ ] Add deploy button (enabled when authenticated)
  - [ ] Wire up deploy orchestrator
  - [ ] Show deploy UI
  - [ ] Disable editing during deploy (optional)
- [ ] Update `src/deploy/index.ts`
  - [ ] Export all public APIs
- [ ] Test full deploy flow
  - [ ] Edit → detect → commit → verify on GitHub
- [ ] Update `INDEX.md` with new files
- [ ] Update `context/schema-registry.md`
  - [ ] Add FileChangeSchema
  - [ ] Add ConflictSchema
- [ ] Update `context/repo-map.md`
  - [ ] Document deploy module
- [ ] Update `context/active-track.md` to mark Track 13 complete
- [ ] Append summary to `context/history.md`

### Files Touched

- `src/deploy/deployUI.ts` (new)
- `src/deploy/commit.ts` (modify - add orchestrator)
- `src/editor/panels/deployPanel.ts` (modify)
- `src/deploy/index.ts` (modify)
- `INDEX.md` (modify)
- `context/schema-registry.md` (modify)
- `context/repo-map.md` (modify)
- `context/active-track.md` (modify)
- `context/history.md` (modify)

### Verification

- [ ] Deploy button visible when authenticated
- [ ] Deploy button disabled when not authenticated
- [ ] "Checking for changes" shows during detection
- [ ] "No changes" message when nothing changed
- [ ] Conflicts shown and resolvable
- [ ] "Committing X of Y" progress shows
- [ ] Success message after deploy
- [ ] Changes visible on GitHub
- [ ] SHA store updated after deploy
- [ ] Second deploy has no conflicts (SHAs match)
- [ ] Works on mobile device
- [ ] Full manual test cycle
- [ ] INDEX.md lists new files
- [ ] schema-registry.md updated
- [ ] repo-map.md updated
- [ ] TypeScript compiles without errors
- [ ] `npm run build` succeeds
- [ ] `npm run lint` passes

### Stop Point

Phase complete. Track 13 done. Vertical slice MVP complete.

---

## Risk Checkpoints

### Before Phase 1

- Confirm hot storage API available
- Confirm GitHub API endpoints
- Test API with token from Track 12

### Before Phase 2

- Test SHA fetching works
- Verify change detection accuracy
- Create test conflict scenario

### Before Phase 3

- Test conflict UI on mobile
- Verify resolution options clear
- Prepare test repository

### Before Phase 4

- Test single commit manually
- Check rate limit budget
- Test multi-file commit

### End of Track

- Full manual test cycle:
  1. Edit tiles in editor
  2. Click deploy
  3. Verify "Checking for changes"
  4. Verify file list
  5. Click deploy
  6. Verify progress
  7. Verify success message
  8. Check GitHub - file updated
  9. Edit file on GitHub directly
  10. Edit in editor, deploy
  11. See conflict
  12. Resolve with "Overwrite"
  13. Verify deployed
  14. Check GitHub Pages (may take a minute)

---

## Rollback Plan

If issues arise:
- Phase 1: Remove shaManager, changeDetector
- Phase 2: Remove conflictResolver, revert changeDetector
- Phase 3: Remove commit.ts
- Phase 4: Remove deployUI, revert deployPanel

---

## INDEX.md Updates

After Phase 4, add:

```markdown
- `src/deploy/shaManager.ts`
  - Role: SHA tracking and remote fetching.
  - Lists of truth: ShaStoreSchema

- `src/deploy/changeDetector.ts`
  - Role: Detect changes between hot storage and deployed state.
  - Lists of truth: FileChangeSchema

- `src/deploy/conflictResolver.ts`
  - Role: Conflict detection and resolution UI.
  - Lists of truth: ConflictSchema

- `src/deploy/commit.ts`
  - Role: GitHub commit operations and deploy orchestration.
  - Lists of truth: CommitResultSchema

- `src/deploy/deployUI.ts`
  - Role: Deploy progress and status UI.
  - Lists of truth: DeployStatusSchema
```

---

## Notes

- This completes the vertical slice MVP!
- GitHub Contents API: 1MB file limit
- Rate limit: 5000/hour with token
- Consider showing GitHub Pages rebuild hint
- User may need to wait for Pages rebuild
- Future: Add diff preview before deploy
- Future: Add commit message customization
