/**
 * The Hono application: middleware and routes. Errors are handled centrally
 * in `error-handler.mts`. The server is started in `main.mts`, so the app can
 * also be used without a network (`app.request`).
 * https://hono.dev/docs/api/hono
 *
 * @packageDocumentation
 */

import { handleError, handleNotFound } from './error-handler.mts';
import { Hono } from 'hono';
import { HttpStatus } from './http-status.mts';
import { getLogger } from './logger.mts';
import { healthPath } from './paths.mts';
import { isDatabaseReachable } from './db/client.mts';
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

// Not ready without the database: 503 as Problem Details, like every other error
app.get(healthPath, async (c) => {
    if (!(await isDatabaseReachable())) {
        return problemResponse(c, {
            status: HttpStatus.ServiceUnavailable,
            detail: 'The database is not reachable',
            extensions: { database: 'DOWN' },
        });
    }
    return c.json({ status: 'UP', database: 'UP' });
});

app.notFound(handleNotFound);
app.onError(handleError);
