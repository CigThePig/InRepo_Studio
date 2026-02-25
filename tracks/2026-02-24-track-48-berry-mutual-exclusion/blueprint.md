# Track 48 — Berry Panel Mutual Exclusion — Blueprint

## Technical Design

### Approach

`berryShell.ts` exposes a `setOpen(open: boolean)` method and an `onOpenChange` callback. In `init.ts` (or wherever the left and right berry shells are instantiated), we hold references to both controllers and wire each `onOpenChange` callback to close the sibling when opening on phone width.

```ts
// In init.ts, after creating left and right berry shells:
const PHONE_MAX_WIDTH = 600;

leftBerry.onOpenChange = (isOpen) => {
  if (isOpen && window.innerWidth <= PHONE_MAX_WIDTH) {
    rightBerry.setOpen(false);
  }
};

rightBerry.onOpenChange = (isOpen) => {
  if (isOpen && window.innerWidth <= PHONE_MAX_WIDTH) {
    leftBerry.setOpen(false);
  }
};
```

`BerryShellConfig` already has `onOpenChange?: (isOpen: boolean) => void`. No schema changes required.

### Key design decisions

1. **Coordinate via `init.ts` call site** — rather than emitting events on the bus, the coordination is a direct call at the point both shells are in scope. This is simpler and avoids adding new event names to the bus.

2. **Width check at open time** — `window.innerWidth <= PHONE_MAX_WIDTH` is checked at the moment the berry opens, not at initialisation. This handles orientation changes correctly.

3. **`setOpen(false)` is synchronous** — calling `setOpen(false)` on the sibling immediately removes the `--open` class. The CSS `transform` transition (250ms, `cubic-bezier(0.4, 0, 0.2, 1)`) handles the animation. No extra sequencing needed.

### Files touched

#### Modified files

- **`src/editor/panels/berryShell.ts`** — if `onOpenChange` is currently part of `BerryShellConfig` (init-time only), expose it as a settable property on the `BerryShell` controller interface so it can be wired post-creation. If it is already mutable, no structural change needed.
- **`src/editor/init.ts`** (or wherever left/right berry shells are instantiated) — add the mutual-exclusion `onOpenChange` wiring after both shells exist.

### State flow

```
User taps left berry button →
  leftBerry.setOpen(true) →
  onOpenChange(true) fires →
  window.innerWidth <= 600? Yes →
  rightBerry.setOpen(false) →
  right berry slides out →
  left berry slides in
```

### Edge cases

| Scenario | Expected behaviour |
|---|---|
| Both berrys closed, tap left | Left opens normally, right unaffected |
| Left open, tap left toggle | Left closes, right unaffected |
| Left open, tap right button | Right opens, left closes (mutual exclusion) |
| Viewport ≥ 601px, both open | No change; mutual exclusion logic skipped |
| Rapid tap left then right | Right's `setOpen(false)` on left fires synchronously; no overlap |
