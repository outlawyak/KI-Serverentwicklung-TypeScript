/**
 * Route middleware that requires a valid Keycloak access token with client roles.
 * The JWT is verified with jose against the JWKS of the realm: signature (RS256),
 * issuer, audience (the client) and expiry. The roles are the client roles in
 * `resource_access[<clientId>].roles`, as in the lecturer's examples. Tokens are never logged.
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
import { z } from 'zod';

const log = getLogger('security');

const { issuer, jwksUrl, clientId } = config.keycloak;

// Fetches the public keys of the realm once and caches them; new keys (key rotation) are reloaded
const jwks = createRemoteJWKSet(new URL(jwksUrl));

// `Authorization: Bearer <token>`; the scheme is case-insensitive (RFC 9110 §11.1)
const BEARER_PATTERN = /^Bearer\s+(?<token>\S+)$/iu;

// Only the part of the payload that is needed; other claims are allowed (z.object, not strict)
// https://www.keycloak.org/docs/latest/server_admin/#_client_scopes_permissions
const RolesSchema = z.object({ roles: z.array(z.string()) });
const ClientRolesSchema = z.object({ resource_access: z.record(z.string(), RolesSchema).optional() });

/** The client roles of the user for this client; empty if the token has none. */
const clientRolesOf = (payload: JWTPayload): readonly string[] => {
    const result = ClientRolesSchema.safeParse(payload);
    if (!result.success) {
        return [];
    }
    return result.data.resource_access?.[clientId]?.roles ?? [];
};

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
 * @returns the payload, or `undefined` if the token is invalid (respond with 401)
 * @throws the original error if the keys cannot be loaded (server problem, 500)
 */
const verifiedPayload = async (token: string): Promise<JWTPayload | undefined> => {
    try {
        const { payload } = await jwtVerify(token, jwks, { issuer, audience: clientId, algorithms: ['RS256'] });
        return payload;
    } catch (error) {
        if (!isInvalidToken(error)) {
            throw error;
        }
        // Only the reason, never the token
        log.info({ reason: error.code }, 'Rejected access token');
        return undefined;
    }
};

/**
 * Creates a middleware that only lets requests through whose access token is
 * valid and contains all the given client roles.
 *
 * @param roles client roles the user must have, e.g. `admin`
 * @returns middleware for a route; missing or invalid token → 401, missing role → 403,
 * both as Problem Details
 */
export const rolesRequired =
    (...roles: readonly string[]): MiddlewareHandler =>
    async (c, next) => {
        const token = BEARER_PATTERN.exec(c.req.header('Authorization') ?? '')?.groups?.['token'];
        if (token === undefined) {
            return unauthorized(c, 'An access token is required: Authorization: Bearer <token>', 'Bearer');
        }
        const payload = await verifiedPayload(token);
        if (payload === undefined) {
            return unauthorized(c, 'The access token is invalid or expired', 'Bearer error="invalid_token"');
        }
        const userRoles = clientRolesOf(payload);
        if (!roles.every((role) => userRoles.includes(role))) {
            return problemResponse(c, {
                status: HttpStatus.Forbidden,
                detail: `This request requires the role ${roles.join(', ')}`,
            });
        }
        return await next();
    };
