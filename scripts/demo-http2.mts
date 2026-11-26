/**
 * Demonstrates the REST interface over HTTP/2 (Bruno only speaks HTTP/1.1):
 * sends the main requests with `node:http2` and prints the negotiated protocol,
 * the expected and the actual status. Creates its own game, so it can run any
 * number of times. Same command on macOS, Windows and Linux: `pnpm run demo:http2`.
 * https://nodejs.org/api/http2.html#http2connectauthority-options-listener
 *
 * @packageDocumentation
 */

import process, { stdout } from 'node:process';
import { config } from '../src/config/config.mts';
import { connect } from 'node:http2';
import { execFile } from 'node:child_process';
import { fetchToken } from './keycloak.mts';
import { once } from 'node:events';
import path from 'node:path';
import { promisify } from 'node:util';
import { readFile } from 'node:fs/promises';

type Step = Readonly<{
    method: string;
    path: string;
    expected: number;
    headers?: Readonly<Record<string, string>>;
    body?: unknown;
}>;

type ResponseHeaders = Readonly<Record<string, string | string[] | undefined>>;

const METHOD_WIDTH = 5;
const PATH_WIDTH = 44;

// The mkcert CA verifies the server certificate (no `rejectUnauthorized: false`)
const { stdout: caRoot } = await promisify(execFile)('mkcert', ['-CAROOT'], { encoding: 'utf8' });
const ca = await readFile(path.join(caRoot.trim(), 'rootCA.pem'));
const session = connect(`https://localhost:${config.server.port}`, { ca });
// Rejects if the connection fails (e.g. server not started)
await once(session, 'connect');

/** ALPN `h2` means the connection really is HTTP/2. */
const protocolOf = (alpnProtocol: string | false | undefined): string => {
    if (alpnProtocol === 'h2') {
        return 'HTTP/2';
    }
    return `not HTTP/2 (${String(alpnProtocol)})`;
};
const protocol = protocolOf(session.alpnProtocol);

/** Sends one request on the HTTP/2 session; the body of the response is skipped. */
const send = async ({ method, path: requestPath, headers = {}, body }: Step): Promise<ResponseHeaders> => {
    const stream = session.request({
        ':method': method,
        ':path': requestPath,
        'content-type': 'application/json',
        ...headers,
    });
    if (body !== undefined) {
        stream.write(JSON.stringify(body));
    }
    stream.end();
    const [responseHeaders] = (await once(stream, 'response')) as [ResponseHeaders];
    stream.resume();
    await once(stream, 'end');
    return responseHeaders;
};

const results: boolean[] = [];

/** Sends a step, prints one line and records whether the status was as expected. */
const run = async (step: Step): Promise<ResponseHeaders> => {
    const headers = await send(step);
    const status = Number(headers[':status']);
    const ok = status === step.expected;
    results.push(ok);
    let result = 'ok';
    if (!ok) {
        result = `WRONG, expected ${step.expected}`;
    }
    stdout.write(
        `${protocol}  ${step.method.padEnd(METHOD_WIDTH)}${step.path.padEnd(PATH_WIDTH)} ${status}  ${result}\n`,
    );
    return headers;
};

const [admin, user] = await Promise.all([fetchToken('game-admin'), fetchToken('game-user')]);
const bearer = (token: string): Readonly<Record<string, string>> => ({ authorization: `Bearer ${token}` });
const update = { title: 'HTTP/2 Demo Game', genre: 'Puzzle Platformer', releaseDate: null };

const game = await run({ method: 'GET', path: '/rest/games/1000', expected: 200 });
await run({
    method: 'GET',
    path: '/rest/games/1000',
    expected: 304,
    headers: { 'if-none-match': String(game['etag']) },
});
await run({ method: 'GET', path: '/rest/games?title=zelda', expected: 200 });
await run({ method: 'GET', path: '/rest/games/1abc', expected: 404 });
const created = await run({
    method: 'POST',
    path: '/rest/games',
    expected: 201,
    body: { title: 'HTTP/2 Demo Game', genre: 'Puzzle' },
});
const { pathname } = new URL(String(created['location']));
await run({ method: 'PUT', path: pathname, expected: 401, headers: { 'if-match': '"0"' }, body: update });
await run({
    method: 'PUT',
    path: pathname,
    expected: 403,
    headers: { ...bearer(user), 'if-match': '"0"' },
    body: update,
});
await run({ method: 'PUT', path: pathname, expected: 428, headers: bearer(admin), body: update });
await run({
    method: 'PUT',
    path: pathname,
    expected: 412,
    headers: { ...bearer(admin), 'if-match': '"999"' },
    body: update,
});
await run({
    method: 'PUT',
    path: pathname,
    expected: 204,
    headers: { ...bearer(admin), 'if-match': '"0"' },
    body: update,
});
await run({ method: 'GET', path: pathname, expected: 200 });
session.close();

const failed = results.filter((ok) => !ok);
if (results.every(Boolean)) {
    stdout.write(`\nAll ${results.length} requests answered as expected over ${protocol}.\n`);
} else {
    stdout.write(`\n${failed.length} of ${results.length} requests failed.\n`);
    process.exitCode = 1;
}
