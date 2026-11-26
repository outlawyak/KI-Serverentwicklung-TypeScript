/**
 * Drizzle relations between the tables, generated with `drizzle-kit pull` and
 * reworked by hand: `drizzle-kit` cannot detect the 1:1 relationship via the
 * `UNIQUE` foreign key and generates `many` for it.
 * https://orm.drizzle.team/docs/relations#one-to-one
 *
 * @packageDocumentation
 */

import { gameDetailsTable, gameTable, reviewTable } from './schema.mts';
import { relations } from 'drizzle-orm/relations';

export const gameRelations = relations(gameTable, ({ one, many }) => ({
    details: one(gameDetailsTable),
    reviews: many(reviewTable),
}));

export const gameDetailsRelations = relations(gameDetailsTable, ({ one }) => ({
    game: one(gameTable, {
        fields: [gameDetailsTable.gameId],
        references: [gameTable.id],
    }),
}));

export const reviewRelations = relations(reviewTable, ({ one }) => ({
    game: one(gameTable, {
        fields: [reviewTable.gameId],
        references: [gameTable.id],
    }),
}));
