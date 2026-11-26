/**
 * Data transfer object of a game with its details (1:1) and reviews (1:N),
 * built from the rows of the query. Internal columns such as `game_id` are not
 * part of it.
 *
 * @packageDocumentation
 */

import type { gameDetailsTable, gameTable, reviewTable } from '../../db/schema.mts';

type GameRow = typeof gameTable.$inferSelect;
type GameDetailsRow = typeof gameDetailsTable.$inferSelect;
type ReviewRow = typeof reviewTable.$inferSelect;

export type GameDetailsDto = Readonly<{
    description: string | null;
    developer: string | null;
    publisher: string | null;
}>;

export type ReviewDto = Readonly<{
    id: number;
    rating: number;
    comment: string | null;
    createdAt: Date;
}>;

const toDetailsDto = (details: GameDetailsRow | null): GameDetailsDto | null => {
    if (details === null) {
        return null;
    }
    const { description, developer, publisher } = details;
    return { description, developer, publisher };
};

const toReviewDto = ({ id, rating, comment, createdAt }: ReviewRow): ReviewDto => ({ id, rating, comment, createdAt });

/** A game as returned by the read service; `details` is `null` if the game has none. */
export class GameDto {
    public readonly id: number;
    public readonly version: number;
    public readonly title: string;
    public readonly genre: string;
    public readonly releaseDate: string | null;
    public readonly createdAt: Date;
    public readonly updatedAt: Date;
    public readonly details: GameDetailsDto | null;
    public readonly reviews: readonly ReviewDto[];

    public constructor(game: GameRow, details: GameDetailsRow | null, reviews: readonly ReviewRow[]) {
        const { id, version, title, genre, releaseDate, createdAt, updatedAt } = game;
        this.id = id;
        this.version = version;
        this.title = title;
        this.genre = genre;
        this.releaseDate = releaseDate;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.details = toDetailsDto(details);
        this.reviews = reviews.map((review) => toReviewDto(review));
    }
}
