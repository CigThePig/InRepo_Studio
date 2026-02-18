# Track 12: Authentication — Spec

## Goal

Manage GitHub Personal Access Token (PAT) for deployment, including token input UI, validation, storage options (session vs persistent), and clear guidance on required scopes.

## User Story

As a mobile game developer using InRepo Studio, I want to securely connect my GitHub account so that I can deploy my game changes to my repository.

## Scope

### In Scope

1. **PAT Input UI**: Modal/panel for entering the token
2. **Token Validation**: Test the token against GitHub API
3. **Session Storage**: Default - token cleared on tab close
4. **Persistent Storage Option**: Optional - token stored in IndexedDB
5. **Forget Token Function**: Clear stored token
6. **Token Scope Guidance**: Instructions for required permissions
7. **Auth Status Display**: Show connected state in UI

### Out of Scope (deferred)

- OAuth flow (GitHub App)
- Multiple account support
- Repository selection UI (assumes current repo)
- Fine-grained access tokens (PAT classic only for v1)
- Automatic token refresh

## Acceptance Criteria

1. **Token Input**
   - [ ] Auth modal accessible from deploy panel
   - [ ] Clear instructions for getting a PAT
   - [ ] Link to GitHub token creation page
   - [ ] Required scopes listed (repo)
   - [ ] Paste-friendly text input

2. **Token Validation**
   - [ ] Token tested against GitHub API on submit
   - [ ] Success: Shows username, stores token
   - [ ] Failure: Clear error message
   - [ ] Network error handling
   - [ ] Rate limit handling

3. **Session Storage (Default)**
   - [ ] Token stored in sessionStorage
   - [ ] Token cleared when tab closes
   - [ ] User informed of session-only nature

4. **Persistent Storage (Optional)**
   - [ ] Checkbox to "Remember token"
   - [ ] Clear warning about shared devices
   - [ ] Token stored in IndexedDB if selected
   - [ ] Token persists across sessions

5. **Forget Token**
   - [ ] "Disconnect" button visible when authenticated
   - [ ] Clears token from both storages
   - [ ] UI updates to unauthenticated state
   - [ ] Confirmation before clearing (optional)

6. **Auth Status Display**
   - [ ] Shows "Not connected" when no token
   - [ ] Shows GitHub username when connected
   - [ ] Connection status visible in deploy panel

## Risks

1. **Token Security**: Token could be exposed or stolen
   - Mitigation: Never log token, sessionStorage by default, clear warnings

2. **Shared Device Risk**: Persistent token on public device
   - Mitigation: Default to session, clear warning for persist option

3. **Token Scope Too Broad**: User may give unnecessary permissions
   - Mitigation: Document minimum required scopes

4. **API Rate Limits**: Validation call counts against limit
   - Mitigation: Single validation call, cache result

5. **Invalid Token UX**: User confused by failed validation
   - Mitigation: Clear error messages with guidance

## Verification

- Manual: Enter valid token, verify accepted
- Manual: Enter invalid token, verify clear error
- Manual: Close tab, reopen, verify session token gone
- Manual: Enable persist, close browser, verify token remembered
- Manual: Forget token, verify cleared
- Automated: Token validation logic tests
- Automated: Storage abstraction tests

## Dependencies

- Track 6 (Panels): Deploy panel location
- None directly - this enables Track 13

## Notes

- Classic PAT requires `repo` scope for full access
- Fine-grained tokens more complex; defer to future
- Token validation uses `/user` endpoint (low rate limit cost)
- Consider showing token partially masked after entry
- Remember token preference separately from token itself
