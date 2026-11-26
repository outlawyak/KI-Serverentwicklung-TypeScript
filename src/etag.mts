/**
 * Entity tags from the version of a game, for conditional requests:
 * `If-None-Match` (GET, 304) and `If-Match` (PUT, lost-update protection).
 * https://www.rfc-editor.org/rfc/rfc9110#name-etag
 *
 * @packageDocumentation
 */

const WEAK_PREFIX = 'W/';

/** Removes the weak prefix: `W/"0"` becomes `"0"`. */
const withoutWeakPrefix = (tag: string): string => {
    if (tag.startsWith(WEAK_PREFIX)) {
        return tag.slice(WEAK_PREFIX.length);
    }
    return tag;
};

/**
 * Creates the strong entity tag of a version.
 *
 * @param version version of the game
 * @returns the entity tag in quotes, e.g. `"0"`
 */
export const toETag = (version: number): string => `"${version}"`;

/**
 * Evaluates `If-None-Match` with the weak comparison of RFC 9110 §13.1.2:
 * `W/"0"` matches `"0"`, a list matches if one element does, `*` matches any.
 * https://www.rfc-editor.org/rfc/rfc9110#name-if-none-match
 *
 * @param header value of `If-None-Match`, `undefined` if the header is missing
 * @param etag current entity tag of the resource
 * @returns `true` if the client already has the current version (respond with 304)
 */
export const matchesIfNoneMatch = (header: string | undefined, etag: string): boolean => {
    if (header === undefined) {
        return false;
    }
    return header
        .split(',')
        .map((tag) => tag.trim())
        .some((tag) => tag === '*' || withoutWeakPrefix(tag) === etag);
};
