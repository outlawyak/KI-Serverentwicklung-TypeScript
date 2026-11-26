/**
 * Drizzle client over a node-postgres connection pool, with the generated
 * schema and relations. Exported as a singleton; services import `db`.
 * https://orm.drizzle.team/docs/get-started-postgresql#node-postgres
 *
 * @packageDocumentation
 */

import { gameDetailsRelations, gameRelations, reviewRelations } from './relations.mts';
import { gameDetailsTable, gameTable, reviewTable } from './schema.mts';
import { Pool } from 'pg';
import { config } from '../config/config.mts';
import { drizzle } from 'drizzle-orm/node-postgres';
import { getLogger } from '../logger.mts';
import { sql } from 'drizzle-orm';

const log = getLogger('db');

// Without a timeout, a query waits forever when the database is down
const CONNECTION_TIMEOUT_MS = 5000;

const pool = new Pool({ ...config.db, connectionTimeoutMillis: CONNECTION_TIMEOUT_MS });

// An idle connection can fail (e.g. database restart); without a listener the process would crash
// https://node-postgres.com/apis/pool#error
pool.on('error', (error) => log.error({ err: error }, 'Idle database connection failed'));

export const db = drizzle({
    client: pool,
    schema: { gameTable, gameDetailsTable, reviewTable, gameRelations, gameDetailsRelations, reviewRelations },
});

/**
 * Checks the connection to the database with `SELECT 1`.
 *
 * @returns `true` if the database answered, otherwise `false` (the cause is logged)
 */
export const isDatabaseReachable = async (): Promise<boolean> => {
    try {
        await db.execute(sql`SELECT 1`);
        return true;
    } catch (error) {
        log.warn({ err: error }, 'Database not reachable');
        return false;
    }
};

/**
 * Closes all connections of the pool; called on shutdown.
 *
 * @returns once every connection is closed
 */
export const closeDatabase = async (): Promise<void> => {
    await pool.end();
};
