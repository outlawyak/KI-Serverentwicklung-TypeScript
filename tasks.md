# tasks.md

Task list for the "TypeScript Project". Requirements: `requirements.md`.
Agent rules: `AGENTS.md`.

How to use:
- Work on one task at a time, in order
- A task is done only when its "Done when" is met
- Mark finished tasks with `[x]`, one Conventional Commit per task
- Every commit references its task ID at the end of the subject,
  e.g. `feat: add game routes (T4.2)`
- **[You]** = done by the developer, **[Agent]** = done by the AI agent,
  reviewed by the developer before committing
- Before each commit from phase 1 on: `pnpm run lint`, `pnpm run fmt:check`,
  `pnpm run tsc`
- At the end of each phase, check the relevant items in `docs/review-checklist.md`
- Patterns and known bugs of the lecturer's examples: `docs/style-analysis.md`;
  workflow per entity: `docs/recipe-new-entity.md`

---

## Phase 0: Preparation [You]

The checklist requires everything in this phase as "prepared", i.e. before
the agent starts on the app server.

- [x] **T0.1 Register team**
  Email to the lecturer: name(s), link to the Git repository, IDE, AI agent(s).
  The deadline was Fri, 20 Nov, 12:00.
  Done when: email sent.

- [x] **T0.2 Create Git repository**
  Create an empty GitHub repository and clone it locally.
  Done when: empty repo is cloned.

- [x] **T0.3 Add project documents**
  Add `requirements.md`, `AGENTS.md`, `tasks.md`, `CLAUDE.md` (containing
  `@AGENTS.md`) and the `docs/` folder to the repo, plus a `.gitignore`
  (`node_modules/`, `.env`, `certs/`).
  Done when: committed as `docs: add project requirements and agent instructions (T0.3)`.

- [x] **T0.4 Install Node and pnpm**
  Node 26.13.1 (e.g. via fnm or nvm) and pnpm 12.21.0
  (e.g. `corepack enable && corepack prepare pnpm@12.21.0 --activate`).
  Note: Node 24 was last active on this machine, and pnpm was not on the `PATH`.
  Done when: `node --version` prints 26.13.1 and `pnpm --version` prints 12.21.0.

- [x] **T0.5 Check compatibility**
  In a throwaway folder, create a project with Node 26 and install all
  planned packages: hono, @hono/node-server, zod, @hono/zod-validator,
  drizzle-orm, drizzle-kit, pg, @types/pg, jose, typescript, @types/node,
  @tsconfig/strictest, @tsconfig/node26, @tsconfig/node-ts, oxlint, oxfmt.
  Check that every package can be imported and that a `.mts` file runs with
  `node file.mts` (no build step).
  Done when: everything works, or problems are noted in `AGENTS.md`
  (package, error, workaround or decision).

- [x] **T0.6 Start PostgreSQL container**
  PostgreSQL 18 via `compose.yaml` with a persistent volume. Own Compose
  project name (e.g. `ai-server-ts`) and own host port (e.g. 5433), so it
  does not collide with the Python project.
  Done when: container runs and accepts connections.

- [x] **T0.7 Create database schema**
  SQL script `db/schema.sql` (loaded on first start via
  `docker-entrypoint-initdb.d`), tables as described in `AGENTS.md`:
  - Conventions from `AGENTS.md`: `text` instead of `varchar`,
    `GENERATED ALWAYS AS IDENTITY (START WITH 1000)`, constraints in the DB,
    `ON DELETE CASCADE`
  - `game` with `version` (default 0), `created_at` and `updated_at`
    (default `now()`)
  - `game_details` with a `UNIQUE` FK to `game` (1:1)
  - `review` with an FK to `game` (1:N), index on `game_id`, `created_at`
  - at least one game without reviews (tests the `leftJoin`)
  Insert a few test records in every table.
  Done when: schema and test data exist; the script is committed.

