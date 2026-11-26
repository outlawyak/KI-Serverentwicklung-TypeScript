/**
 * Zod schemas for the request bodies. `z.strictObject` rejects unknown fields;
 * the schemas for create and update are derived with `omit()`. Lengths and
 * optional/required match the constraints in `db/schema.sql`.
 * https://zod.dev/api#strictobject
 *
 * @packageDocumentation
 */

import { z } from 'zod';

const TITLE_MAX = 200;
const GENRE_MAX = 50;
const COMPANY_MAX = 100;
const RATING_MIN = 1;
const RATING_MAX = 5;

/** Optional in the request, `null` allowed (nullable column without default). */
const optionalNullable = <Schema extends z.ZodType>(schema: Schema): z.ZodExactOptional<z.ZodNullable<Schema>> =>
    schema.nullable().exactOptional();

const GameDetailsSchema = z.strictObject({
    description: optionalNullable(z.string()),
    developer: optionalNullable(z.string().nonempty().max(COMPANY_MAX)),
    publisher: optionalNullable(z.string().nonempty().max(COMPANY_MAX)),
});

const ReviewSchema = z.strictObject({
    id: z.int().positive(),
    rating: z.int().min(RATING_MIN).max(RATING_MAX),
    comment: optionalNullable(z.string()),
});

const GameSchema = z.strictObject({
    id: z.int().positive(),
    version: z.int().nonnegative(),
    title: z.string().nonempty().max(TITLE_MAX),
    genre: z.string().nonempty().max(GENRE_MAX),
    // ISO date such as 2017-03-03 https://zod.dev/api#iso-dates
    releaseDate: optionalNullable(z.iso.date()),
    details: GameDetailsSchema.exactOptional(),
    reviews: z.array(ReviewSchema.omit({ id: true })).exactOptional(),
});

/** New game, optionally with details and reviews (`POST /rest/games`). */
export const GameCreateSchema = z.compile(GameSchema.omit({ id: true, version: true })).readonly();

/**
 * Update of the game itself (`PUT /rest/games/:id`), without details and reviews.
 * PUT replaces the game, so `releaseDate` must be sent (`null` to clear it).
 */
export const GameUpdateSchema = z
    .compile(GameSchema.omit({ id: true, version: true, details: true, reviews: true }).required({ releaseDate: true }))
    .readonly();

/** New details of a game (`POST /rest/games/:id/details`). */
export const GameDetailsCreateSchema = z.compile(GameDetailsSchema).readonly();

/** New review of a game (`POST /rest/games/:id/reviews`). */
export const ReviewCreateSchema = z.compile(ReviewSchema.omit({ id: true })).readonly();

/**
 * Query parameters of the search (`GET /rest/games?title=&genre=`). Unknown
 * parameters are rejected, so a typo such as `?titel=` does not return all games.
 */
export const GameQuerySchema = z
    .compile(
        z.strictObject({
            title: z.string().trim().exactOptional(),
            genre: z.string().trim().exactOptional(),
        }),
    )
    .readonly();

export type GameCreate = z.infer<typeof GameCreateSchema>;
export type GameUpdate = z.infer<typeof GameUpdateSchema>;
export type GameDetailsCreate = z.infer<typeof GameDetailsCreateSchema>;
export type ReviewCreate = z.infer<typeof ReviewCreateSchema>;
export type GameQuery = z.infer<typeof GameQuerySchema>;
