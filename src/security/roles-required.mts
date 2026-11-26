/**
 * Route middleware that requires a valid Keycloak access token. The JWT is
 * verified with jose against the JWKS of the realm: signature (RS256), issuer,
 * audience (the client) and expiry. Tokens are never logged.
 * https://github.com/panva/jose/blob/main/docs/jwt/verify/functions/jwtVerify.md
 *
 * @packageDocumentation
 */

import type { Context, MiddlewareHandler } from 'hono';
import { type JWTPayload, createRemoteJWKSet, errors, jwtVerify } from 'jose';
import { HttpStatus } from '../http-status.mts';
import { config } from '../config/config.mts';
import { getLogger } from '../logger.mts';
import { problemResponse } from '../problem-details.mts';

const log = getLogger('security');

const { issuer, jwksUrl, clientId } = config.keycloak;

// Fetches the public keys of the realm once and caches them; new keys (key rotation) are reloaded
const jwks = createRemoteJWKSet(new URL(jwksUrl));

// `Authorization: Bearer <token>`; the scheme is case-insensitive (RFC 9110 §11.1)
const BEARER_PATTERN = /^Bearer\s+(?<token>\S+)$/iu;

/** Errors caused by the token itself (401); everything else is a server problem. */
const isInvalidToken = (error: unknown): error is errors.JOSEError =>
    error instanceof errors.JOSEError &&
    !(error instanceof errors.JWKSTimeout) &&
    !(error instanceof errors.JWKSInvalid);

/**
 * 401 as Problem Details with `WWW-Authenticate`, so the client knows that a
 * bearer token is expected. https://www.rfc-editor.org/rfc/rfc6750#section-3
 */
const unauthorized = (c: Context, detail: string, challenge: string): Response => {
    c.header('WWW-Authenticate', challenge);
    return problemResponse(c, { status: HttpStatus.Unauthorized, detail });
};

/**
 * Verifies the token with the keys of the realm.
 *
 * @throws a jose error if the token is invalid or the keys cannot be loaded
 */
const verifyToken = async (token: string): Promise<JWTPayload> => {
    const { payload } = await jwtVerify(token, jwks, { issuer, audience: clientId, algorithms: ['RS256'] });
    return payload;
};

/**
 * Creates a middleware that only lets requests with a valid access token through.
 *
 * @returns middleware for a route; missing or invalid token → 401 as Problem Details
 */
export const rolesRequired = (): MiddlewareHandler => async (c, next) => {
    const token = BEARER_PATTERN.exec(c.req.header('Authorization') ?? '')?.groups?.['token'];
    if (token === undefined) {
        return unauthorized(c, 'An access token is required: Authorization: Bearer <token>', 'Bearer');
    }
    try {
        await verifyToken(token);
    } catch (error) {
        if (!isInvalidToken(error)) {
            throw error;
        }
        // Only the reason, never the token
        log.info({ reason: error.code }, 'Rejected access token');
        return unauthorized(c, 'The access token is invalid or expired', 'Bearer error="invalid_token"');
    }
    return await next();
};
