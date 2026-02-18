# Track 13: Deploy Flow — Spec

## Goal

Implement the ability to commit changes from hot storage (IndexedDB) to GitHub, completing the vertical slice. This includes change detection, conflict detection, and the commit flow.

## User Story

As a mobile game developer using InRepo Studio, I want to deploy my edited maps to my GitHub repository so that my game updates are published to GitHub Pages.

## Scope

### In Scope

1. **Change Detection**: Compare hot storage with cold (deployed) state
2. **SHA Fetching**: Get current file SHAs from repository
3. **Conflict Detection**: Identify when remote has changed
4. **Conflict Resolution UI**: Choose overwrite, pull, or skip
5. **Single File Commit**: Commit one file via GitHub API
6. **Multi-file Commit**: Commit multiple files in batches
7. **Deploy Progress/Status**: Show progress and results

### Out of Scope (deferred)

- Branch selection (commits to default branch)
- Pull request creation
- Revert/rollback support
- Diff visualization
- Commit history view
- Automatic conflict resolution

## Acceptance Criteria

1. **Change Detection**
   - [ ] Detects modified project.json
   - [ ] Detects modified scene files
   - [ ] Shows list of changed files
   - [ ] Ignores unchanged files

2. **SHA Management**
   - [ ] Fetches current SHA for each file
   - [ ] Stores SHAs locally for comparison
   - [ ] Updates SHAs after successful commit

3. **Conflict Detection**
   - [ ] Compares local SHA with remote SHA
   - [ ] Identifies files changed remotely
   - [ ] Shows conflict indicator on files

4. **Conflict Resolution**
   - [ ] "Overwrite" option: push local, ignore remote
   - [ ] "Pull" option: update local with remote
   - [ ] "Skip" option: don't commit this file
   - [ ] Resolution required before commit

5. **Commit Flow**
   - [ ] "Deploy" button triggers commit
   - [ ] Files committed to repository
   - [ ] Commit message generated automatically
   - [ ] Success/failure feedback

6. **Progress UI**
   - [ ] Shows "Checking for changes..."
   - [ ] Shows "Committing file X of Y..."
   - [ ] Shows success message with file count
   - [ ] Shows error message on failure

## Risks

1. **GitHub API Rate Limits**: Many files = many API calls
   - Mitigation: Batch content API, cache SHAs, check limits

2. **Partial Commit Failure**: Some files fail, others succeed
   - Mitigation: Track per-file status, allow retry

3. **Conflict Resolution Confusion**: User may not understand options
   - Mitigation: Clear explanations, default to safe option

4. **Large File Handling**: Files > 1MB need different API
   - Mitigation: Warn user, defer blob API to later

5. **Concurrent Edits**: User edits during deploy
   - Mitigation: Disable editing during deploy, or use snapshot

## Verification

- Manual: Edit tiles, deploy, verify changes on GitHub
- Manual: Create conflict (edit on GitHub), detect conflict
- Manual: Test each resolution option
- Manual: Test multi-file commit
- Automated: Change detection logic tests
- Automated: SHA comparison tests

## Dependencies

- Track 2 (Hot Storage): Current project/scene data
- Track 3 (Cold Storage): Fetch for comparison/pull
- Track 12 (Authentication): GitHub token

## Notes

- GitHub Contents API for single file commits
- Consider batching strategy for multiple files
- SHA tracking critical for conflict detection
- Auto-generate commit message with timestamp
- GitHub Pages rebuild happens after commit (not our control)
