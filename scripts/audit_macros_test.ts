import * as fs from 'fs';
import * as path from 'path';
import { findGlobalConstructs } from './audit_macros';

const TEST_DIR = path.join(__dirname, 'temp_macro_test_dir');

function setup() {
    if (fs.existsSync(TEST_DIR)) fs.rmSync(TEST_DIR, { recursive: true, force: true });
    fs.mkdirSync(TEST_DIR);
    fs.mkdirSync(path.join(TEST_DIR, 'src'));
    fs.mkdirSync(path.join(TEST_DIR, 'src', 'utils'));
    fs.writeFileSync(path.join(TEST_DIR, 'src', 'utils', 'global.ts'), 'export const A = 1;');
    fs.mkdirSync(path.join(TEST_DIR, 'src', 'constants'));
    fs.writeFileSync(path.join(TEST_DIR, 'src', 'constants', 'config.ts'), 'export const B = 2;');
}

function cleanup() {
    if (fs.existsSync(TEST_DIR)) fs.rmSync(TEST_DIR, { recursive: true, force: true });
}

function runTest() {
    console.log("Running Audit Macros Tests...");
    setup();
    try {
        const results = findGlobalConstructs(path.join(TEST_DIR, 'src'));
        
        const utilsPath = path.join(TEST_DIR, 'src', 'utils');
        const constantsPath = path.join(TEST_DIR, 'src', 'constants');

        if (!results.utils.some((p: string) => p === utilsPath)) {
            throw new Error(`Failed to find src/utils. Found: ${results.utils.join(', ')}`);
        }
        if (!results.constants.some((p: string) => p === constantsPath)) {
            throw new Error(`Failed to find src/constants. Found: ${results.constants.join(', ')}`);
        }
        console.log("PASS: Global constructs found.");
    } catch (e) {
        console.error("FAIL:", e);
        process.exit(1);
    } finally {
        cleanup();
    }
}

runTest();