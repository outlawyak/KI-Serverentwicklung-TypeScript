/**
 * Read routes for games under `/rest/games`. The handlers are inline for better
 * type inference in Hono; data access only through the read service.
 * https://hono.dev/docs/guides/best-practices#don-t-make-controllers-when-possible
 *
 * @packageDocumentation
 */

import { type GameFilter, find, findById } from '../service/game-service.mts';
import { type GameQuery, GameQuerySchema } from '../validation/game-validation.mts';
import { Hono } from 'hono';
import { idParameter } from '../../paths.mts';

// Largest value of the PostgreSQL type `integer`; larger IDs cannot exist
const MAX_ID = 2_147_483_647;

/** An empty query value (`?title=`) means: no filter for this field. */
const toFilter = ({ title, genre }: GameQuery): GameFilter => {
    const filter: { title?: string; genre?: string } = {};
    if (title !== undefined && title !== '') {
        filter.title = title;
    }
    if (genre !== undefined && genre !== '') {
        filter.genre = genre;
    }
    return filter;
};

export const gameRouter = new Hono();

// Search; no match is a valid answer: 200 with an empty array
gameRouter.get('/', async (c) => {
    const query = GameQuerySchema.parse(c.req.query());
    const games = await find(toFilter(query));
    return c.json(games);
});

gameRouter.get(`/${idParameter}`, async (c) => {
    const id = Number(c.req.param('id'));
    if (id > MAX_ID) {
        return c.notFound();
    }
    const game = await findById(id);
    return c.json(game);
});
