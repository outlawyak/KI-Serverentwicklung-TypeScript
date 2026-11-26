-- Database schema and test data.
-- Loaded once by the postgres container on first start (empty volume) via
-- /docker-entrypoint-initdb.d. To reload: docker compose down -v && docker compose up -d
-- https://hub.docker.com/_/postgres#initialization-scripts

BEGIN;

CREATE TABLE game (
    id           integer GENERATED ALWAYS AS IDENTITY (START WITH 1000) PRIMARY KEY,
    -- optimistic locking: incremented on every update
    version      integer     NOT NULL DEFAULT 0 CHECK (version >= 0),
    title        text        NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
    genre        text        NOT NULL CHECK (char_length(genre) BETWEEN 1 AND 50),
    release_date date,
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now()
);

-- 1:1 with game (unique FK)
CREATE TABLE game_details (
    id          integer GENERATED ALWAYS AS IDENTITY (START WITH 1000) PRIMARY KEY,
    game_id     integer NOT NULL UNIQUE REFERENCES game (id) ON DELETE CASCADE,
    description text,
    developer   text CHECK (char_length(developer) BETWEEN 1 AND 100),
    publisher   text CHECK (char_length(publisher) BETWEEN 1 AND 100)
);

-- 1:N with game
CREATE TABLE review (
    id         integer GENERATED ALWAYS AS IDENTITY (START WITH 1000) PRIMARY KEY,
    game_id    integer     NOT NULL REFERENCES game (id) ON DELETE CASCADE,
    rating     smallint    NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment    text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX review_game_id_idx ON review (game_id);

-- Test data. GENERATED ALWAYS forbids explicit ids; the script only runs on
-- an empty database, so the rows get ids from 1000 in insertion order.
-- Game 1003 'Celeste' has neither details nor reviews (tests the leftJoin).
INSERT INTO game (title, genre, release_date) VALUES
    ('The Legend of Zelda: Breath of the Wild', 'Action-Adventure', '2017-03-03'),
    ('Stardew Valley',                          'Simulation',       '2016-02-26'),
    ('Hades',                                   'Roguelike',        '2020-09-17'),
    ('Celeste',                                 'Platformer',       NULL);

INSERT INTO game_details (game_id, description, developer, publisher) VALUES
    (1000, 'Open-world adventure in the kingdom of Hyrule.',  'Nintendo EPD',     'Nintendo'),
    (1001, 'Farming and life simulation in Pelican Town.',    'ConcernedApe',     'ConcernedApe'),
    (1002, 'Escape the underworld in this action roguelike.', 'Supergiant Games', 'Supergiant Games');

INSERT INTO review (game_id, rating, comment) VALUES
    (1000, 5, 'A masterpiece of open-world design.'),
    (1000, 4, 'Great, but weapon durability is annoying.'),
    (1001, 5, 'Relaxing and endlessly charming.'),
    (1002, 5, 'Tight combat and a great story.'),
    (1002, 3, NULL);

COMMIT;
