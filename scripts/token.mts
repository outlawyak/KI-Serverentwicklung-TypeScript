/**
 * Fetches an access token from Keycloak with the password grant and prints it,
 * so it can be used in curl on macOS, Windows and Linux:
 * `pnpm --silent run token game-admin` (or `game-user`).
 * Only for local development: the token is printed to the terminal on purpose.
 * https://www.keycloak.org/docs/latest/securing_apps/#_resource_owner_password_credentials_flow
 *
 * @packageDocumentation
 */

import process, { env, stdout } from 'node:process';
import { config } from '../src/config/config.mts';
import { parseArgs } from 'node:util';

// Environment variable holding the password of each test user (`.env.example`)
const passwordVariables: Readonly<Record<string, string>> = {
    'game-admin': 'KC_ADMIN_USER_PASSWORD',
    'game-user': 'KC_USER_PASSWORD',
};

const findPassword = (user: string): string | undefined => {
    const variable = passwordVariables[user];
    if (variable === undefined) {
        return undefined;
    }
    return env[variable];
};

const {
    positionals: [username = 'game-admin'],
} = parseArgs({ allowPositionals: true });
const password = findPassword(username);
const clientSecret = env['KC_CLIENT_SECRET'];

if (password === undefined || clientSecret === undefined) {
    process.stderr.write(
        `Unknown user or missing secret in .env. Users: ${Object.keys(passwordVariables).join(', ')}\n`,
    );
    process.exitCode = 1;
} else {
    const { issuer, clientId } = config.keycloak;
    const response = await fetch(`${issuer}/protocol/openid-connect/token`, {
        method: 'POST',
        body: new URLSearchParams({
            grant_type: 'password',
            client_id: clientId,
            client_secret: clientSecret,
            username,
            password,
        }),
    });
    const body: unknown = await response.json();
    if (response.ok && typeof body === 'object' && body !== null && 'access_token' in body) {
        stdout.write(`${String(body.access_token)}\n`);
    } else {
        process.stderr.write(`Keycloak answered ${response.status}: ${JSON.stringify(body)}\n`);
        process.exitCode = 1;
    }
}
