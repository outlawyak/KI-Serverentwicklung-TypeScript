/**
 * Write routes for games under `/rest/games`. The handlers are inline for better
 * type inference in Hono; data access only through the write service.
 * Invalid JSON → 400, invalid fields → 422 (both in `error-handler.mts`).
 * https://hono.dev/docs/api/routing
 *
 * @packageDocumentation
 */

import { GameCreateSchema, GameDetailsCreateSchema, ReviewCreateSchema } from '../validation/game-validation.mts';
import { create, createDetails, createReview } from '../service/game-write-service.mts';
import { gamesPath, idParameter } from '../../paths.mts';
import { Hono } from 'hono';
import { HttpStatus } from '../../http-status.mts';
import { gameIdOf } from './game-id.mts';
import { readJsonBody } from '../../request-body.mts';

/** Absolute URL of a game, for the `Location` header; scheme and host from the request. */
const gameUrl = (requestUrl: string, id: number): string => `${new URL(requestUrl).origin}${gamesPath}/${id}`;

export const gameWriteRouter = new Hono();

// New game, optionally with details and reviews: 201 without body
gameWriteRouter.post('/', async (c) => {
    const game = GameCreateSchema.parse(await readJsonBody(c));
    const id = await create(game);
    c.header('Location', gameUrl(c.req.url, id));
    return c.body(null, HttpStatus.Created);
});

// Details (1:1): 404 without game, 409 if they exist; Location is the game, which includes them
gameWriteRouter.post(`/${idParameter}/details`, async (c) => {
    const id = gameIdOf(c);
    if (id === undefined) {
        return c.notFound();
    }
    const details = GameDetailsCreateSchema.parse(await readJsonBody(c));
    await createDetails(id, details);
    c.header('Location', gameUrl(c.req.url, id));
    return c.body(null, HttpStatus.Created);
});

// Review (1:N): 404 without game; Location is the game, which includes its reviews
gameWriteRouter.post(`/${idParameter}/reviews`, async (c) => {
    const id = gameIdOf(c);
    if (id === undefined) {
        return c.notFound();
    }
    const review = ReviewCreateSchema.parse(await readJsonBody(c));
    await createReview(id, review);
    c.header('Location', gameUrl(c.req.url, id));
    return c.body(null, HttpStatus.Created);
});
