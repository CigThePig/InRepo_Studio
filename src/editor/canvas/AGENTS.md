# /src/editor/canvas — Local AGENTS.md

Purpose:
- Owns canvas rendering and touch/gesture interaction.

Owns:
- Coordinate transforms (screen ↔ world ↔ tile)
- Pan/zoom gesture handling (pinch, two-finger pan)
- Touch offset / virtual cursor behavior (finger does not hide target)
- Efficient redraw strategies (dirty rects / chunking)

Does NOT own:
- Persistence formats (use `/src/storage` + `/src/types`)
- Deploy/auth

Local invariants:
- Two-finger pan/zoom must always be available.
- Tool actions must be stable under jitter (debounce/throttle as needed).
- Rendering must keep 60fps on typical mobile devices.

Verification:
- Painting happens at expected tile positions with touch offset.
- Pan/zoom is smooth and does not fight tool gestures.
