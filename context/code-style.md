# Code Style

Purpose:
- Define module boundaries and maintenance rules so code doesn't collapse into a single "god file".

Hard rules:
- New subsystem or domain concept = new module/file.
- Avoid files growing past ~600 lines (soft limit ~450).
- Keep UI code, domain logic, and I/O boundaries separated.

Boundaries:
- `/src/boot` = entry point, mode detection, initialization
- `/src/types` = TypeScript types and schema definitions
- `/src/storage` = IndexedDB and fetch operations
- `/src/editor` = editor-only code (canvas, panels, tools, inspectors)
- `/src/runtime` = game runtime code (loader, spawner, scene management)
- `/src/deploy` = GitHub API integration

Prefer:
- Small, explicit interfaces (functions/events) over hidden cross-module mutation.
- Pure functions for coordinate transforms, validation, data processing.
- Clear naming for units (pixels, tiles, world coords) when helpful.
- TypeScript strict mode for all new code.

Avoid:
- Hidden coupling (one module reaching into another module's internals).
- Large refactors that mix style changes with behavior changes.
- Schema drift (multiple sources of truth for the same config).
- Synchronous IndexedDB access (always async/await).

Mobile-specific:
- All touch handlers must account for touch offset.
- UI components must have minimum 44x44px touch targets.
- Canvas operations should batch to avoid frame drops.
- Memory management matters - unload unused assets.

TypeScript conventions:
- Use `interface` for object shapes, `type` for unions and computed types.
- Export types alongside their related functions.
- Prefer `readonly` for immutable data.
- Use `unknown` over `any` where possible.
