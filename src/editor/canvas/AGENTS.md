# /src/editor/canvas — Local AGENTS.md

Purpose:
- Owns canvas rendering and touch/gesture interaction for **World Mode**.

Owns:
- Coordinate transforms (screen ↔ world ↔ tile)
- Pan/zoom gesture handling (pinch, two-finger pan)
- Touch offset / virtual cursor behavior (finger does not hide target)
- Efficient redraw strategies (dirty rects / chunking)

Does NOT own:
- Persistence formats (use `/src/storage` + `/src/types`)
- Deploy/auth
- **Blockly workspace rendering** (use `/src/editor/blockly`). In Blockly Mode, the Blockly workspace replaces the canvas in the center zone.

Local invariants:
- Two-finger pan/zoom must always be available.
- Tool actions must be stable under jitter (debounce/throttle as needed).
- Rendering must keep 60fps on typical mobile devices.

Mode-aware behavior:
- Canvas is only active/visible in **World Mode**. When the editor switches to Blockly Mode, canvas rendering and gesture handling should be suspended (not destroyed) to preserve viewport state.
- Canvas viewport state (pan offset, zoom level) must persist across mode switches so returning from Blockly Mode restores the exact view.

Verification:
- Painting happens at expected tile positions with touch offset.
- Pan/zoom is smooth and does not fight tool gestures.
- Switching to Blockly Mode and back preserves canvas viewport state.
