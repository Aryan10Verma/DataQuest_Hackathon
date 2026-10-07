// Copies the backend's frozen example responses into src/fixtures for VITE_DATA_MODE=fixtures.
import { cpSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const from = new URL('../../backend/contracts/fixtures/', import.meta.url).pathname;
const to = new URL('../src/fixtures/', import.meta.url).pathname;
rmSync(to, { recursive: true, force: true });
mkdirSync(to, { recursive: true });
const files = readdirSync(from).filter((f) => f.endsWith('.json'));
for (const f of files) cpSync(join(from, f), join(to, f));
console.log(`Copied ${files.length} fixtures to src/fixtures`);
