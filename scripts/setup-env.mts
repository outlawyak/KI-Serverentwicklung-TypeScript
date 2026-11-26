/**
 * Creates `.env` from `.env.example` and fills every empty value with a random
 * secret. Runs on macOS, Windows and Linux: `pnpm run setup:env`.
 * An existing `.env` is never overwritten.
 *
 * @packageDocumentation
 */

import process, { stdout } from 'node:process';
import { readFile, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';

const SECRET_BYTES = 24;
// Read and write for the owner only (ignored on Windows)
const FILE_MODE = 0o600;
const EMPTY_VARIABLE = /^[A-Z][A-Z0-9_]*=$/u;

const fillSecret = (line: string): string => {
    if (!EMPTY_VARIABLE.test(line)) {
        return line;
    }
    return `${line}${randomBytes(SECRET_BYTES).toString('hex')}`;
};

const example = await readFile('.env.example', 'utf8');
const lines = example.split(/\r?\n/u);
const content = lines.map((line) => fillSecret(line)).join('\n');
const filled = lines.filter((line) => EMPTY_VARIABLE.test(line)).length;

try {
    // Flag `wx`: fails if `.env` exists, so existing secrets are never replaced
    await writeFile('.env', content, { mode: FILE_MODE, flag: 'wx' });
    stdout.write(`Created .env with ${filled} generated secrets\n`);
} catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'EEXIST') {
        process.stderr.write('.env already exists and was not changed. Delete it first to start over.\n');
        process.exitCode = 1;
    } else {
        throw error;
    }
}
