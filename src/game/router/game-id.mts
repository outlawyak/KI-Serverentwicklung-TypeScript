/**
 * Reading the game ID from the path. The route pattern `idParameter` already
 * rejects anything but 1 to 10 digits; here the range of the database type is checked.
 *
 * @packageDocumentation
 */

import type { Context } from 'hono';

// Largest value of the PostgreSQL type `integer`; larger IDs cannot exist
const MAX_ID = 2_147_483_647;

/**
 * Returns the game ID of a route with `idParameter`.
 *
 * @param c context of the request
 * @returns the ID, or `undefined` if it is larger than any ID in the database (respond with 404)
 */
export const gameIdOf = (c: Context): number | undefined => {
    const id = Number(c.req.param('id'));
    if (id > MAX_ID) {
        return undefined;
    }
    return id;
};
