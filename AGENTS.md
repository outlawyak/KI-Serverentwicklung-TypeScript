# AGENTS.md

Instructions for AI coding agents working in this repository.

## Project
A small REST server prototype in TypeScript for the university course
"AI-Assisted Server Development" (Prof. Dr. Jürgen Zimmermann). The full
requirements are in `requirements.md`; read it before starting any task.
The goal is to meet every item of the lecturer's checklist exactly, no more
and no less.

Tasks are tracked in `tasks.md`. Only work on the task you are asked to do,
and mark it as done (`[x]`) once its "Done when" condition is met.

The developer is responsible for every line of code. Keep changes small,
understandable and easy to review.

### Reference documents in `docs/`
Analysis of the lecturer's example projects `hono` and `drizzle`:
- `docs/style-analysis.md`: style, architecture, DB workflow and the **known
  bugs in the examples** (section 7). Read the relevant section before each task
- `docs/recipe-new-entity.md`: step-by-step pattern from SQL to router,
  already corrected for the weaknesses of the examples
- `docs/review-checklist.md`: checklist to go through at the end of each
  phase and before submission

The links in `style-analysis.md` point to the example projects and do not
resolve in this repo. Adopt the patterns from the examples, not their bugs.
If a document in `docs/` contradicts this file, this file wins.

## Stack (fixed, do not substitute)
- Node 26.13.1, ESM (`"type": "module"`), all source files as `.mts`
- pnpm 12.21.0, `package.json` as the central configuration (`packageManager`
  and `engines` set); `pnpm-lock.yaml` is committed
- TypeScript, type checking with `tsc --noEmit`
- Hono as web framework, served over **HTTP/2** (`@hono/node-server` with
  `createSecureServer` from `node:http2`, TLS 1.3, `allowHTTP1: true` for
  Bruno), TLS with a local development certificate
- Zod for validation
- Drizzle ORM for DB access, `drizzle-kit` for `pull` and Drizzle Studio
- PostgreSQL 18 (Docker container)
- Keycloak (Docker container), JWT verification with `jose`
- oxlint for linting, oxfmt for formatting
- Bruno as API client for acceptance (collection in `extras/bruno/`)

Do not add dependencies without saying why. Do not introduce alternatives
(no Express, no Prisma, no ESLint/Prettier, no npm/yarn).

## TypeScript "State of the Art"
As in the lecturer's examples (E = enforced by configuration):
- `tsconfig.json` extends `@tsconfig/strictest`, `@tsconfig/node26` and
  `@tsconfig/node-ts` (E). Important: `exactOptionalPropertyTypes`,
  `noUncheckedIndexedAccess`, `noUnusedLocals/Parameters`,
  `noImplicitReturns`, `verbatimModuleSyntax`, `erasableSyntaxOnly`
- The server runs directly with Node (native type stripping), without a
  build step and without ts-node/tsx
- ESM only; Node modules with the `node:` prefix; relative imports always
  with the `.mts` extension; import paths with exact casing (Linux!)
- **Arrow functions** instead of `function` declarations (E: `func-style`)
- **`type` instead of `interface`** (E)
- **No `enum`**, no `namespace`, no parameter properties (E:
  `erasableSyntaxOnly`); use union types or `as const` instead
- **Inline type imports**: `import { type Foo, bar } from './x.mts'` (E)
- **No namespace imports** (`import * as`), not even in the generated
  Drizzle code (E)
- Imports sorted according to the oxlint rule `sort-imports`
- `async`/`await`, no `.then()`; top-level `await`
- No `for` loops; use `map`, `filter`, `some`, `find`, `forEach`
- `readonly`, `Readonly<>` and Zod `.readonly()` where sensible
- Explicit checks such as `if (row === undefined)`
- Explicit return types on exported functions
- No `any` and no `@ts-ignore`; `unknown` instead of `any`
- Types from Zod via `z.infer`, from Drizzle via `$inferSelect`/`$inferInsert`

## Good TypeScript Code (required by the lecturer, graded)
- **Named exports**, no default exports (E: `import/no-default-export`)
- **`const`/`let`**, never `var`; `const` wherever possible
- **Template strings** instead of string concatenation with `+`
- **Shorthand properties** (`{ id, title }` instead of `{ id: id, title: title }`)
- **Destructuring** for objects, arrays and parameters
- Code must pass `pnpm run lint` and `pnpm run fmt:check` without findings

## Linter and Formatter
- oxlint config as in the lecturer's examples: all active categories set to
  `error`, warnings and unused disable comments fail the run
- Limits: max. 60 lines and 25 statements per function, max. 4 nested
  callbacks; default values otherwise
- Exceptions only locally and naming the exact rule
  (`// oxlint-disable-next-line <rule>`), never globally
- Open, to be clarified with the lecturer, do not change on your own:
  whether `oxlint-tsgolint` is needed for type-aware rules, and whether the
  `plugins` list replaces the default plugins (see `docs/style-analysis.md` §7)

## Architecture
- One folder per entity with separate modules: `router/`, `service/`,
  `validation/` (Zod) and DTOs; database code under `src/db/`
- **Reading and writing separated**: `game-router.mts` / `game-write-router.mts`,
  likewise `game-service.mts` / `game-write-service.mts`
- **Services know nothing about HTTP** (no Hono imports), **routers do not
  access the DB**
- Handlers inline in the route (better type inference in Hono)
- No DI container; modules as singletons (e.g. an exported `db`)
- Classes only for DTOs and errors (`NotFoundError`, `VersionOutdatedError`, ...);
  errors are mapped to HTTP centrally in `app.onError`
