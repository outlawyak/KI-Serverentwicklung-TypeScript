/**
 * Fetches access tokens of the test users from Keycloak with the password
 * grant; used by `token.mts` and `demo-http2.mts`. Only for local development.
 * https://www.keycloak.org/docs/latest/securing_apps/#_resource_owner_password_credentials_flow
 *
 * @packageDocumentation
 */

import { config } from '../src/config/config.mts';
import { env } from 'node:process';

// Environment variable holding the password of each test user (`.env.example`)
const passwordVariables: Readonly<Record<string, string>> = {
    'game-admin': 'KC_ADMIN_USER_PASSWORD',
    'game-user': 'KC_USER_PASSWORD',
};

/** The test users a token can be fetched for. */
export const testUsers: readonly string[] = Object.keys(passwordVariables);

const findPassword = (user: string): string | undefined => {
    const variable = passwordVariables[user];
    if (variable === undefined) {
        return undefined;
    }
    return env[variable];
};

/**
 * Fetches an access token for a test user.
 *
 * @param username `game-admin` or `game-user`
 * @returns the access token
 * @throws Error if the user is unknown, a secret is missing in `.env` or Keycloak refuses
 */
export const fetchToken = async (username: string): Promise<string> => {
    const password = findPassword(username);
    const clientSecret = env['KC_CLIENT_SECRET'];
    if (password === undefined || clientSecret === undefined) {
        throw new Error(`Unknown user or missing secret in .env. Users: ${testUsers.join(', ')}`);
    }
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
        return String(body.access_token);
    }
    throw new Error(`Keycloak answered ${response.status}: ${JSON.stringify(body)}`);
};
