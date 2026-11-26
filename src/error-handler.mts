/**
 * Central error handling, registered in `app.mts` as `app.onError` and
 * `app.notFound`: every error becomes a Problem Details response. Services
 * throw domain errors without HTTP; they are mapped to status codes here.
 * https://hono.dev/docs/api/hono#error-handling
 *
 * @packageDocumentation
 */

import { DetailsExistsError, NotFoundError, VersionOutdatedError } from './game/service/errors.mts';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { HttpStatus } from './http-status.mts';
import { getLogger } from './logger.mts';
import { problemResponse } from './problem-details.mts';
import { z } from 'zod';

const log = getLogger('error-handler');

/** Status code for the errors of the services; `undefined` means unexpected. */
const statusOf = (error: Error): ContentfulStatusCode | undefined => {
    if (error instanceof NotFoundError) {
        return HttpStatus.NotFound;
    }
    if (error instanceof DetailsExistsError) {
        return HttpStatus.Conflict;
    }
    if (error instanceof VersionOutdatedError) {
        return HttpStatus.PreconditionFailed;
    }
    if (error instanceof HTTPException) {
        return error.status;
    }
    return undefined;
};

/**
 * Turns an error into Problem Details: 422 with the invalid fields for Zod,
 * the mapped status for known errors, otherwise 500 without internal details.
 *
 * @param error the thrown error
 * @param c context of the request
 * @returns Problem Details response
 */
export const handleError = (error: Error, c: Context): Response => {
    // Invalid request body: every invalid field with its path, without the sent value
    if (error instanceof z.ZodError) {
        return problemResponse(c, {
            status: HttpStatus.UnprocessableContent,
            detail: 'The request body contains invalid fields',
            extensions: {
                errors: error.issues.map(({ path, message }) => ({ path: path.join('.'), message })),
            },
        });
    }
    const status = statusOf(error);
    if (status !== undefined) {
        return problemResponse(c, { status, detail: error.message });
    }
    // Details only in the log, never in the response
    log.error({ err: error }, 'Unexpected error');
    return problemResponse(c, {
        status: HttpStatus.InternalServerError,
        detail: 'An unexpected error occurred on the server',
    });
};

/**
 * Answers requests without a matching route.
 *
 * @param c context of the request
 * @returns Problem Details response with status 404
 */
export const handleNotFound = (c: Context): Response =>
    problemResponse(c, { status: HttpStatus.NotFound, detail: `There is no resource ${c.req.method} ${c.req.path}` });
