# Review Checklist Before Submission

## Required by the Checklist

- [ ] Team registered; repository, IDE and AI agents stated
- [ ] Node 26.13.1 or 27 alpha; pnpm 12.21.0 or Bun 1.4.4
- [ ] PostgreSQL 18/19 and Keycloak run as containers
- [ ] Keycloak: 1 realm, 1 client, at least 1 user and 1 role
- [ ] `schema.mts` and `relations.mts` derived from Drizzle; many small commits
- [ ] Response demonstrably over HTTP/2
- [ ] GET with path or query parameter; `If-None-Match` returns 304
- [ ] POST: Zod, 201, `Location` can be fetched
- [ ] PUT or PATCH: Zod, `If-Match`, new `ETag`
- [ ] 1:1 and 1:N visible, primary keys generated
- [ ] `created_at` and `updated_at` are set; `updated_at` changes on UPDATE
- [ ] At least one method protected by a role; 401 and 403 checked
- [ ] Problem Details also for 404, 406 and 500, with `status`
- [ ] Demonstrable requests **or** integration tests over HTTP/2
- [ ] DB browser or Drizzle Studio ready
- [ ] oxlint and oxfmt without errors
- [ ] Nothing crossed out added without being asked

## Typical Mistakes

- [ ] Two concurrent updates with the same version: exactly one succeeds, the other returns 412
- [ ] `If-Match: "999"` and `"0"abc` are rejected; a missing header returns 428
- [ ] `/rest/1abc` returns 404
- [ ] Decimal values are preserved
- [ ] Optional Zod fields match `NOT NULL` columns
- [ ] An object without 1:N children is found
- [ ] A duplicate unique value returns 422, also on update
- [ ] No secrets in Git or logs

## Code Quality

- [ ] Named exports, `const`/`let`, template strings, shorthand, destructuring
- [ ] No HTTP types in the service, no DB access in the router
- [ ] No unjustified `any`, `@ts-ignore` or global lint disable
- [ ] No leftovers from the examples: `buch`, Prisma, Nest, foreign `@author`, debug output
- [ ] Adopted GPL code is marked
- [ ] The team can explain every file

## Commands (Linux and macOS)

```shell
pnpm install --frozen-lockfile
pnpm run tsc
pnpm run lint
pnpm run fmt:check
curl -k --http2 -i https://localhost:3000/rest/1
```

- [ ] Checked on both operating systems from a fresh clone
