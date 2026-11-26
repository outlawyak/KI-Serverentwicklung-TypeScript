# KI-Serverentwicklung-TypeScript

Für das Wahlfach "KI-gestützte Serverentwicklung"

A small REST server prototype for games, built with Hono, Drizzle ORM, PostgreSQL and Keycloak.
Requirements: [requirements.md](requirements.md), task plan: [tasks.md](tasks.md).

> **Status:** phases 0–5 are done: infrastructure, project setup, the server skeleton (HTTP/2 with TLS 1.3,
> Problem Details for every error), the database access, the REST interface (GET with path and query parameters,
> conditional GET, POST, PUT with lost-update protection) and the security (PUT only with the Keycloak client role
> `admin`). The Bruno collection for the acceptance (phase 6) follows.

## Prerequisites

The project works on **macOS and Windows** (and Linux). Every command below is the same on all systems; run them
in Terminal (macOS) or PowerShell (Windows) from the project folder.

| Tool | Version | macOS | Windows |
| --- | --- | --- | --- |
| Node.js | 26.13.1 | `brew install node` or [nodejs.org](https://nodejs.org) | installer from [nodejs.org](https://nodejs.org) |
| pnpm | 12.21.0 | `npm install -g pnpm@12.21.0` | `npm install -g pnpm@12.21.0` |
| Docker | with Compose v2 | [Docker Desktop](https://www.docker.com/products/docker-desktop/) | [Docker Desktop](https://www.docker.com/products/docker-desktop/) (WSL 2 backend) |
| mkcert | any | `brew install mkcert` | `winget install FiloSottile.mkcert` |
| Git | any | included with Xcode tools | [Git for Windows](https://git-scm.com/download/win) |

Node runs the `.mts` files directly (type stripping), there is no build step. pnpm also switches to 12.21.0 by
itself (`devEngines` in `package.json`). Clone into a path **without spaces or umlauts**
(e.g. `~/projects/ai-server-typescript` or `C:\projects\ai-server-typescript`). `.gitattributes` keeps LF line
endings on Windows too.

## Setup

### 1. Install dependencies

```shell
pnpm install --frozen-lockfile
```

The esbuild build scripts are denied on purpose in `pnpm-workspace.yaml`; they are not needed.

### 2. Create `.env`

All configuration comes from `.env`, which is never committed. [.env.example](.env.example) documents every
variable. Create `.env` from it, with random values for the five empty secrets:

```shell
pnpm run setup:env
```

The script ([scripts/setup-env.mts](scripts/setup-env.mts)) never overwrites an existing `.env`. If you delete
`.env` and generate a new one, recreate the containers too (`docker compose down -v`), because they keep the old
passwords.

The server validates `.env` on startup ([src/config/config.mts](src/config/config.mts)) and refuses to start if a
variable is missing or invalid, naming the variable but never its value.

### 3. Start the containers

```shell
docker compose up -d --wait
```

| Service | Address | Notes |
| --- | --- | --- |
| PostgreSQL 18 | `localhost:5433`, database and user `games` | data in the volume `ai-server-ts_postgres-data` |
| Keycloak 26 | <http://localhost:8880> | admin console: `KC_BOOTSTRAP_ADMIN_USERNAME` and `KC_BOOTSTRAP_ADMIN_PASSWORD` |

Both ports are bound to `127.0.0.1` only. The Compose project is named `ai-server-ts`, so it does not collide with
other projects.

**Database:** on the first start (empty volume), PostgreSQL runs [db/schema.sql](db/schema.sql): the tables `game`,
`game_details` (1:1) and `review` (1:N) plus test data. Games have the IDs 1000–1003; game 1003 has neither details
nor reviews. To reload the script, recreate the volume (all data is lost):

```shell
docker compose down -v
docker compose up -d --wait
```

**Keycloak:** whenever the container is created, the realm is imported from
[extras/keycloak/games-realm.json](extras/keycloak/games-realm.json). Passwords and the client secret are not in
the file; Keycloak fills them in from `.env`.

| Realm | Client | Users |
| --- | --- | --- |
| `games` | `games-client` (confidential, direct access grants) | `game-admin` with the client role `admin`, `game-user` without a role |

Fetch an access token with the password grant ([scripts/token.mts](scripts/token.mts)); it is printed to the
terminal, so only use it locally:

```shell
pnpm --silent run token game-admin
pnpm --silent run token game-user
```

`$( ... )` works in zsh, bash and PowerShell, so the token can be passed to curl the same way on every system:
`curl -H "Authorization: Bearer $(pnpm --silent run token game-admin)" ...`

Keycloak has no volume: `docker compose up -d --force-recreate keycloak` resets it to the state in the repo
(e.g. after locking yourself out of the admin console). Admin accounts created in the console are lost then.

### 4. Create the TLS certificate

The server speaks HTTP/2 over TLS 1.3 and needs a certificate for `localhost`. mkcert creates it, signed by a
local CA of your own:

```shell
mkdir certs
mkcert -cert-file certs/cert.pem -key-file certs/key.pem localhost 127.0.0.1 ::1
```

`certs/` is gitignored; the paths are set in `.env` (`TLS_KEY_PATH`, `TLS_CERT_PATH`). The local CA is **not**
added to your system trust store (no `mkcert -install`), so clients get its file instead: `mkcert -CAROOT` prints
the folder, the CA is `rootCA.pem` in it.

### 5. Start the server

```shell
pnpm run dev
```

`dev` restarts on file changes, `start` does not. The server listens on <https://localhost:3000> (HTTP/2, and
HTTP/1.1 for clients without HTTP/2) and stops cleanly with Ctrl+C. Check it:

```shell
curl --http2 -i --cacert "$(mkcert -CAROOT)/rootCA.pem" https://localhost:3000/health
```

Expected: `HTTP/2 200` and `{"status":"UP","database":"UP"}`. If PostgreSQL is not running, `/health` answers
`503` as Problem Details with `"database":"DOWN"`. On Windows, write `curl.exe` instead of `curl` (in PowerShell,
`curl` is an alias for `Invoke-WebRequest`); `curl.exe --version` must list `HTTP2` under Features.

### 6. Look at the data

- **Drizzle Studio:** `pnpm run db:studio`, then open <https://local.drizzle.studio>
- **DB browser** (DBeaver, pgAdmin, ...): host `localhost`, port `5433`, database and user `games`, password
  `POSTGRES_PASSWORD` from `.env`

## Endpoints

Base URL `https://localhost:3000`. Every response is JSON; every error is Problem Details (RFC 9457) with
`Content-Type: application/problem+json`.

| Method | Path | Result |
| --- | --- | --- |
| `GET` | `/health` | `200` with the database status, `503` if the database is not reachable |
| `GET` | `/rest/games?title=&genre=` | `200` with the matching games (possibly `[]`); both filters are optional, case-insensitive substrings, combined with AND; unknown parameters → `422` |
| `POST` | `/rest/games` | `201` without body and `Location: https://localhost:3000/rest/games/<id>`; optional `details` and `reviews` are created in the same transaction; invalid JSON → `400`, invalid fields → `422` with `errors` |
| `POST` | `/rest/games/{id}/details` | `201` without body, `Location` is the game; `404` without game, `409` if the game already has details |
| `POST` | `/rest/games/{id}/reviews` | `201` without body, `Location` is the game (it lists its reviews); `404` without game |
| `PUT` | `/rest/games/{id}` | **role `admin`** (`401` without valid token, `403` without the role); `204` with the new `ETag`; body: `title`, `genre`, `releaseDate` (`null` to clear it); `If-Match: "<version>"` missing → `428`, wrong format or not the current version → `412`; `404`, `400`, `422` as above |
| `GET` | `/rest/games/{id}` | `200` with the game, its details and reviews and `ETag: "<version>"`; `304` without body if `If-None-Match` matches; `404` if it does not exist |

IDs are 1 to 10 digits without a leading zero: `/rest/games/1abc` or `/rest/games/01000` return `404`.

Conditional GET: the `ETag` is the version of the game. Sent back in `If-None-Match`, the server answers `304 Not
Modified` as long as the game is unchanged:

```shell
curl --http2 -i --cacert "$(mkcert -CAROOT)/rootCA.pem" https://localhost:3000/rest/games/1000
curl --http2 -i --cacert "$(mkcert -CAROOT)/rootCA.pem" -H 'If-None-Match: "0"' https://localhost:3000/rest/games/1000
```

`PUT` is the only protected method: it needs an access token of a user with the client role `admin`
(`game-admin`). Without a valid token the answer is `401`, with a token of `game-user` it is `403`.
Lost-update protection: send the version you have read in `If-Match`. Only that exact version is accepted;
afterwards the response carries the new `ETag`:

```shell
curl --http2 -i --cacert "$(mkcert -CAROOT)/rootCA.pem" -X PUT -H "Authorization: Bearer $(pnpm --silent run token game-admin)" -H 'If-Match: "0"' -H 'Content-Type: application/json' -d '{"title":"Celeste","genre":"Platformer","releaseDate":"2018-01-25"}' https://localhost:3000/rest/games/1003
```

In Windows PowerShell 5.1 the inner quotes get lost when passed to `curl.exe`; write `'If-None-Match: \"0\"'` there,
or use PowerShell 7.3 or newer.

## Acceptance with Bruno

The collection [extras/bruno/](extras/bruno/) covers every endpoint: GET `200`/`304`/`404`/`406`, POST
`201`/`400`/`404`/`409`/`422`, PUT `204`/`401`/`403`/`404`/`412`/`422`/`428`, each with tests for status, `Location`,
`ETag` and `Content-Type: application/problem+json`. It creates its own game, so it can run any number of times
without resetting the database.

1. Write the secrets for the token requests to `extras/bruno/.env` (gitignored):

   ```shell
   pnpm run setup:bruno
   ```

2. Start the server (`pnpm run dev`) and open the folder `extras/bruno` in Bruno (4.x), environment `local`.
3. Let Bruno trust the mkcert CA: in the preferences under SSL/TLS, choose the file `rootCA.pem` from the folder
   that `mkcert -CAROOT` prints as custom CA certificate.
4. Run the whole collection (Runner); the folders run in order: 1 Auth, 2 GET, 3 POST, 4 PUT.

Without the app, the Bruno CLI runs the same collection (no project dependency):

```shell
cd extras/bruno
pnpm dlx @usebruno/cli@4.3.0 run --env local --cacert "$(mkcert -CAROOT)/rootCA.pem"
```

## Scripts

| Script | Purpose |
| --- | --- |
| `pnpm run dev` | start the server, restart on file changes |
| `pnpm run start` | start the server |
| `pnpm run tsc` | type check (`tsc --noEmit`) |
| `pnpm run lint` | oxlint, every finding is an error |
| `pnpm run fmt` | format with oxfmt |
| `pnpm run fmt:check` | check the formatting |
| `pnpm run db:studio` | Drizzle Studio |
| `pnpm run setup:env` | create `.env` with random secrets |
| `pnpm run setup:bruno` | write the secrets for the Bruno collection to `extras/bruno/.env` |
| `pnpm --silent run token <user>` | print a Keycloak access token for `game-admin` or `game-user` |

Before every commit, `pnpm run lint`, `pnpm run fmt:check` and `pnpm run tsc` must pass.

## Database Workflow

SQL first, then Drizzle code:

1. Change [db/schema.sql](db/schema.sql) and reload it (see above)
2. `pnpm exec drizzle-kit pull --config drizzle.config.mts` writes the raw code to `drizzle/` (not committed)
3. Rework it into [src/db/schema.mts](src/db/schema.mts) and [src/db/relations.mts](src/db/relations.mts) as
   described in [docs/recipe-new-entity.md](docs/recipe-new-entity.md) §2, plus the project's own steps in
   [AGENTS.md](AGENTS.md) ("Data Model"), e.g. `mode: 'date'` for timestamps

## Project Layout

```text
compose.yaml                 PostgreSQL and Keycloak
db/schema.sql                tables and test data
extras/keycloak/             realm import
extras/bruno/                Bruno collection for the acceptance
src/main.mts                 server start (HTTP/2, TLS 1.3), shutdown
src/app.mts                  Hono app: middleware and routes
src/paths.mts                URL paths (REST base /rest)
src/logger.mts               central logger (pino)
src/config/config.mts        validated configuration from .env
src/db/                      Drizzle schema, relations and client (connection pool)
src/game/router/             REST routes for games
src/game/service/            reading and writing games (no HTTP), DTO, errors
src/game/validation/         Zod schemas for the request bodies
src/security/                JWT verification with jose, client roles (rolesRequired)
scripts/                     setup helpers (.env, token), same on macOS and Windows
certs/                       local TLS certificate (not committed)
drizzle.config.mts           drizzle-kit (pull, Studio)
.oxlintrc.json, .oxfmtrc.json  linter and formatter
docs/                        analysis of the lecturer's examples, recipe, review checklist
```

## AI Agent

Developed incrementally with Claude Code as the AI agent; the instructions for the agent are in
[AGENTS.md](AGENTS.md), one task and one commit at a time as listed in [tasks.md](tasks.md).
