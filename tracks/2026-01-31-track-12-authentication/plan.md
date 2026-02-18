# Track 12: Authentication — Plan

## Overview

This plan breaks Track 12 into phases with verification checklists and stop points.

**Track Type**: Full
**Estimated Phases**: 3

---

## Recon Summary

### Files Likely to Change

- `src/deploy/auth.ts` (new) - Auth manager and validation
- `src/deploy/authUI.ts` (new) - Authentication modal
- `src/deploy/tokenStorage.ts` (new) - Token storage abstraction
- `src/deploy/AGENTS.md` (new) - Deploy module rules
- `src/editor/panels/deployPanel.ts` (new) - Basic deploy panel
- `src/editor/panels/bottomPanel.ts` - Add deploy button

### Key Modules/Functions Involved

- `createTokenStorage()` - Token storage abstraction
- `validateToken()` - GitHub API validation
- `createAuthManager()` - Auth state management
- `createAuthModal()` - Authentication UI

### Invariants to Respect

- Token never logged: Security requirement
- Session storage default: Privacy requirement
- No data loss: Auth failure doesn't affect editing

### Cross-Module Side Effects

- Deploy panel depends on auth state
- Track 13 will use auth for API calls

### Apply/Rebuild Semantics

- Auth state: Live (immediate effect on UI)
- Token storage: On authenticate/logout

### Data Migration Impact

- New IndexedDB store for auth (if using persistent)
- Session storage key added

### File Rules Impact

- New module: src/deploy/
- New files should stay under size limits

### Risks/Regressions

- Token security is critical
- Network errors during validation
- IndexedDB access issues

### Verification Commands/Checks

- `npm run build` - TypeScript compilation
- `npm run lint` - Code style
- Manual testing with real GitHub token

---

## Phase 1: Token Storage + Validation

**Goal**: Implement secure token storage and GitHub API validation.

### Tasks

- [ ] Create `src/deploy/AGENTS.md`
  - [ ] Document token security rules
  - [ ] Document storage rules
  - [ ] Document API usage rules
- [ ] Create `src/deploy/tokenStorage.ts`
  - [ ] Define `TokenStorage` interface
  - [ ] Implement session storage operations
  - [ ] Implement IndexedDB operations for persistent storage
  - [ ] Implement `getToken()`, `setToken()`, `clearToken()`
  - [ ] Implement `hasPersistentToken()`, `getStorageType()`
  - [ ] Handle IndexedDB errors gracefully
- [ ] Create `src/deploy/auth.ts`
  - [ ] Define `AuthState` interface
  - [ ] Define `TokenValidationResult` interface
  - [ ] Implement `validateToken()` function
  - [ ] Handle 401, 403, network errors
  - [ ] Extract username and scopes from response
  - [ ] Add request timeout handling

### Files Touched

- `src/deploy/AGENTS.md` (new)
- `src/deploy/tokenStorage.ts` (new)
- `src/deploy/auth.ts` (new)

### Verification

- [ ] Token storage to session works
- [ ] Token storage to IndexedDB works
- [ ] Token retrieval from both storages works
- [ ] Clear token removes from both
- [ ] `validateToken()` returns valid for good token
- [ ] `validateToken()` returns error for bad token
- [ ] Network timeout handled
- [ ] Rate limit error detected
- [ ] TypeScript compiles without errors
- [ ] `npm run build` succeeds

### Stop Point

Pause for review. Test storage and validation before UI.

---

## Phase 2: Auth Manager + Modal UI

**Goal**: Create auth manager and authentication modal.

### Tasks

- [ ] Update `src/deploy/auth.ts`
  - [ ] Define `AuthManager` interface
  - [ ] Implement `createAuthManager()` factory
  - [ ] Implement `getState()` with cached state
  - [ ] Implement `authenticate()` with storage
  - [ ] Implement `logout()` with cleanup
  - [ ] Implement state change listeners
  - [ ] Validate stored token on `getState()`
- [ ] Create `src/deploy/authUI.ts`
  - [ ] Define `AuthModal` interface
  - [ ] Implement `createAuthModal()` factory
  - [ ] Create modal HTML structure
  - [ ] Style modal for mobile (touch-friendly)
  - [ ] Add token input (password type)
  - [ ] Add persistent checkbox with warning
  - [ ] Add connect/cancel buttons
  - [ ] Wire up validation on connect
  - [ ] Show status messages
  - [ ] Link to GitHub token creation page

### Files Touched

- `src/deploy/auth.ts` (modify)
- `src/deploy/authUI.ts` (new)

### Verification

