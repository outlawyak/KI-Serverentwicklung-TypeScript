/**
 * The Hono application: middleware, routes and the central error handling.
 * The server is started in `main.mts`, so the app can also be used without a
 * network (`app.request`).
 * https://hono.dev/docs/api/hono
 *
 * @packageDocumentation
 */

import { DetailsExistsError, NotFoundError, VersionOutdatedError } from './game/service/errors.mts';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { HTTPException } from 'hono/http-exception';
import { Hono } from 'hono';
import { HttpStatus } from './http-status.mts';
import { getLogger } from './logger.mts';
import { healthPath } from './paths.mts';
import { performance } from 'node:perf_hooks';
import { problemResponse } from './problem-details.mts';

const log = getLogger('app');

// Media ranges in `Accept` that allow a JSON response (also for Problem Details)
const jsonMediaRanges = new Set(['*/*', 'application/*', 'application/json', 'application/problem+json']);
const QUALITY_PREFIX = 'q=';
const QUALITY_NOT_ACCEPTABLE = 0;

/**
 * Checks whether a JSON response is acceptable for the client.
 * A missing `Accept` header accepts everything.
 * https://www.rfc-editor.org/rfc/rfc9110#name-accept
 */
const acceptsJson = (accept: string | undefined): boolean => {
    if (accept === undefined || accept.trim() === '') {
        return true;
    }
    return accept.split(',').some((element) => {
        const [range = '', ...parameters] = element.split(';').map((part) => part.trim().toLowerCase());
        const quality = parameters.find((parameter) => parameter.startsWith(QUALITY_PREFIX));
        const rejected =
            quality !== undefined && Number(quality.slice(QUALITY_PREFIX.length)) === QUALITY_NOT_ACCEPTABLE;
        return !rejected && jsonMediaRanges.has(range);
    });
};

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

export const app = new Hono();

// Logs method, path, status and duration as fields; never headers or the body (tokens)
app.use(async (c, next) => {
    const start = performance.now();
    await next();
    const { method, path } = c.req;
    log.info({ method, path, status: c.res.status, ms: Math.round(performance.now() - start) }, 'request');
});

// Every response is JSON, so a client that rules out JSON gets 406
app.use(async (c, next) => {
    if (!acceptsJson(c.req.header('Accept'))) {
        return problemResponse(c, {
            status: HttpStatus.NotAcceptable,
            detail: 'The responses of this server are only available as JSON',
        });
    }
    return await next();
});

app.get(healthPath, (c) => c.json({ status: 'UP' }));

app.notFound((c) =>
    problemResponse(c, { status: HttpStatus.NotFound, detail: `There is no resource ${c.req.method} ${c.req.path}` }),
);

// Hono's error handler API takes the error as the first parameter
// oxlint-disable-next-line promise/prefer-await-to-callbacks
app.onError((error, c) => {
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
});
