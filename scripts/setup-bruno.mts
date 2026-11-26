/**
 * Writes the secrets the Bruno collection needs from `.env` into
 * `extras/bruno/.env`, which Bruno loads as `process.env` (the file is gitignored).
 * Runs on macOS, Windows and Linux: `pnpm run setup:bruno`.
 * https://docs.usebruno.com/secrets-management/dotenv-file
 *
 * @packageDocumentation
 */

import process, { env, stdout } from 'node:process';
import { writeFile } from 'node:fs/promises';

// Only what the token requests need; nothing else leaves the root `.env`
const names = ['KC_CLIENT_SECRET', 'KC_ADMIN_USER_PASSWORD', 'KC_USER_PASSWORD'] as const;
// Read and write for the owner only (ignored on Windows)
const FILE_MODE = 0o600;

const missing = names.filter((name) => env[name] === undefined || env[name] === '').join(', ');
if (missing === '') {
    const content = names.map((name) => `${name}=${env[name] ?? ''}`).join('\n');
    await writeFile('extras/bruno/.env', `${content}\n`, { mode: FILE_MODE });
    stdout.write(`Wrote ${names.length} secrets to extras/bruno/.env\n`);
} else {
    process.stderr.write(`Missing in .env: ${missing}. Run pnpm run setup:env first.\n`);
    process.exitCode = 1;
}
