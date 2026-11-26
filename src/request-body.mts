/**
 * Reading the JSON body of a request. Invalid JSON is a client error (400);
 * whether the content is valid is decided afterwards by the Zod schema (422).
 * https://hono.dev/docs/api/request#json
 *
 * @packageDocumentation
 */

import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { HttpStatus } from './http-status.mts';

/**
 * Parses the request body as JSON.
 *
 * @param c context of the request
 * @returns the parsed body, still unvalidated
 * @throws HTTPException with status 400 if the body is not valid JSON
 */
export const readJsonBody = async (c: Context): Promise<unknown> => {
    try {
        const body: unknown = await c.req.json();
        return body;
    } catch {
        throw new HTTPException(HttpStatus.BadRequest, { message: 'The request body is not valid JSON' });
    }
};
