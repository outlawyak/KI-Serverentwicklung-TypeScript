/**
 * Named HTTP status codes used by the server. Hono only provides the types.
 * https://www.rfc-editor.org/rfc/rfc9110#name-status-codes
 *
 * @packageDocumentation
 */

export const HttpStatus = {
    Ok: 200,
    Created: 201,
    NoContent: 204,
    NotModified: 304,
    BadRequest: 400,
    Unauthorized: 401,
    Forbidden: 403,
    NotFound: 404,
    NotAcceptable: 406,
    Conflict: 409,
    PreconditionFailed: 412,
    UnprocessableContent: 422,
    PreconditionRequired: 428,
    InternalServerError: 500,
    ServiceUnavailable: 503,
} as const;
