/**
 * Central URL paths of the server. Routers and the `Location` header use these
 * instead of string literals.
 *
 * @packageDocumentation
 */

/** Base path of the REST interface. */
export const restPath = '/rest';

/** Path of the health check, outside the REST interface. */
export const healthPath = '/health';