- Central configuration in `src/config/`, loaded from `.env` and validated
  with Zod; no scattered `process.env`
- Paths defined centrally in `paths.mts`, REST base `/rest`

## Language and Comments
- Identifiers and comments in English (`findById`, `GameNewSchema`, `gameTable`)
- TSDoc with `@packageDocumentation` per module and `@param`/`@returns`/`@throws`
  on exported functions
- A link to the official documentation next to unusual code
- No license headers, no teaching comments from the examples, no leftovers
  such as `buch`, Prisma, Nest or foreign `@author` tags

## Data Model
Same domain as the Python project (games). Workflow as in the lecturer's
examples: **SQL first**, then `drizzle-kit pull`, then manual rework (see
`docs/recipe-new-entity.md` §1–2):
- Files as `src/db/schema.mts` and `src/db/relations.mts`
- Move definitions before their use, suffixes `...Schema`/`...Table`
- `.defaultNow()` instead of ``.default(sql`now()`)``, named instead of
  namespace imports
On schema changes, update the SQL, regenerate and repeat the same rework.

SQL conventions: `text` instead of `varchar`,
`GENERATED ALWAYS AS IDENTITY (START WITH 1000)`, constraints in the DB,
foreign keys with `ON DELETE CASCADE`, 1:1 via a `UNIQUE` foreign key,
1:N with an index on the foreign key.

- **game**: id, version, title, genre, release_date, created_at, updated_at
- **game_details** (1:1 with game): id, game_id (unique FK), description,
  developer, publisher
- **review** (1:N): id, game_id (FK, indexed), rating, comment, created_at

`version` starts at 0 and is used for optimistic locking. The DB sets
`created_at` on INSERT; `updated_at` is set on every UPDATE.

### DB Access
- SQL-like query builder with joins (as in the examples), no relational queries
- `findById`: `leftJoin` for 1:1 and 1:N, so a game without details or
  reviews is still found; filter out `null` children
- Reads without a transaction, writes in **one** transaction
- **Atomic UPDATE**: `WHERE id = ? AND version = ?`, in the same statement
  `version + 1` and `updated_at = now()`, `.returning()`; no row → check
  whether the ID exists (404), otherwise 412
- Map unique violations from the DB, do not pre-check with a SELECT
- Do not truncate numbers with `parseInt`; keep decimal values
- Match optional/required in Zod with `NOT NULL` in the DB

## API Requirements
- **GET** with path or query parameters. Check IDs with an anchored regex
  (`/rest/games/1abc` → 404, not `parseInt`). `ETag: "<version>"`; with a
  matching `If-None-Match` → `304 Not Modified` without body
- **POST** with Zod: parse JSON (invalid → 400), `Schema.parse`
  (invalid → 422), respond with `201 Created` without body and with a
  `Location` that can be fetched via GET
- **PUT** with Zod and lost-update protection: `If-Match` required
  (missing → 428), format checked with a regex anchored at both ends
  (`"0"abc` → 412), version must be **equal** (older versions and `"999"`
  → 412). The update schema contains only fields of the main entity.
  Respond with `204` and the new `ETag`
- **Validation**: `z.strictObject` as the base, `omit()` to derive the
  schemas for create and update, `.readonly()`, types via `z.infer`
- **Problem Details (RFC 9457)** for **all** errors, including 404, 406 and 500:
  `Content-Type: application/problem+json`, fields `type`, `title`,
  **`status`** (not `statusCode`), `detail`, `instance`. Centrally in
  `app.onError` and `app.notFound`; 500 without internal details
- **Security**: exactly one protected method, `PUT /rest/games/:id`, via
  the route middleware `rolesRequired('admin')`. Verify the JWT with `jose`
  against the Keycloak JWKS: issuer, audience, RS256, expiry. Role from
  **`resource_access[<clientId>].roles`** (client role, as in the
  lecturer's examples). Missing/invalid token → 401, missing role → 403,
  both as Problem Details

## Security
- No secrets, passwords, private keys or tokens in Git or logs (not even in
  the debug log); configuration via `.env` (in `.gitignore`), `.env.example`
  documents the variables
- Never `NODE_TLS_REJECT_UNAUTHORIZED=0` in code; locally prefer mkcert
- No `console.log` leftovers; log through a central logger
- On shutdown (SIGINT/SIGTERM), close the server **and** the DB connection

## Workflow
- Work in small, incremental steps: one task per prompt, one commit per task
- Never commit without the developer's explicit approval. After finishing a
  task, stop, summarize the changes and propose a commit message; commit
  only once the developer approves
- Use Conventional Commits (`feat:`, `fix:`, `chore:`, `test:`, `docs:`, ...)
- Every commit must be linked to a task in `tasks.md`: end the commit
  subject with the task ID in parentheses, e.g. `feat: add game routes (T4.2)`.
  If a change does not belong to any task, ask before committing
- Before each commit, all of these must pass:
  - `pnpm run lint` (oxlint)
  - `pnpm run fmt:check` (oxfmt --check)
  - `pnpm run tsc` (tsc --noEmit)
- At the end of each phase, check the relevant items in
  `docs/review-checklist.md`
- If a requirement is unclear, ask instead of guessing

## Out of Scope (crossed out by the lecturer)
- `QUERY` and `DELETE` requests
- Pagination
- Vitest unit and integration tests (acceptance is done with Bruno)

The examples contain these parts anyway. Only implement them if the
developer explicitly asks.
