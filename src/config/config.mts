/**
 * Central configuration of the server, read once from the environment and
 * validated with Zod. Node loads `.env` via `--env-file-if-exists` (see the
 * scripts in `package.json`); the variables are documented in `.env.example`.
 * This is the only module that reads `process.env`.
 * https://nodejs.org/api/cli.html#--env-file-if-existsfile
 *
 * @packageDocumentation
 */

import { env } from 'node:process';
import { z } from 'zod';

const MAX_PORT = 65_535;

const portSchema = z.string().pipe(z.coerce.number<string>().int().positive().max(MAX_PORT));
const requiredSchema = z.string().trim().nonempty();
const httpUrlSchema = z.url({ protocol: /^https?$/u });

// `z.object` instead of `z.strictObject`: the environment contains many other variables
const envSchema = z
    .object({
        PORT: portSchema,
        TLS_KEY_PATH: requiredSchema,
        TLS_CERT_PATH: requiredSchema,
        POSTGRES_HOST: requiredSchema,
        POSTGRES_PORT: portSchema,
        POSTGRES_USER: requiredSchema,
        POSTGRES_PASSWORD: requiredSchema,
        POSTGRES_DB: requiredSchema,
        KEYCLOAK_ISSUER: httpUrlSchema,
        KEYCLOAK_JWKS_URL: httpUrlSchema,
        KEYCLOAK_CLIENT_ID: requiredSchema,
    })
    .transform(
        (vars) =>
            ({
                server: {
                    port: vars.PORT,
                    tls: { keyPath: vars.TLS_KEY_PATH, certPath: vars.TLS_CERT_PATH },
                },
                db: {
                    host: vars.POSTGRES_HOST,
                    port: vars.POSTGRES_PORT,
                    user: vars.POSTGRES_USER,
                    password: vars.POSTGRES_PASSWORD,
                    database: vars.POSTGRES_DB,
                },
                keycloak: {
                    issuer: vars.KEYCLOAK_ISSUER,
                    jwksUrl: vars.KEYCLOAK_JWKS_URL,
                    clientId: vars.KEYCLOAK_CLIENT_ID,
                },
            }) as const,
    );

/** The validated configuration, deeply read-only. */
export type Config = z.infer<typeof envSchema>;

/**
 * Validates the environment variables.
 *
 * @returns the typed configuration
 * @throws Error naming every missing or invalid variable, without its value
 */
const parseConfig = (): Config => {
    const result = envSchema.safeParse(env);
    if (!result.success) {
        throw new Error(`Invalid configuration, check .env against .env.example:\n${z.prettifyError(result.error)}`);
    }
    return result.data;
};

export const config: Config = parseConfig();
