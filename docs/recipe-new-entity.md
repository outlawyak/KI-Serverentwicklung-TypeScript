# Recipe: New Entity

Derived from the `buch` example and corrected for its known weaknesses. `kurs` is a
placeholder. The patterns have not been executed. Check and commit after each step.

## 1. SQL

Main table with `id`, `version`, `erzeugt`, `aktualisiert` (created, updated); 1:1 table
with a `UNIQUE` foreign key; 1:N table with an index.

```sql
CREATE TABLE IF NOT EXISTS kurs (
    id            integer GENERATED ALWAYS AS IDENTITY(START WITH 1000) PRIMARY KEY,
    version       integer NOT NULL DEFAULT 0,
    kuerzel       text NOT NULL UNIQUE,
    erzeugt       timestamp NOT NULL DEFAULT NOW(),
    aktualisiert  timestamp NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS beschreibung (
    id       integer GENERATED ALWAYS AS IDENTITY(START WITH 1000) PRIMARY KEY,
    text     text NOT NULL,
    kurs_id  integer NOT NULL UNIQUE REFERENCES kurs ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS termin (
    id       integer GENERATED ALWAYS AS IDENTITY(START WITH 1000) PRIMARY KEY,
    raum     text NOT NULL,
    kurs_id  integer NOT NULL REFERENCES kurs ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS termin_kurs_id_idx ON termin(kurs_id);
```

## 2. Drizzle

1. `pnpm exec drizzle-kit pull`
2. Copy `drizzle/schema.ts` and `relations.ts` as `.mts` to `src/db`
3. Move definitions before their use; name them `kursSchema`, `kursTable` etc.
4. `.defaultNow()` instead of ``.default(sql`now()`)``; convert namespace imports to named imports
5. Update `relations.mts` accordingly, format

## 3. Validation

```ts
const KursSchema = z.strictObject({
    id: z.int().gt(0),
    version: z.int().gte(0),
    kuerzel: z.string().min(1),
    beschreibung: BeschreibungSchema,
    termine: z.array(TerminSchema).optional(),
});

export const KursNeuSchema = z.compile(KursSchema.omit({ id: true, version: true })).readonly();
export const KursUpdateSchema = z
    .compile(KursSchema.omit({ id: true, version: true, beschreibung: true, termine: true }))
    .readonly();
export type KursNeuType = z.infer<typeof KursNeuSchema>;
export type KursUpdateType = z.infer<typeof KursUpdateSchema>;
```

Match optional/required and lengths with the DB columns.

## 4. DTOs and Errors

The DTO class takes over `$inferSelect` via destructuring and maps the 1:1 and 1:N data. Do
not accidentally expose internal columns. Errors: `NotFoundError`, `<Field>ExistsError`,
`VersionInvalidError`, `VersionOutdatedError`.

## 5. Read Service

`findById` with `innerJoin` for the mandatory 1:1 relationship and `leftJoin` for the 1:N
relationship. No row: `NotFoundError`. Because of the `leftJoin`, the child record can be
`null`: filter it out.

## 6. Write Service

INSERT of main, 1:1 and 1:N data in **one** transaction, return the ID. UPDATE:

```ts
const [updated] = await db
    .update(kursTable)
    .set({
        ...kurs,
        version: sql`${kursTable.version} + 1`,
        aktualisiert: sql`now()`,
    })
    .where(and(eq(kursTable.id, id), eq(kursTable.version, version)))
    .returning({ version: kursTable.version });

if (updated === undefined) {
    // throws NotFoundError if the ID does not exist
    await findVersionById(id);
    throw new VersionOutdatedError(version);
}
return updated.version;
```

## 7. Router

Reading: `Accept`, ID, service, `If-None-Match`, `ETag`. Writing: `rolesRequired`, ID,
`If-Match` (missing: 428), JSON (invalid: 400), `Schema.parse`, service, headers. Protect at
least one method.

```ts
router.post('/', rolesRequired('admin'), async (c) => {
    let requestBody: unknown;
    try {
        requestBody = await c.req.json();
    } catch {
        return createProblemDetails(c, badRequest, 'Invalid JSON');
    }
    const kursNeu: KursNeuType = KursNeuSchema.parse(requestBody);
    const id = await insert(kursNeu);
    c.header('Location', `${createBaseUrl(c.req)}/${id}`);
    return c.body(null, 201);
});
```

## 8. Wire Up and Demonstrate

Path in `paths.mts`, router in `app.mts`, new errors in `app.onError`. Then requests in Bruno
or similar: GET 200/304/404, POST 201/400/401/403/422, PUT 204/404/412/422/428. Show the
result in the DB browser.
