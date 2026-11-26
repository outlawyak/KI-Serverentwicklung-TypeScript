/**
 * Writing games, details and reviews, each write in one transaction.
 * Constraint violations come from the database and are mapped to errors
 * (no SELECT beforehand). Knows nothing about HTTP.
 * https://orm.drizzle.team/docs/transactions
 *
 * @packageDocumentation
 */

import { DetailsExistsError, NotFoundError, VersionOutdatedError } from './errors.mts';
import { DrizzleQueryError, and, eq, sql } from 'drizzle-orm';
import { gameDetailsTable, gameTable, reviewTable } from '../../db/schema.mts';
import { DatabaseError } from 'pg';
import { db } from '../../db/client.mts';
import { findVersionById } from './game-service.mts';

/** Fields of the game itself (also the content of an update). */
export type GameData = Readonly<Pick<typeof gameTable.$inferInsert, 'title' | 'genre' | 'releaseDate'>>;
export type GameDetailsData = Readonly<
    Pick<typeof gameDetailsTable.$inferInsert, 'description' | 'developer' | 'publisher'>
>;
export type ReviewData = Readonly<Pick<typeof reviewTable.$inferInsert, 'rating' | 'comment'>>;

/** A new game, optionally with details and reviews. */
export type GameCreateData = GameData &
    Readonly<{
        details?: GameDetailsData;
        reviews?: readonly ReviewData[];
    }>;

// SQLSTATE codes of PostgreSQL https://www.postgresql.org/docs/current/errcodes-appendix.html
const UNIQUE_VIOLATION = '23505';
const FOREIGN_KEY_VIOLATION = '23503';
const DETAILS_UNIQUE_CONSTRAINT = 'game_details_game_id_key';

/** The PostgreSQL error behind a failed Drizzle query, if there is one. */
const databaseErrorOf = (error: unknown): DatabaseError | undefined => {
    if (error instanceof DrizzleQueryError && error.cause instanceof DatabaseError) {
        return error.cause;
    }
    if (error instanceof DatabaseError) {
        return error;
    }
    return undefined;
};

/** Maps a failed insert of a child row to a domain error; other errors stay as they are. */
const toChildInsertError = (error: unknown, gameId: number): unknown => {
    const databaseError = databaseErrorOf(error);
    if (databaseError?.code === FOREIGN_KEY_VIOLATION) {
        return new NotFoundError(gameId);
    }
    if (databaseError?.code === UNIQUE_VIOLATION && databaseError.constraint === DETAILS_UNIQUE_CONSTRAINT) {
        return new DetailsExistsError(gameId);
    }
    return error;
};

/**
 * Creates a game together with its optional details and reviews in one transaction.
 *
 * @param data the new game; the database generates the ID and the timestamps
 * @returns ID of the new game
 */
export const create = ({ details, reviews = [], ...game }: GameCreateData): Promise<number> =>
    db.transaction(async (tx) => {
        const [created] = await tx.insert(gameTable).values(game).returning({ id: gameTable.id });
        if (created === undefined) {
            throw new Error('INSERT INTO game returned no row');
        }
        const { id: gameId } = created;
        if (details !== undefined) {
            await tx.insert(gameDetailsTable).values({ ...details, gameId });
        }
        // `values([])` is not allowed, so only with at least one review
        const [firstReview] = reviews;
        if (firstReview !== undefined) {
            await tx.insert(reviewTable).values(reviews.map((review) => ({ ...review, gameId })));
        }
        return gameId;
    });

/**
 * Creates the details of a game (1:1).
 *
 * @param gameId ID of the game
 * @param details the new details
 * @throws NotFoundError if there is no game with this ID
 * @throws DetailsExistsError if the game already has details
 */
export const createDetails = async (gameId: number, details: GameDetailsData): Promise<void> => {
    try {
        await db.transaction(async (tx) => {
            await tx.insert(gameDetailsTable).values({ ...details, gameId });
        });
    } catch (error) {
        throw toChildInsertError(error, gameId);
    }
};

/**
 * Creates a review of a game (1:N).
 *
 * @param gameId ID of the game
 * @param review the new review
 * @returns ID of the new review
 * @throws NotFoundError if there is no game with this ID
 */
export const createReview = async (gameId: number, review: ReviewData): Promise<number> => {
    try {
        const [created] = await db.transaction((tx) =>
            tx
                .insert(reviewTable)
                .values({ ...review, gameId })
                .returning({ id: reviewTable.id }),
        );
        if (created === undefined) {
            throw new Error('INSERT INTO review returned no row');
        }
        return created.id;
    } catch (error) {
        throw toChildInsertError(error, gameId);
    }
};

/**
 * Updates the fields of a game atomically: one UPDATE checks the version,
 * increments it and sets `updated_at`, so concurrent updates cannot overwrite each other.
 *
 * @param id ID of the game
 * @param version the version the client has read (from `If-Match`)
 * @param game the new fields of the game
 * @returns the new version
 * @throws NotFoundError if there is no game with this ID
 * @throws VersionOutdatedError if the version is not the current one
 */
export const update = async (id: number, version: number, game: GameData): Promise<number> => {
    const [updated] = await db.transaction((tx) =>
        tx
            .update(gameTable)
            .set({ ...game, version: sql`${gameTable.version} + 1`, updatedAt: sql`now()` })
            .where(and(eq(gameTable.id, id), eq(gameTable.version, version)))
            .returning({ version: gameTable.version }),
    );
    if (updated === undefined) {
        // No row: either the game does not exist (throws NotFoundError) or the version is outdated
        await findVersionById(id);
        throw new VersionOutdatedError(version);
    }
    return updated.version;
};
