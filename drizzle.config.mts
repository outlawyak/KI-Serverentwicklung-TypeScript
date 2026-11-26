/**
 * Configuration for drizzle-kit (`pull` and Drizzle Studio).
 *
 * The connection data comes from `.env`, the same variables as the postgres
 * container in `compose.yaml`. `drizzle-kit pull` writes the raw generated
 * code to `drizzle/`; the reworked copies live in `src/db/`.
 * https://orm.drizzle.team/docs/drizzle-config-file
 *
 * @packageDocumentation
 */

import { env, loadEnvFile } from 'node:process';
import { defineConfig } from 'drizzle-kit';

// Tooling only, outside the app: the server reads its configuration in src/config/ (T1.4)
// https://nodejs.org/api/process.html#processloadenvfilepath
loadEnvFile('.env');

const { POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB, POSTGRES_PORT } = env;
if (POSTGRES_USER === undefined || POSTGRES_PASSWORD === undefined || POSTGRES_DB === undefined) {
    throw new Error('POSTGRES_USER, POSTGRES_PASSWORD and POSTGRES_DB must be set in .env');
}

// The default export is the only one drizzle-kit reads
// oxlint-disable-next-line import/no-default-export
export default defineConfig({
    dialect: 'postgresql',
    out: './drizzle',
    dbCredentials: {
        host: 'localhost',
        port: Number(POSTGRES_PORT ?? '5433'),
        user: POSTGRES_USER,
        password: POSTGRES_PASSWORD,
        database: POSTGRES_DB,
        ssl: false,
    },
    schemaFilter: ['public'],
});
