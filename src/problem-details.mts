/**
 * Error responses as Problem Details (RFC 9457) with the media type
 * `application/problem+json`. `type` is `about:blank`, so `title` is the
 * standard phrase of the status code.
 * https://www.rfc-editor.org/rfc/rfc9457.html
 *
 * @packageDocumentation
 */

import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type { Context } from 'hono';
import { STATUS_CODES } from 'node:http';

export const problemMediaType = 'application/problem+json';

/** Body of a Problem Details response; extension members such as `errors` are allowed. */
export type ProblemDetails = Readonly<{
    type: string;
    title: string;
    status: number;
    detail: string;
    instance: string;
    [extension: string]: unknown;
}>;

/** What a Problem Details response is made of, besides the request. */
export type Problem = Readonly<{
    /** HTTP status code */
    status: ContentfulStatusCode;
    /** Explanation for the client, without internal details */
    detail: string;
    /** Additional members, e.g. the invalid fields */
    extensions?: Readonly<Record<string, unknown>>;
}>;

/**
 * Creates a Problem Details response for the current request.
 *
 * @param c context of the request; its path becomes `instance`
 * @param problem status code, detail and optional extension members
 * @returns response with `Content-Type: application/problem+json`
 */
export const problemResponse = (c: Context, { status, detail, extensions = {} }: Problem): Response => {
    const body: ProblemDetails = {
        ...extensions,
        type: 'about:blank',
        title: STATUS_CODES[status] ?? 'Error',
        status,
        detail,
        instance: c.req.path,
    };
    return c.body(JSON.stringify(body), status, { 'Content-Type': problemMediaType });
};
