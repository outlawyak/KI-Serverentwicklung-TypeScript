/**
 * Read routes for games under `/rest/games`. The handlers are inline for better
 * type inference in Hono; data access only through the read service.
 * https://hono.dev/docs/guides/best-practices#don-t-make-controllers-when-possible
 *
 * @packageDocumentation
 */

import { Hono } from 'hono';
import { findById } from '../service/game-service.mts';
import { idParameter } from '../../paths.mts';

// Largest value of the PostgreSQL type `integer`; larger IDs cannot exist
const MAX_ID = 2_147_483_647;

export const gameRouter = new Hono();

gameRouter.get(`/${idParameter}`, async (c) => {
    const id = Number(c.req.param('id'));
    if (id > MAX_ID) {
        return c.notFound();
    }
    const game = await findById(id);
    return c.json(game);
});
