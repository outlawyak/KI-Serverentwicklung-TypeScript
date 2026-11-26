/**
 * Limits of the database types, for checks before a query: a value out of
 * range would make PostgreSQL fail with an error instead of finding no row.
 * https://www.postgresql.org/docs/current/datatype-numeric.html#DATATYPE-INT
 *
 * @packageDocumentation
 */

/** Largest value of the PostgreSQL type `integer` (IDs and versions). */
export const MAX_INTEGER = 2_147_483_647;
