/**
 * Fetches an access token from Keycloak with the password grant and prints it,
 * so it can be used in curl on macOS, Windows and Linux:
 * `pnpm --silent run token game-admin` (or `game-user`).
 * Only for local development: the token is printed to the terminal on purpose.
 *
 * @packageDocumentation
 */

import process, { stdout } from 'node:process';
import { fetchToken } from './keycloak.mts';
import { parseArgs } from 'node:util';

const {
    positionals: [username = 'game-admin'],
} = parseArgs({ allowPositionals: true });

try {
    stdout.write(`${await fetchToken(username)}\n`);
} catch (error) {
    process.stderr.write(`${String(error)}\n`);
    process.exitCode = 1;
}