- [ ] Auth manager tracks state correctly
- [ ] State listeners notified on changes
- [ ] Stored token validated on getState
- [ ] Invalid stored token cleared automatically
- [ ] Auth modal opens and displays correctly
- [ ] Token input accepts paste
- [ ] Persist checkbox shows warning
- [ ] Connect button validates and stores
- [ ] Cancel closes modal
- [ ] Success shows username
- [ ] Error shows clear message
- [ ] Modal works on mobile
- [ ] TypeScript compiles without errors
- [ ] `npm run build` succeeds

### Stop Point

Pause for review. Test auth flow before panel integration.

---

## Phase 3: Deploy Panel + Editor Integration

**Goal**: Integrate auth into editor UI with deploy panel.

### Tasks

- [ ] Create `src/editor/panels/deployPanel.ts`
  - [ ] Define deploy panel structure
  - [ ] Show auth status (connected/not connected)
  - [ ] Show username when authenticated
  - [ ] Add "Connect" button when not authenticated
  - [ ] Add "Disconnect" button when authenticated
  - [ ] Add placeholder deploy button (disabled, for Track 13)
  - [ ] Subscribe to auth state changes
- [ ] Update `src/editor/panels/bottomPanel.ts`
  - [ ] Add deploy button/tab to toolbar
  - [ ] Show deploy panel when selected
  - [ ] Integrate auth manager
- [ ] Update `src/editor/init.ts`
  - [ ] Initialize token storage
  - [ ] Initialize auth manager
  - [ ] Pass auth manager to panels
- [ ] Create `src/deploy/index.ts`
  - [ ] Export public API
- [ ] Add CSS styles for auth modal and deploy panel
- [ ] Update `INDEX.md` with new files
  - [ ] Add all deploy module files
- [ ] Update `context/schema-registry.md`
  - [ ] Add AuthStateSchema
- [ ] Update `context/active-track.md` to mark Track 12 complete
- [ ] Append summary to `context/history.md`

### Files Touched

- `src/editor/panels/deployPanel.ts` (new)
- `src/editor/panels/bottomPanel.ts` (modify)
- `src/editor/init.ts` (modify)
- `src/deploy/index.ts` (new)
- `INDEX.md` (modify)
- `context/schema-registry.md` (modify)
- `context/active-track.md` (modify)
- `context/history.md` (modify)

### Verification

- [ ] Deploy button visible in toolbar
- [ ] Deploy panel shows when selected
- [ ] "Not connected" shows when no token
- [ ] "Connect" button opens auth modal
- [ ] After connect, shows username
- [ ] "Disconnect" button clears token
- [ ] Auth state persists across panel switches
- [ ] Session token: close tab, reopen → not connected
- [ ] Persistent token: close browser, reopen → connected
- [ ] Works on mobile device
- [ ] INDEX.md lists new files
- [ ] schema-registry.md updated
- [ ] Full manual test on mobile device
- [ ] TypeScript compiles without errors
- [ ] `npm run build` succeeds
- [ ] `npm run lint` passes

### Stop Point

Phase complete. Track 12 done.

---

## Risk Checkpoints

### Before Phase 1

- Confirm GitHub API endpoints
- Review token security best practices
- Read OWASP storage guidelines

### Before Phase 2

- Test storage on mobile browsers
- Verify IndexedDB works in Safari
- Test validation with real token

### Before Phase 3

- Test auth modal on mobile
- Verify touch targets are adequate
- Test keyboard behavior

### End of Track

- Full manual test cycle:
  1. Open editor, go to deploy panel
  2. Verify shows "Not connected"
  3. Click "Connect"
  4. Enter valid PAT
  5. Verify shows username
  6. Close tab, reopen → session token gone
  7. Connect again with "Remember" checked
  8. Close browser, reopen → still connected
  9. Click "Disconnect"
  10. Verify back to "Not connected"

---

## Rollback Plan

If issues arise:
- Phase 1: Remove tokenStorage, auth files
- Phase 2: Remove authUI, revert auth changes
- Phase 3: Remove deployPanel, revert bottomPanel and init

---

## INDEX.md Updates

After Phase 3, add:

```markdown
- `src/deploy/AGENTS.md`
  - Role: Deploy module rules (token security, API usage).
  - Lists of truth: none

- `src/deploy/tokenStorage.ts`
  - Role: Secure token storage abstraction.
  - Lists of truth: StorageKeys

- `src/deploy/auth.ts`
  - Role: GitHub authentication management.
  - Lists of truth: AuthStateSchema

- `src/deploy/authUI.ts`
  - Role: Authentication modal UI.
  - Lists of truth: none

- `src/deploy/index.ts`
  - Role: Public exports for deploy module.
  - Lists of truth: none

- `src/editor/panels/deployPanel.ts`
  - Role: Deploy panel with auth status.
  - Lists of truth: none
```

---

## Notes

- Token security is paramount - never log tokens
- Session storage is safer default for public devices
- Classic PAT with `repo` scope required
- Consider Safari IndexedDB quirks
- Test on actual mobile devices
- Track 13 will use this for actual deployment
