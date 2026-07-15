# Infrastructure

This folder contains the technical foundation of the project.

## `/database`
Contains the canonical production migration ledger and its rollout documentation.
- **`migrations/`**: Immutable, ordered production changes.
- **`README.md`**: Checksums, protected-data rules and release workflow.

The former hand-maintained `schema.sql` was retired because it contained stale
demo and role-override objects. New environments start from a dated,
schema-only Supabase baseline and then apply pending migrations in order.

## `/scripts`
Contains automated quality assurance tools.
- **`verify_application_flow.ts`**: A script to verify critical user paths.
