# Track 48 — Berry Panel Mutual Exclusion

## Intent

Make the left and right berry panels mutually exclusive on phone-width viewports. Currently, opening the left berry while the right is open (or vice versa) allows both panels to be simultaneously visible, creating overlapping UI and accidental taps. The right berry already covers the left when open; this track makes the left berry mirror that behaviour.

Authority: `src/editor/panels/berryShell.ts`, `src/editor/panels/leftBerry.ts`, `src/editor/panels/rightBerry.ts`.

## Scope

### In scope

1. **Mutual exclusion on phone (≤ 600px viewport width)** — opening one berry closes the other before the opening animation begins. Both sides must implement this symmetrically: left open → right closes; right open → left closes.

2. **Cross-berry communication** — a lightweight coordination mechanism (event bus call or direct controller reference exchange at `init.ts`) allows each berry's open handler to close its sibling. Prefer the existing `editorEventBus` over tight coupling.

3. **Existing close behaviour preserved** — tapping the overlay behind an open berry still closes it. The close-on-sibling-open pathway is additive.

### Out of scope

- Tablet / large-viewport handling (≥ 601px) — both panels can coexist there; no change needed.
- Blockly mode berry behaviour — Blockly uses its own berry shell; not affected.
- Animating both panels simultaneously.

## Acceptance criteria

- [ ] Opening left berry while right is open: right closes, left opens (phone width)
- [ ] Opening right berry while left is open: left closes, right opens (phone width)
- [ ] Tapping the overlay closes the open berry (existing behaviour preserved)
- [ ] At ≥ 601px viewport width, both panels can be open simultaneously (unchanged)
- [ ] No visual flash or race condition during the swap (right closes before left begins opening)
- [ ] Touch targets ≥ 44px throughout (no regression)
- [ ] `tsc --noEmit` passes
- [ ] `npm run build` succeeds
- [ ] `context/active-track.md` cleared after completion
- [ ] `context/history.md` updated with Track 48 entry

## Risks

- **Race condition on simultaneous tap** — if the user taps the opposing berry button exactly as an animation is in progress, the close and open may interleave. Guard with an `isAnimating` flag or rely on the CSS transition duration (250ms per `berryShell.ts` line ~37). (LOW)
- **Event bus ordering** — if `close` and `open` events emit in the wrong order, the panel state may be inconsistent. Emit `close sibling` synchronously before queuing `open self`. (LOW)