- [x] **T0.8 Connect DB browser**
  Connect a DB browser (e.g. DBeaver or pgAdmin) to the container.
  Done when: tables and test data are visible.

- [x] **T0.9 Set up Keycloak container**
  Keycloak as a service in `compose.yaml` (own port, e.g. 8880). In it:
  1 realm (e.g. `games`), 1 client (e.g. `games-client`, Direct Access
  Grants enabled), 1 **client role** `admin` (as in the lecturer's examples),
  1 user with this role and 1 user without it (for the 403 test).
  Do not copy weak passwords or secrets from the examples.
  Export the realm as JSON and load it on start via `--import-realm`, so the
  setup is reproducible from the repo.
  Done when: a token for the user can be fetched via password grant and the
  role `admin` is in `resource_access.games-client.roles`.

- [x] **T0.10 Generate Drizzle code**
  `pnpm init`, add `drizzle-orm`, `pg` and `drizzle-kit`, create
  `drizzle.config.mts` and run `pnpm drizzle-kit pull`.
  Put the generated files at `src/db/schema.mts` and `src/db/relations.mts`
  and rework them as in `docs/recipe-new-entity.md` §2: definitions before
  their use, suffixes `...Schema`/`...Table`, `.defaultNow()`, named instead
  of namespace imports, import from `./schema.mts`.
  Done when: `schema.mts` and `relations.mts` are committed and
  `pnpm drizzle-kit studio` shows the tables and test data.

---

## Phase 1: Project Setup [Agent]

- [ ] **T1.1 package.json and tsconfig.json**
  Complete `package.json`: `"type": "module"`, `packageManager`
  (`pnpm@12.21.0`), `engines` (`node` 26.13.1), scripts `dev`
  (`node --watch src/main.mts`), `start`, `lint`, `fmt`, `fmt:check`,
  `tsc`, `db:studio`. `tsconfig.json` extends `@tsconfig/strictest`,
  `@tsconfig/node26` and `@tsconfig/node-ts` as described in `AGENTS.md`.
  Commit the lockfile.
  Done when: `pnpm install --frozen-lockfile` and `pnpm run tsc` run without errors.

- [ ] **T1.2 Configure oxlint**
  `.oxlintrc.json` modeled on the lecturer's config: all active categories
  set to `error`, warnings and unused disables fail the run, limits of
  60 lines / 25 statements per function, 4 nested callbacks.
  Rules from `AGENTS.md`: `import/no-default-export`, `func-style`,
  `sort-imports`, `no-var`, `prefer-const`, `prefer-template`,
  `prefer-destructuring`, `type` instead of `interface`, inline type
  imports, no namespace imports. Note unsupported rules in `AGENTS.md`.
  Check with a deliberate violation that the rules really apply
  (plugin question from `docs/style-analysis.md` §7).
  Done when: `pnpm run lint` passes without findings and a test violation is detected.

- [ ] **T1.3 Configure oxfmt**
  `.oxfmtrc.json` (indentation, quotes, line length).
  Done when: `pnpm run fmt:check` passes without findings.

- [ ] **T1.4 Environment variables**
  `.env.example` with all variables (DB, port, TLS paths, Keycloak issuer
  and JWKS URL, client ID). Validate the configuration in
  `src/config/config.mts` with Zod on startup and export it typed; no
  `process.env` outside of it. Node loads `.env` via `--env-file-if-exists`.
  Done when: missing or invalid variables abort the start with a clear message.

---

## Phase 2: Server Skeleton [Agent]

- [ ] **T2.1 Hono over HTTP/2**
  Hono app in `src/app.mts`, server start in `src/main.mts` with
  `@hono/node-server` and `createSecureServer` from `node:http2`
  (TLS 1.3, `allowHTTP1: true`). Paths defined centrally in `src/paths.mts`,
  base `/rest`. Central logger instead of `console.log`. On SIGINT/SIGTERM,
  close the server and the DB connection. Create a local development
  certificate with mkcert (in `certs/`, not committed), paths from the
  configuration. Route `GET /health`.
  Done when: `curl --http2 -i https://localhost:3000/health` responds with
  `HTTP/2 200`.

- [ ] **T2.2 Problem Details (RFC 9457)**
  Central error handling: `app.onError` and `app.notFound` return
  `application/problem+json` with `type`, `title`, `status`, `detail`,
  `instance`; the field is **`status`** (not `statusCode` as in the example).
  Error classes (`NotFoundError`, `VersionOutdatedError`, ...) are mapped in
  `app.onError`; 404, 406 and 500 are Problem Details too, 500 without
  internal details.
  Done when: an unknown route (404), a wrong `Accept` (406) and a provoked
  error (500) return Problem Details.

---

## Phase 3: Database Access [Agent]

- [ ] **T3.1 Drizzle client**
  `src/db/client.mts`: Drizzle with `node-postgres`, schema and relations
  from the generated files. `/health` also checks the DB connection.
  Done when: `/health` reports a reachable database.

- [ ] **T3.2 Data access functions**
  Split into `src/game/service/game-service.mts` (reads, no transaction)
  and `game-write-service.mts` (writes, in one transaction), without any
  HTTP reference. Query builder with `leftJoin` for details (1:1) and
  reviews (1:N), search by title/genre, creating a game, details and
  review, atomic update (see `AGENTS.md` "DB Access"). DTO and error
  classes as in `docs/recipe-new-entity.md` §4–6.
  Done when: the functions return the test data including relationships,
  also for a game without reviews.

---

## Phase 4: REST Interface [Agent]

- [ ] **T4.1 Zod schemas**
  `src/game/validation/game-validation.mts`: `z.strictObject` as the base,
  `omit()` to derive the create and update schemas (main entity only),
  plus details and review (e.g. `rating` 1–5), each `.readonly()`, types
  via `z.infer`. Match optional/required with `NOT NULL` in the DB.
  Invalid JSON → 400, validation errors → 422, both as Problem Details
  including the invalid fields.
  Done when: the schemas are used in the routes.

- [ ] **T4.2 GET with path parameter**
  `src/game/router/game-router.mts`: `GET /rest/games/:id` returns a game
  including details and reviews, 404 as Problem Details if it does not
  exist. Check the ID with an anchored regex: `/rest/games/1abc` → 404.
  Done when: works for existing and missing IDs.

- [ ] **T4.3 GET with query parameters**
  `GET /rest/games?title=&genre=` filters the games (substring match,
  case-insensitive for the title). No pagination (crossed out).
  Done when: the filters return the expected results.

- [ ] **T4.4 Conditional GET**
  `GET /rest/games/:id` sets `ETag: "<version>"`. With a matching
  `If-None-Match`, the server responds with `304 Not Modified` without body.
  Done when: a repeated request with a matching header returns 304.

- [ ] **T4.5 POST for games**
  `src/game/router/game-write-router.mts`: `POST /rest/games` creates a game
  (Zod validation), responds with `201 Created` without body and an absolute
  `Location` pointing to `/rest/games/<id>`, which can be fetched via GET.
  The DB sets `created_at`/`updated_at`, the ID is generated.
  Done when: valid data creates a record, invalid data is rejected,
  `Location` is set.

- [ ] **T4.6 POST for details and reviews**
  `POST /rest/games/:id/details` (1:1): 404 without game, 409 if details
  already exist. `POST /rest/games/:id/reviews` (1:N): 404 without game.
  Both with Zod validation and `201` + `Location`.
  Done when: details can be created only once, reviews any number of
  times, invalid data is rejected.

- [ ] **T4.7 PUT with lost-update protection**
  `PUT /rest/games/:id` with Zod validation. `If-Match` required: missing
  → 428; format checked with a regex anchored at both ends, the version must
  be **equal**, otherwise 412 (both as Problem Details). A single
  `UPDATE ... SET ..., version = version + 1, updated_at = now()
  WHERE id = ? AND version = ? RETURNING ...`; 0 rows → 404 or 412.
  Respond with `204 No Content` and the new `ETag`. Do not copy the
  example's implementation here (it is not atomic, see
  `docs/style-analysis.md` §7).
  Done when: an outdated version, `"999"` and `"0"abc` are rejected with
  412 and overwrite nothing; of two concurrent updates with the same
  version, exactly one succeeds; `updated_at` and `version` change on success.

