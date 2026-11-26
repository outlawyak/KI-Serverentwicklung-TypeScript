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

/** Path of the games collection. */
export const gamesPath = `${restPath}/games`;

/**
 * Route parameter for a game ID: 1 to 10 digits without leading zero. Hono matches
 * the regex against the whole path segment, so `1abc` or `01000` do not match (404).
 * https://hono.dev/docs/api/routing#regexp
 */
export const idParameter = ':id{[1-9][0-9]{0,9}}';
