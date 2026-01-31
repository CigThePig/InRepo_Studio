# /src/types — Local AGENTS.md

Purpose:
- Owns TypeScript types and JSON schema definitions.
- Protects persistence formats from accidental breaking changes.

Owns:
- Project/Scene/Entity schemas (and versioning)
- Runtime validation and dev fixtures for schemas

Does NOT own:
- UI presentation
- Storage read/write mechanics (use `/src/storage`)
- Deploy/auth logic (use `/src/deploy`)

Local invariants:
- Schema drift is a bug: one canonical definition per concept.
- Any schema change is HIGH RISK: update schema-registry + fixtures + verification.
- Prefer additive changes; if breaking changes are required, plan migrations explicitly.

Verification:
- Validate example project/scene files against schemas.
- Ensure exported/imported JSON round-trips without key loss.
