/**
 * Write routes for games under `/rest/games`. The handlers are inline for better
 * type inference in Hono; data access only through the write service.
 * Invalid JSON → 400, invalid fields → 422 (both in `error-handler.mts`).
 * https://hono.dev/docs/api/routing
 *
 * @packageDocumentation
 */

import {
    GameCreateSchema,
    GameDetailsCreateSchema,
    GameUpdateSchema,
    ReviewCreateSchema,
} from '../validation/game-validation.mts';
import { create, createDetails, createReview, update } from '../service/game-write-service.mts';
import { gamesPath, idParameter } from '../../paths.mts';
import { toETag, versionOfIfMatch } from '../../etag.mts';
import { Hono } from 'hono';
import { HttpStatus } from '../../http-status.mts';
import { gameIdOf } from './game-id.mts';
import { problemResponse } from '../../problem-details.mts';
import { readJsonBody } from '../../request-body.mts';
import { rolesRequired } from '../../security/roles-required.mts';

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

// The only protected method: client role `admin` (401 without valid token, 403 without the role).
// Lost-update protection: If-Match required (428), exactly the current version (otherwise 412).
// The service checks the version in the same UPDATE statement, so concurrent updates cannot both succeed
gameWriteRouter.put(`/${idParameter}`, rolesRequired('admin'), async (c) => {
    const id = gameIdOf(c);
    if (id === undefined) {
        return c.notFound();
    }
    const ifMatch = c.req.header('If-Match');
    if (ifMatch === undefined) {
        return problemResponse(c, {
            status: HttpStatus.PreconditionRequired,
            detail: 'The header If-Match with the current version is required, e.g. If-Match: "0"',
        });
    }
    const version = versionOfIfMatch(ifMatch);
    if (version === undefined) {
        return problemResponse(c, {
            status: HttpStatus.PreconditionFailed,
            detail: 'The header If-Match must contain exactly one version in quotes, e.g. If-Match: "0"',
        });
    }
    const game = GameUpdateSchema.parse(await readJsonBody(c));
    const newVersion = await update(id, version, game);
    c.header('ETag', toETag(newVersion));
    return c.body(null, HttpStatus.NoContent);
});
