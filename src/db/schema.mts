/**
 * Drizzle table definitions, generated from `db/schema.sql` with
 * `drizzle-kit pull` and reworked by hand (see `docs/recipe-new-entity.md` §2).
 * https://orm.drizzle.team/docs/drizzle-kit-pull
 *
 * @packageDocumentation
 */

import {
    check,
    date,
    foreignKey,
    index,
    integer,
    pgTable,
    smallint,
    text,
    timestamp,
    unique,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const gameTable = pgTable(
    'game',
    {
        id: integer().primaryKey().generatedAlwaysAsIdentity({
            name: 'game_id_seq',
            startWith: 1000,
            increment: 1,
            minValue: 1,
            maxValue: 2147483647,
            cache: 1,
        }),
        version: integer().default(0).notNull(),
        title: text().notNull(),
        genre: text().notNull(),
        releaseDate: date('release_date'),
        createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
        updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    },
    () => [
        check('game_version_check', sql`version >= 0`),
        check('game_title_check', sql`(char_length(title) >= 1) AND (char_length(title) <= 200)`),
        check('game_genre_check', sql`(char_length(genre) >= 1) AND (char_length(genre) <= 50)`),
    ],
);

export const gameDetailsTable = pgTable(
    'game_details',
    {
        id: integer().primaryKey().generatedAlwaysAsIdentity({
            name: 'game_details_id_seq',
            startWith: 1000,
            increment: 1,
            minValue: 1,
            maxValue: 2147483647,
            cache: 1,
        }),
        gameId: integer('game_id').notNull(),
        description: text(),
        developer: text(),
        publisher: text(),
    },
    (table) => [
        foreignKey({
            columns: [table.gameId],
            foreignColumns: [gameTable.id],
            name: 'game_details_game_id_fkey',
        }).onDelete('cascade'),
        unique('game_details_game_id_key').on(table.gameId),
        check('game_details_developer_check', sql`(char_length(developer) >= 1) AND (char_length(developer) <= 100)`),
        check('game_details_publisher_check', sql`(char_length(publisher) >= 1) AND (char_length(publisher) <= 100)`),
    ],
);

export const reviewTable = pgTable(
    'review',
    {
        id: integer().primaryKey().generatedAlwaysAsIdentity({
            name: 'review_id_seq',
            startWith: 1000,
            increment: 1,
            minValue: 1,
            maxValue: 2147483647,
            cache: 1,
        }),
        gameId: integer('game_id').notNull(),
        rating: smallint().notNull(),
        comment: text(),
        createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    },
    (table) => [
        index('review_game_id_idx').using('btree', table.gameId.asc().nullsLast().op('int4_ops')),
        foreignKey({
            columns: [table.gameId],
            foreignColumns: [gameTable.id],
            name: 'review_game_id_fkey',
        }).onDelete('cascade'),
        check('review_rating_check', sql`(rating >= 1) AND (rating <= 5)`),
    ],
);
