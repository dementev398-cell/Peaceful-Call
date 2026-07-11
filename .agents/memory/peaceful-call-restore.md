---
name: Peaceful Call restore
description: Notes from restoring the Peaceful Call app from a full backup zip, and a generic Orval codegen collision fix.
---

## Orval params name collision (TS2308) beyond request bodies

The documented pnpm-workspace/openapi.md pitfall about `<OperationIdPascal>Body` name collisions
also happens for **parameter** types, not just bodies: when an operation has both path and query
parameters, Orval can emit a Zod object in `generated/api.ts` and a separate TS interface in
`generated/types/<opId>Params.ts` under the *same* exported name but with different shapes (e.g.
one has only the path param, the other only the query param). The lib's `export *` barrel then
raises `TS2308: has already exported a member named 'XParams'`.

**Why:** This surfaces even when the OpenAPI spec follows the entity-naming pattern for bodies
correctly — it's specifically about parameters (path+query), which aren't `$ref`'d from
`components/schemas` at all, so the entity-naming fix doesn't apply.

**How to apply:** Don't hand-edit the generated files. In the package's `index.ts` barrel, add an
explicit named re-export for the colliding symbol from whichever generated file is actually used by
the server/client code (grep first) — an explicit named export overrides the ambiguous wildcard
collision. Example: `export { DeleteChatMessageParams } from "./generated/api";` alongside the
existing `export *` from both `./generated/api` and `./generated/types`.

## Restoring a project from a full backup zip

When a user uploads a zip that is a full backup of a prior, more advanced version of the current
(near-empty) workspace: extract to /tmp, diff root configs first (package.json, pnpm-workspace.yaml,
tsconfig.base.json) to confirm no base drift, then per-artifact: read the archive's own
`.replit-artifact/artifact.toml` to check previewPath/id compatibility before overwriting in place,
or `createArtifact` fresh for artifacts not yet registered (e.g. a frontend not yet created) and
overlay the archive's `src`, `public`, `index.html`, merging `package.json` deps rather than
overwriting the whole file (the scaffold's generated deps like `@replit/vite-plugin-*` must be kept).
For `lib/*` generated codegen dirs (api-zod, api-client-react), always `rm -rf` the stub's generated
dir before copying the archive's version — merging old stub-template files with archive files can
create duplicate/stale exports that look like real bugs.

**Why:** The archive was itself built on the same Replit scaffolding system (createArtifact,
setupClerkWhitelabelAuth, setupObjectStorage produce byte-identical templates), so once real content
is overlaid, the standard skills (clerk-auth, object-storage, database, pnpm-workspace/openapi) apply
unchanged — no need to reverse-engineer the archive's auth/storage wiring from scratch, just detect
which provider it auto-selects (e.g. `objectStorage.ts` auto-detects Replit vs S3 via
`REPLIT_DEV_DOMAIN`/`REPL_ID`) and run the matching Replit setup callback.
