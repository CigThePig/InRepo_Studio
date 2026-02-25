# Track 48 — Berry Panel Mutual Exclusion — Plan

## Phase 1 — Wire Mutual Exclusion

**Goal**: Make opening one berry close the other on phone-width viewports.

### Tasks

- [ ] Locate where left and right `BerryShell` instances are created in `init.ts` (or the relevant init file)
- [ ] Confirm `BerryShellConfig.onOpenChange` is exposed as a settable property on the returned `BerryShell` controller, or make it so
- [ ] After both shells are instantiated, add mutual-exclusion `onOpenChange` wiring:
  - Left opens on phone → call `rightBerry.setOpen(false)` synchronously
  - Right opens on phone → call `leftBerry.setOpen(false)` synchronously
- [ ] Phone width threshold: `window.innerWidth <= 600`
- [ ] Confirm tapping overlay still closes only the open berry (existing behaviour)

### Files touched
- `src/editor/panels/berryShell.ts` (if interface change needed)
- `src/editor/init.ts` (or berry init call site)

### Verification
- [ ] Open right berry, then tap left berry button → right slides out, left slides in (phone width)
- [ ] Open left berry, then tap right berry button → left slides out, right slides in (phone width)
- [ ] At wide viewport (≥ 601px), both panels can be open simultaneously
- [ ] Overlay tap closes the active berry, no regression
- [ ] `tsc --noEmit` passes

### Stop point ✋

---

## Phase 2 — Closeout

### Tasks

- [ ] Update `context/active-track.md` — clear active track
- [ ] Append Track 48 entry to `context/history.md`

### Files touched
- `context/active-track.md`
- `context/history.md`

### Stop point ✋