---

## Phase 5: Security [Agent]

- [ ] **T5.1 JWT verification with Keycloak**
  `src/security/roles-required.mts`: middleware that verifies the bearer
  token with `jose` against the Keycloak JWKS: issuer, audience, RS256,
  expiry. Never log tokens or secrets. Missing or invalid token → 401 as
  Problem Details.
  Done when: a valid Keycloak token is accepted, a tampered or missing one
  is rejected.

- [ ] **T5.2 One protected method with a role**
  `PUT /rest/games/:id` with `rolesRequired('admin')`; role from
  `resource_access[<clientId>].roles` (client role), otherwise 403 as
  Problem Details. All other routes stay public.
  Done when: PUT works only for the admin user; without a token it returns
  401, with a token but without the role 403.

---

## Phase 6: Acceptance [You + Agent]

- [ ] **T6.1 Bruno collection** [Agent]
  Collection in the repo (`extras/bruno/`) with a `local` environment: fetch
  a token (password grant), GET with path and query parameters, conditional
  GET (304), POST for game, details and review (including invalid data),
  PUT with a valid, outdated, missing and `"999"` `If-Match`, PUT without
  token / without role, `/rest/games/1abc`, wrong `Accept`.
  Covered: GET 200/304/404, POST 201/400/404/409/422,
  PUT 204/401/403/404/412/422/428.
  With assertions for status and important headers (`Location`, `ETag`,
  `Content-Type: application/problem+json`).
  Done when: the collection is committed.

