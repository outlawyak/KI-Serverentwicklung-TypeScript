# Checklist: "TypeScript Project"
(Course: AI-Assisted Server Development, Prof. Dr. Jürgen Zimmermann)

Source: `Checkliste-TypeScript.pdf`. Items **crossed out** by the lecturer are
listed below under "Crossed Out" and are not mandatory.

## Team and Registration
- Team of 1 or 2
- Informal registration by email by Fri, 20 Nov, 12:00 with:
  - name(s)
  - link to the Git repository
  - IDE used
  - AI agent(s) used

## Versions
- Node 26.13.1 or 27 (alpha)
- pnpm 12.21.0 **or** Bun 1.4.4
- PostgreSQL 18 or 19

## Prepared (before development with the AI agent)
- Relational DB with PostgreSQL as a Docker container
  - 1:1 and 1:N relationship
  - DB browser
- Keycloak as a Docker container:
  1 realm with 1 client and at least 1 user and 1 role
- Git repository with **generated Drizzle code** (`schema.mts`, `relations.mts`)
  - "Commit early, commit often" -> incremental development through prompts

## Infrastructure
- `package.json` and pnpm or Bun
- oxlint and oxfmt, each with configuration

## App Server
- TypeScript "state of the art" (features from the two lectures)
- REST interface with **Hono**, including **HTTP/2**
  - **GET**: path *or* query parameters; conditional GET requests (`If-None-Match`)
  - **POST**: validation with **Zod**; `Location` in the response header
  - **PUT / PATCH**: validation with **Zod**; avoidance of lost updates (`If-Match`)
  - **Problem Details (RFC 9457)** for error handling
- DB access with **Drizzle**
  - 1:1 and 1:N relationship
  - generated primary keys
  - no lost updates
  - timestamps for INSERT and UPDATE
- **Security**: 1 user with 1 role for 1 protected method

## Acceptance
- Requests with Bruno / Postman / Thunder Client
  **or**: integration tests with Vitest and Axios for HTTP/2
- Visualization with a DB browser or Drizzle Studio
- oxlint (no errors)
- oxfmt (no differences)

## Good TypeScript Code
- Named exports (no default exports)
- `const` / `let` (no `var`)
- Template strings instead of string concatenation
- Shorthand properties
- Destructuring
- Lint / format

## Crossed Out (crossed out by the lecturer, not mandatory)
- `QUERY` and `DELETE` requests
- Pagination for DB access with Drizzle
- Integration and unit tests with Vitest as part of the app server
  (Vitest remains allowed under "Acceptance" as an *alternative* to Bruno)

## Additional Notes from the Lecturer's Example Projects
Not part of the PDF, but derived from the examples `hono` and `drizzle`
(details in `docs/style-analysis.md`, checklist in `docs/review-checklist.md`):
- Roles are checked as **client roles** (`resource_access[<clientId>].roles`)
- Problem Details with the field `status`, also for 404, 406 and 500
- Drizzle code is reworked manually after `drizzle-kit pull` (`.mts`,
  named imports, `.defaultNow()`, suffixes `Schema`/`Table`)
- Lost-update protection is atomic via `id` **and** `version` in the `WHERE`

## Checklist
- [ ] Team registered by email (name, repo link, IDE, AI agent)
- [ ] Node 26.13.1 and pnpm 12.21.0 (or Bun 1.4.4) set up
- [ ] PostgreSQL container with 1:1 and 1:N relationship
- [ ] DB browser connected
- [ ] Keycloak container: 1 realm, 1 client, >= 1 user, >= 1 role
- [ ] Git repo with generated Drizzle code (`schema.mts`, `relations.mts`)
- [ ] Incremental conventional commits
- [ ] `package.json` with pnpm (or Bun)
- [ ] oxlint and oxfmt configured
- [ ] TypeScript state of the art, good TypeScript code (see above)
- [ ] Hono server over HTTP/2
- [ ] GET with path or query parameters
- [ ] Conditional GET with `If-None-Match` (304)
- [ ] POST with Zod validation and `Location` header
- [ ] PUT/PATCH with Zod validation and `If-Match` (lost-update protection)
- [ ] Errors as Problem Details (RFC 9457)
- [ ] Drizzle: 1:1, 1:N, generated PKs, no lost updates, timestamps
- [ ] 1 protected method, accessible only to 1 user with 1 role
- [ ] Acceptance requests with Bruno (or Vitest + Axios over HTTP/2)
- [ ] Data visible in a DB browser or Drizzle Studio
- [ ] oxlint and oxfmt without findings
