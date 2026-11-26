/**
 * Write routes for games under `/rest/games`. The handlers are inline for better
 * type inference in Hono; data access only through the write service.
 * https://hono.dev/docs/api/routing
 *
 * @packageDocumentation
 */

import { GameCreateSchema } from '../validation/game-validation.mts';
import { Hono } from 'hono';
import { HttpStatus } from '../../http-status.mts';
import { create } from '../service/game-write-service.mts';
import { gamesPath } from '../../paths.mts';
import { readJsonBody } from '../../request-body.mts';

/** Absolute URL of a game, for the `Location` header; scheme and host from the request. */
const gameUrl = (requestUrl: string, id: number): string => `${new URL(requestUrl).origin}${gamesPath}/${id}`;

export const gameWriteRouter = new Hono();

// Invalid JSON → 400, invalid fields → 422 (both in error-handler.mts), otherwise 201 without body
gameWriteRouter.post('/', async (c) => {
    const game = GameCreateSchema.parse(await readJsonBody(c));
    const id = await create(game);
    c.header('Location', gameUrl(c.req.url, id));
    return c.body(null, HttpStatus.Created);
});