- [ ] **T6.2 Run requests with Bruno** [You]
  Run all requests against the local server over HTTP/2 (trust the mkcert
  CA in Bruno or disable certificate verification locally).
  Done when: all requests and assertions are green.

- [ ] **T6.3 Visualize data** [You]
  Check the results of the requests in Drizzle Studio or the DB browser
  (new IDs, `version`, `created_at`, `updated_at`).
  Done when: the changes are visible.

- [ ] **T6.4 README** [Agent]
  Setup (Node, pnpm, Compose, certificate, Keycloak), scripts, endpoints,
  examples for conditional GET and `If-Match`, note on the AI agent used.
  Done when: a fresh clone can be started by following the README.

- [ ] **T6.5 Check against the checklist** [You]
  Go through the checklist in `requirements.md` and `docs/review-checklist.md`
  and tick every item. From a fresh clone: `pnpm install --frozen-lockfile`,
  `pnpm run tsc`, `pnpm run lint`, `pnpm run fmt:check` without findings,
  `curl --http2 -i https://localhost:3000/rest/games/1000` returns
  `HTTP/2 200`. No leftovers from the examples, no secrets in the repo.
  Done when: every item is met.

---

## Out of Scope (crossed out or optional)
- `QUERY` and `DELETE` requests, pagination (crossed out by the lecturer)
- Vitest tests (crossed out; allowed as an acceptance alternative to Bruno)
- `PATCH` in addition to `PUT` (the checklist says "PUT / PATCH", one is enough)
- GitHub Actions CI and Docker images for the app (not on the checklist)

## To Clarify with the Lecturer
- Does the oxlint config of the examples apply 1:1, and is `oxlint-tsgolint`
  expected for type-aware rules? (`docs/style-analysis.md` §7)
- Which TypeScript features from the lectures are expected specifically?
- Is PUT enough, or are both PUT and PATCH expected?
