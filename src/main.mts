/**
 * Entry point: starts the Hono app over HTTP/2 with TLS 1.3 and shuts it down
 * cleanly on SIGINT/SIGTERM. `allowHTTP1` keeps HTTP/1.1 clients such as Bruno working.
 * https://github.com/honojs/node-server#http2
 *
 * @packageDocumentation
 */

import { type ServerHttp2Session, createSecureServer } from 'node:http2';
import { app } from './app.mts';
import { config } from './config/config.mts';
import { getLogger } from './logger.mts';
import process from 'node:process';
import { readFile } from 'node:fs/promises';
import { serve } from '@hono/node-server';

const log = getLogger('main');

const {
    port,
    tls: { keyPath, certPath },
} = config.server;
const [key, cert] = await Promise.all([readFile(keyPath), readFile(certPath)]);

const server = serve(
    {
        fetch: app.fetch,
        port,
        createServer: createSecureServer,
        serverOptions: { key, cert, allowHTTP1: true, minVersion: 'TLSv1.3' },
    },
    (info) => log.info(`Listening on https://localhost:${info.port}`),
);

// Open HTTP/2 sessions would keep the process alive after `server.close()`
const sessions = new Set<ServerHttp2Session>();
server.on('session', (session: ServerHttp2Session) => {
    sessions.add(session);
    session.once('close', () => sessions.delete(session));
});

const shutdown = (signal: NodeJS.Signals): void => {
    log.info(`${signal} received, shutting down`);
    server.once('close', () => log.info('Server closed'));
    server.close();
    // Lets running requests finish, then closes the session
    sessions.forEach((session) => session.close());
};

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
