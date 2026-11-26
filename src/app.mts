/**
 * The Hono application: middleware and routes. The server is started in
 * `main.mts`, so the app can also be used without a network (`app.request`).
 * https://hono.dev/docs/api/hono
 *
 * @packageDocumentation
 */

import { Hono } from 'hono';
import { getLogger } from './logger.mts';
import { healthPath } from './paths.mts';
import { performance } from 'node:perf_hooks';

const log = getLogger('app');

export const app = new Hono();

// Logs method, path, status and duration as fields; never headers or the body (tokens)
app.use(async (c, next) => {
    const start = performance.now();
    await next();
    const { method, path } = c.req;
    log.info({ method, path, status: c.res.status, ms: Math.round(performance.now() - start) }, 'request');
});

app.get(healthPath, (c) => c.json({ status: 'UP' }));
