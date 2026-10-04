/**
 * Runs every scripts/tests/*.test.ts file in its own process.
 *   npm test                  # all suites
 *   TEST_FILTER=glob npm test # only matching test names
 */
import { readdirSync } from 'fs';
import { join } from 'path';
import { spawnSync } from 'child_process';

const dir = __dirname;
const files = readdirSync(dir).filter(f => f.endsWith('.test.ts')).sort();
let failed = 0;
for (const f of files) {
    const res = spawnSync('npx', ['tsx', join(dir, f)], { stdio: 'inherit' });
    if (res.status !== 0) failed++;
}
console.log(`\n${files.length - failed}/${files.length} test files passed`);
process.exit(failed ? 1 : 0);
