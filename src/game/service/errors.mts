/**
 * Errors thrown by the game services. They know nothing about HTTP; `app.onError`
 * maps them to status codes and Problem Details.
 *
 * @packageDocumentation
 */

/** There is no game with the given ID. */
// The error classes belong together; one file per class would scatter them
// oxlint-disable-next-line max-classes-per-file
export class NotFoundError extends Error {
    public override readonly name = 'NotFoundError';
    public readonly id: number;

    public constructor(id: number) {
        super(`There is no game with the ID ${id}`);
        this.id = id;
    }
}

/** The version sent by the client is not the current one (lost update). */
export class VersionOutdatedError extends Error {
    public override readonly name = 'VersionOutdatedError';
    public readonly version: number;

    public constructor(version: number) {
        super(`The version ${version} is not the current version`);
        this.version = version;
    }
}

/** The game already has details (1:1). */
export class DetailsExistsError extends Error {
    public override readonly name = 'DetailsExistsError';
    public readonly gameId: number;

    public constructor(gameId: number) {
        super(`The game with the ID ${gameId} already has details`);
        this.gameId = gameId;
    }
}
