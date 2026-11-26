# KI-Serverentwicklung-TypeScript

Für das Wahlfach "KI-gestützte Serverentwicklung"

A small REST server prototype for games, built with Hono, Drizzle ORM, PostgreSQL and Keycloak.
Requirements: [requirements.md](requirements.md), task plan: [tasks.md](tasks.md).

> **Status:** infrastructure and project setup are done (phases 0 and 1). The HTTP/2 server and the REST
> endpoints follow in phases 2–5; this README is extended with them (T6.4).

## Prerequisites

| Tool | Version | Notes |
| --- | --- | --- |
| Node.js | 26.13.1 | runs `.mts` files directly (type stripping), no build step |
| pnpm | 12.21.0 | `npm install -g pnpm@12.21.0`; pnpm also switches to this version itself (`devEngines`) |
| Docker | with Compose v2 | for PostgreSQL 18 and Keycloak 26 |
| mkcert | any | local TLS certificate for HTTP/2 (needed from T2.1 on) |

Clone into a path **without spaces or umlauts** (e.g. `~/projects/ai-server-typescript`).

## Setup

### 1. Install dependencies

```shell
pnpm install --frozen-lockfile
```

The esbuild build scripts are denied on purpose in `pnpm-workspace.yaml`; they are not needed.

### 2. Create `.env`

All configuration comes from `.env`, which is never committed. [.env.example](.env.example) documents every
variable. Copy it and generate random values for the five empty secrets:

```shell
cp .env.example .env
for v in POSTGRES_PASSWORD KC_BOOTSTRAP_ADMIN_PASSWORD KC_CLIENT_SECRET KC_ADMIN_USER_PASSWORD KC_USER_PASSWORD; do
  sed -i.bak "s/^$v=\$/$v=$(openssl rand -hex 24)/" .env
done && rm .env.bak
```

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
docker compose down -v && docker compose up -d --wait
```

**Keycloak:** whenever the container is created, the realm is imported from
[extras/keycloak/games-realm.json](extras/keycloak/games-realm.json). Passwords and the client secret are not in
the file; Keycloak fills them in from `.env`.

| Realm | Client | Users |
| --- | --- | --- |
| `games` | `games-client` (confidential, direct access grants) | `game-admin` with the client role `admin`, `game-user` without a role |

Fetch a token with the password grant:

```shell
(set -a; . ./.env; set +a
curl -s http://localhost:8880/realms/games/protocol/openid-connect/token \
  -d grant_type=password -d client_id=games-client \
  --data-urlencode "client_secret=$KC_CLIENT_SECRET" \
  -d username=game-admin --data-urlencode "password=$KC_ADMIN_USER_PASSWORD")
```

Keycloak has no volume: `docker compose up -d --force-recreate keycloak` resets it to the state in the repo
(e.g. after locking yourself out of the admin console). Admin accounts created in the console are lost then.

### 4. Look at the data

- **Drizzle Studio:** `pnpm run db:studio`, then open <https://local.drizzle.studio>
- **DB browser** (DBeaver, pgAdmin, ...): host `localhost`, port `5433`, database and user `games`, password
  `POSTGRES_PASSWORD` from `.env`

## Scripts

| Script | Purpose |
| --- | --- |
| `pnpm run dev` | start the server with `--watch` (from T2.1) |
| `pnpm run start` | start the server (from T2.1) |
| `pnpm run tsc` | type check (`tsc --noEmit`) |
| `pnpm run lint` | oxlint, every finding is an error |
| `pnpm run fmt` | format with oxfmt |
| `pnpm run fmt:check` | check the formatting |
| `pnpm run db:studio` | Drizzle Studio |

Before every commit, `pnpm run lint`, `pnpm run fmt:check` and `pnpm run tsc` must pass.

## Database Workflow

SQL first, then Drizzle code:

1. Change [db/schema.sql](db/schema.sql) and reload it (see above)
2. `pnpm exec drizzle-kit pull --config drizzle.config.mts` writes the raw code to `drizzle/` (not committed)
3. Rework it into [src/db/schema.mts](src/db/schema.mts) and [src/db/relations.mts](src/db/relations.mts) as
   described in [docs/recipe-new-entity.md](docs/recipe-new-entity.md) §2

## Project Layout

```text
compose.yaml                 PostgreSQL and Keycloak
db/schema.sql                tables and test data
extras/keycloak/             realm import
src/config/config.mts        validated configuration from .env
src/db/                      Drizzle schema and relations
drizzle.config.mts           drizzle-kit (pull, Studio)
.oxlintrc.json, .oxfmtrc.json  linter and formatter
docs/                        analysis of the lecturer's examples, recipe, review checklist
```

## AI Agent

Developed incrementally with Claude Code as the AI agent; the instructions for the agent are in
[AGENTS.md](AGENTS.md), one task and one commit at a time as listed in [tasks.md](tasks.md).
