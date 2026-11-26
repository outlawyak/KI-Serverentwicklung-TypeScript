/**
 * Reading games with the SQL-like query builder, without a transaction.
 * `leftJoin` for details (1:1) and reviews (1:N), so a game without details
 * or reviews is found too. Knows nothing about HTTP.
 * https://orm.drizzle.team/docs/joins#left-join
 *
 * @packageDocumentation
 */

import { type AnyColumn, type SQL, and, eq, ilike } from 'drizzle-orm';
import { gameDetailsTable, gameTable, reviewTable } from '../../db/schema.mts';
import { GameDto } from './game-dto.mts';
import { NotFoundError } from './errors.mts';
import { db } from '../../db/client.mts';

/** Search criteria; every given criterion must match (AND). */
export type GameFilter = Readonly<{
    /** Part of the title, case-insensitive */
    title?: string;
    /** Part of the genre, case-insensitive */
    genre?: string;
}>;

// One row per review (or one row without review) of every matching game
// The query builder type is long and only inferred correctly by Drizzle
// oxlint-disable-next-line typescript/explicit-function-return-type
const selectGames = () =>
    db
        .select()
        .from(gameTable)
        .leftJoin(gameDetailsTable, eq(gameDetailsTable.gameId, gameTable.id))
        .leftJoin(reviewTable, eq(reviewTable.gameId, gameTable.id));

type GameRows = Awaited<ReturnType<typeof selectGames>>;
type GameGroup = {
    readonly game: GameRows[number]['game'];
    readonly details: GameRows[number]['game_details'];
    readonly reviews: NonNullable<GameRows[number]['review']>[];
};

/** Groups the joined rows by game; a review is `null` when the game has none. */
const toGameDtos = (rows: GameRows): GameDto[] => {
    const groups = new Map<number, GameGroup>();
    rows.forEach(({ game, game_details: details, review }) => {
        const group = groups.get(game.id) ?? { game, details, reviews: [] };
        groups.set(game.id, group);
        if (review !== null) {
            group.reviews.push(review);
        }
    });
    return [...groups.values()].map(({ game, details, reviews }) => new GameDto(game, details, reviews));
};

// `\`, `%` and `_` are wildcards in LIKE; escaped, the input is matched literally
// https://www.postgresql.org/docs/current/functions-matching.html#FUNCTIONS-LIKE
const containsIgnoringCase = (column: AnyColumn, value: string | undefined): SQL | undefined => {
    if (value === undefined) {
        return undefined;
    }
    return ilike(column, `%${value.replaceAll(/[\\%_]/gu, String.raw`\$&`)}%`);
};

/**
 * Finds a game by its ID, including details and reviews.
 *
 * @param id ID of the game
 * @returns the game; `details` is `null` and `reviews` is empty if there are none
 * @throws NotFoundError if there is no game with this ID
 */
export const findById = async (id: number): Promise<GameDto> => {
    const rows = await selectGames().where(eq(gameTable.id, id)).orderBy(reviewTable.id);
    const [game] = toGameDtos(rows);
    if (game === undefined) {
        throw new NotFoundError(id);
    }
    return game;
};

/**
 * Finds the games matching the filter, including details and reviews.
 *
 * @param filter parts of title and genre; without criteria, all games are returned
 * @returns the matching games ordered by ID, possibly empty
 */
export const find = async ({ title, genre }: GameFilter = {}): Promise<readonly GameDto[]> => {
    const rows = await selectGames()
        .where(and(containsIgnoringCase(gameTable.title, title), containsIgnoringCase(gameTable.genre, genre)))
        .orderBy(gameTable.id, reviewTable.id);
    return toGameDtos(rows);
};

/**
 * Reads only the current version of a game (for `If-Match` and failed updates).
 *
 * @param id ID of the game
 * @returns the current version
 * @throws NotFoundError if there is no game with this ID
 */
export const findVersionById = async (id: number): Promise<number> => {
    const [row] = await db.select({ version: gameTable.version }).from(gameTable).where(eq(gameTable.id, id));
    if (row === undefined) {
        throw new NotFoundError(id);
    }
    return row.version;
};
