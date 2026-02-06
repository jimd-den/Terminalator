import * as fs from 'fs';
import * as path from 'path';
import { mapFileStructure, FileNode } from './audit_structure';

const TEST_DIR = path.join(__dirname, 'temp_audit_test_dir');

function setupTestDir() {
    if (fs.existsSync(TEST_DIR)) {
        fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(TEST_DIR);
    fs.mkdirSync(path.join(TEST_DIR, 'subdir'));
    fs.writeFileSync(path.join(TEST_DIR, 'file1.ts'), 'content');
    fs.writeFileSync(path.join(TEST_DIR, 'subdir', 'file2.ts'), 'content');
}

function cleanupTestDir() {
    if (fs.existsSync(TEST_DIR)) {
        fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
}

function runTests() {
    console.log("Running Audit Structure Tests...");
    setupTestDir();

    try {
        const result = mapFileStructure(TEST_DIR);

        // Basic assertions
        if (result.name !== 'temp_audit_test_dir') throw new Error(`Expected root name 'temp_audit_test_dir', got '${result.name}'`);
        if (result.type !== 'directory') throw new Error("Root should be a directory");
        if (!result.children) throw new Error("Root should have children");

        const file1 = result.children.find((c: FileNode) => c.name === 'file1.ts');
        if (!file1) throw new Error("file1.ts not found");
        if (file1.type !== 'file') throw new Error("file1.ts should be a file");

        const subdir = result.children.find((c: FileNode) => c.name === 'subdir');
        if (!subdir) throw new Error("subdir not found");
        if (subdir.type !== 'directory') throw new Error("subdir should be a directory");

        const file2 = subdir.children?.find((c: FileNode) => c.name === 'file2.ts');
        if (!file2) throw new Error("file2.ts not found in subdir");

        console.log("PASS: File structure mapping is correct.");

    } catch (error) {
        console.error("FAIL:", error);
        process.exit(1);
    } finally {
        cleanupTestDir();
    }
}

runTests();