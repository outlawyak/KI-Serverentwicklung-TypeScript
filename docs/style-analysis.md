# Style Analysis of the Examples `hono` and `drizzle`

As of 25 Nov 2026. Basis: 54 `.mts` files (5,186 lines) in `hono/src`, tests, configuration,
`drizzle/src` and the checklist. The focus is on the required scope. GraphQL, monitoring,
load tests and CI were only skimmed.

**Method:** static, nothing installed. `tsc`, oxlint, oxfmt, tests and the server were **not**
run. Statements marked "probably" or "check" need a real run.

**Rating:** **E** enforced (config) · **C** consistent · **T** tendency · **S** single case

## 1. The Essentials

1. Small modules made of arrow functions, strictly separated into router, service, validation and DB.
2. Modern ESM TypeScript: named exports, `const`, destructuring, template strings, `type`.
   This matches page 2 of the checklist directly.
3. HTTP semantics are central: ETags, 304, 412, 428, `Location`, Problem Details.
4. Tools decide on style; exceptions are suppressed locally and per rule.
5. The examples are teaching material and contain bugs (section 7). Adopt the patterns, not the bugs.

## 2. Requirements and Examples

| Checklist | Model | Assessment |
| --- | --- | --- |
| HTTP/2 | [index.mts:71-93](../hono/src/index.mts#L71-L93) | `createSecureServer`, TLS 1.3; `allowHTTP1` for Bruno |
| GET, `If-None-Match` | [buch-router.mts:41-81](../hono/src/buch/router/buch-router.mts#L41-L81) | good; improve ID check and 304 ETag |
| POST, Zod, `Location` | [buch-write-router.mts:47-65](../hono/src/buch/router/buch-write-router.mts#L47-L65) | good pattern |
| PUT, `If-Match` | [buch-write-router.mts:70-104](../hono/src/buch/router/buch-write-router.mts#L70-L104) | HTTP good, DB check not atomic |
| Problem Details | [problem-details.mts](../hono/src/problem-details.mts) | not fully RFC-compliant |
| 1:1 and 1:N | [schema.mts](../hono/src/db/schema.mts) | book–title, book–image |
| Primary keys, timestamps | [schema.mts:38-59](../hono/src/db/schema.mts#L38-L59) | identity, `defaultNow()` |
| Keycloak role | [roles-required.mts](../hono/src/security/roles-required.mts) | JWT verification with jose, client roles |
| QUERY, DELETE, pagination, tests | present | **crossed out in the checklist** |

Despite the crossed-out testing item, the acceptance section lists "requests with Bruno / Postman /
Thunder Client **or** integration tests with Vitest and Axios for HTTP/2". So evidence is
required, not a test suite.

## 3. Programming Style

| Feature | Rating | Finding |
| --- | --- | --- |
| Named exports | E, C | `import/no-default-export`; 0 default exports in `src` |
| `const`/`let` | C | about 479 `const`, 17 `let`, 0 `var` declarations |
| Arrow functions | E, C | `func-style`; only exception [page.mts:30](../hono/src/buch/router/page.mts#L30) |
| `async`/`await` | C | 0 calls of `.then()`; top-level `await` |
| `type` instead of `interface` | E, C | 0 interfaces |
| No `enum` | E, C | `erasableSyntaxOnly`; PostgreSQL enum and union instead |
| Inline type imports | E, C | one exception in a unit test |
| No namespace imports | E, C | generated Drizzle code is converted too |
| `.mts` in imports | C | exception: `.mjs` in [setup.global.mts](../hono/test/integration/setup.global.mts#L18) |
| Import sorting | C | 68 of 69 files follow the rule; `sort-imports` belongs to the active style category |
| Loops | C | 0 `for`; `map`, `filter`, `some`, `forEach` |
| Immutability | T | `readonly`, `Readonly<>`, Zod `.readonly()`; DTO fields are not `readonly` |
| Explicit `undefined` check | C | `if (row === undefined)` |
| Return types | T | explicit on read functions, often inferred on write functions |
| `any` | T | allowed, mostly edge cases; `unknown` is the better pattern |

**tsconfig (E):** `strictest`, `node26` and `node-ts`. Important are `exactOptionalPropertyTypes`,
`noUncheckedIndexedAccess`, `noUnusedLocals/Parameters`, `noImplicitReturns` and `verbatimModuleSyntax`.

**Import order**, clearly visible in [buch-service.mts:22-33](../hono/src/buch/service/buch-service.mts#L22-L33):
multiple bindings before a single one; within each group by the first local name, uppercase first.
That is why own and third-party modules are mixed.

### Language and Comments

- German domain terms, English technical terms (**C**): `findById`, `BuchNeuSchema`, `titelTable`.
- TSDoc with umlauts, `//` comments and runtime texts almost always with `ae/oe/ue` (**T**).
  Only runtime exception in the code: `'Ungültige ISBN-Nummer'`.
- Module docs with `@packageDocumentation`, functions with `@param/@returns/@throws` (**T**).
- GPL header in all `.mts` files under `src` and `test` (**C**), not required for your project.
- Letter-spaced section titles such as `// N e u a n l e g e n` (**T**).
- Links to the official documentation next to unusual code (**T**).
- Explanations of promises, comparisons with C# and lists of alternatives are **teaching material**.

### Linter

All six active categories are set to `error`; warnings and unused disables fail the run.
Explicit: 60 lines and 25 statements per function, callback nesting of 4.
`max-lines`, `max-params`, `max-depth` and `import/max-dependencies` use default values.
Exceptions in the example always name specific rules. The config of both projects is identical.

## 4. Architecture

| Topic | Evidence | Rating |
| --- | --- | --- |
| Reading/writing separated | `buch-router` / `buch-write-router`, services likewise | C |
| Service without HTTP | no Hono or router imports in services | C |
| Handlers inline | rationale in [buch-router.mts:39](../hono/src/buch/router/buch-router.mts#L39) | C |
| No DI, modules as singletons | exported `db`, `getLogger` | C |
| Classes only for data and errors | DTOs, errors | C |
| Global error mapping | [app.mts:118-151](../hono/src/app.mts#L118-L151) | C |
| Central config | TOML + `.env` + Zod in [config.mts](../hono/src/config/config.mts) | C |

`VORGEHENSWEISE.md` mentions a "container for manual DI"; the code has none.
The newer code is the better model.

**Validation:** `z.strictObject` as the base, `omit()` for create/update, `z.compile(...)`,
`.readonly()` and types via `z.infer` ([buch-validation.mts](../hono/src/buch/validation/buch-validation.mts)).
Update contains only fields of the main entity, no relationships.

**Security:** `rolesRequired('admin')` as route middleware; issuer, audience, RS256 and expiry are
checked. Roles come from `resource_access[clientId].roles`, i.e. **client roles**, not realm roles.

## 5. Database

- SQL first, then `drizzle-kit pull`, then manual adjustment. The necessary steps are in
  [ReadMe.drizzle.md](../hono/ReadMe.drizzle.md): `.mts`, order, `defaultNow()`, suffixes
  `Schema`/`Table`, named imports.
- SQL: `text` instead of `varchar`, `GENERATED ALWAYS AS IDENTITY (START WITH 1000)`, constraints in
  the DB, foreign keys with `ON DELETE CASCADE`.
- 1:1 via `UNIQUE` on the foreign key; 1:N without `UNIQUE`, but with an index.
- Queries use the SQL-like query builder with joins; relational queries via `relations` do not
  appear in the examples.
- `version` starts at 0. Reads without a transaction, writes with one.
- The only domain schema difference between the examples: `datum` is a `Date` in `hono`
  (`mode: 'date'`) and a string in `drizzle`.

## 6. Tests and Bruno (optional)

Titles and data in German; structure `// given`, `// when`, `// then`; one file per method; `test`
instead of `it`. Unit tests mock the Drizzle chain with `vi.hoisted`; integration tests use Axios
with `httpVersion: 2`. Bruno requests contain assertions and cover positive and error cases.
That makes [extras/bruno](../hono/extras/bruno/buch) a good model for acceptance.

## 7. Issues: Do Not Copy Blindly

### Relevant for Acceptance

| Location | Problem | Better |
| --- | --- | --- |
| [buch-write-service.mts:173-228](../hono/src/buch/service/buch-write-service.mts#L173-L228) | The version is read before the transaction, the UPDATE filters by ID only. Two concurrent requests can both succeed: **lost update** | `id` **and** `version` in the WHERE |
| same file, line 182 | Only lower versions are rejected; `"999"` is accepted | require equality |
| same file, line 50 | Regex without `$`: `"1"abc` matches | anchor at both ends |
| [problem-details.mts:26-30](../hono/src/problem-details.mts#L26-L30) | `statusCode`; RFC 9457 defines `status` | use `status` |
| [app.mts:118-150](../hono/src/app.mts#L118-L150) | 404 and 500 are not Problem Details, neither is 406 | map them uniformly |
| [buch-dto.mts:59-60](../hono/src/buch/service/buch-dto.mts#L59-L60) | `parseInt`: 99.99 becomes 99, discount 0.033 becomes 0 | `Number()` or decimal string |
| [buch-validation.mts:41](../hono/src/buch/validation/buch-validation.mts#L41) and [buch-write-service.mts:65](../hono/src/buch/service/buch-write-service.mts#L65) | `rabatt` (discount) optional, DB requires a value; missing becomes the text `"undefined"` | align schema and DB |
| [buch-service.mts:88-116](../hono/src/buch/service/buch-service.mts#L88-L116) | `innerJoin`: a book without images counts as not found. The function is not called in `src`, so GET does not show the 1:N relationship | `leftJoin` if 1:N is to be shown |
| [buch-write-service.mts:73-88](../hono/src/buch/service/buch-write-service.mts#L73-L88) | Pre-check for ISBN is not atomic; missing on update | map the DB's unique error |
| [buch-router.mts:56](../hono/src/buch/router/buch-router.mts#L56) | `parseInt('1abc')` returns 1 | regex like `idPattern` |

### Security and Robustness

- Client secret and password end up in the debug log
  ([keycloak-service.mts:91](../hono/src/security/keycloak-service.mts#L91)); tokens in several places.
- Weak passwords and private keys are in the example. Do not copy them into your repository.
- `NODE_TLS_REJECT_UNAUTHORIZED=0` disables certificate verification; local use at most.
- The PostgreSQL server certificate is set as client `cert` instead of `ca`
  ([db.mts:50-54](../hono/src/config/db.mts#L50-L54)).
- [cors-options.mts](../hono/src/config/cors-options.mts) uses `allowedHeaders`/`exposedHeaders`.
  Hono expects `allowHeaders`/`exposeHeaders`; the entries probably have no effect (check with Hono 5).
  Also `If-Not-Match` instead of `If-None-Match`.
- The SIGINT handler closes the DB but not the server; the process probably stays alive.
- `findAll` reports the page size as the total count (only relevant with pagination).
- Debug leftover `console.log('!!!schlagwoerter', ...)` in [build-where.mts:152](../hono/src/buch/service/build-where.mts#L152).

### Legacy and Contradictions

- Prisma in logger names, comments, `.env`, overrides and `VORGEHENSWEISE.md`, although Drizzle is used.
  Nest leftovers in further comments.
- **Check the linter:** according to a comment, `oxlint-tsgolint` is needed for type-aware rules, but it is missing.
- **Check the linter:** according to the oxlint documentation, `plugins: ['import', 'node', 'promise']`
  replaces the default plugins. The configured `typescript/*` and `unicorn/*` rules would then have no
  effect. This is supported by `process.env` and `@ts-ignore` appearing despite strict rules; only a run
  can prove it. Do not change on your own, clarify with the professor.
- `oxfmt` ignores `src/config/resources/...`; this folder no longer exists.
- PostgreSQL ReadMe (`19.0`, `/19/data`) and Compose (`19rc1-trixie`, `/19/docker`) contradict each
  other; Keycloak 26.8.1 vs. 26.8.2. The Compose file is the executable source.
- No lockfile present; your project should commit one.

## 8. Linux and macOS

- `package.json`: `k6` uses Windows backslashes. Calls in example comments too.
- macOS is usually not case-sensitive, Linux is: write import paths exactly.
- Images must be available for amd64 and arm64 (check before choosing). `dhi.io` images may
  require a login.
- **Path:** The professor warns against spaces in the project path (`ReadMe.drizzle.md`). The
  folder analyzed here contains spaces and umlauts. Better create the real project under e.g.
  `~/projekte/<name>`.
- On the analyzing machine, Node 24.22.3 was active; 26.13.1 is required. pnpm and Bun were not on
  the `PATH`.

## 9. Open Points for the Team

1. According to the checklist, the registration deadline was 20 Nov, 12:00. Is registration done?
2. Decide on the domain and relationships (1:1 and 1:N).
3. Does your lecture script name further TypeScript features? "Features from the two lectures"
   cannot be fully derived from the examples.
4. Clarify lint plugins and `oxlint-tsgolint`: which configuration applies at acceptance?
5. PUT and PATCH, or just one? The notation "PUT- / PATCH" suggests one.
