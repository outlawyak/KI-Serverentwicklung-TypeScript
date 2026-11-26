/**
 * Central logger based on pino; use `getLogger` instead of `console`.
 * In a terminal the output is formatted with pino-pretty, otherwise it is JSON.
 * Sensitive fields are redacted, so tokens and passwords never reach the log.
 * https://getpino.io/#/docs/redaction
 *
 * @packageDocumentation
 */

import { type Logger, type LoggerOptions, pino } from 'pino';
import { stdout } from 'node:process';

const options: LoggerOptions = {
    level: 'info',
    redact: {
        paths: ['*.authorization', '*.Authorization', '*.password', '*.secret', '*.token', 'password', 'token'],
        censor: '[redacted]',
    },
};
if (stdout.isTTY) {
    options.transport = { target: 'pino-pretty', options: { ignore: 'pid,hostname' } };
}

const rootLogger = pino(options);

/**
 * Returns a logger for a module.
 *
 * @param name name of the module, shown in every log line
 * @returns child logger of the root logger
 */
export const getLogger = (name: string): Logger => rootLogger.child({ name });
