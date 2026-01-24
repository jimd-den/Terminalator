/**
 * fs_composite_test.ts
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Balanced Scale (TDD)
 *
 * Intent:
 * Unit tests for the new Virtual File System (Composite Pattern) classes.
 * Verifies that DirectoryNode and FileNode behave structurally correct BEFORE integration.
 */

import { DirectoryNode } from '../src/domain/entities/filesystem/DirectoryNode';
import { FileNode } from '../src/domain/entities/filesystem/FileNode';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';
const BLUE = '\x1b[34m';

function runTest(name: string, fn: () => void) {
    try {
        process.stdout.write(`Testing ${name.padEnd(50)}: `);
        fn();
        console.log(`${GREEN}PASS${RESET}`);
    } catch (e: any) {
        console.log(`${RED}FAIL${RESET}`);
        console.error(e.message);
        process.exit(1);
    }
}

function main() {
    console.log(`${BLUE}--- FileSystem Composite Pattern Tests ---${RESET}`);

    runTest('DirectoryNode Construction', () => {
        const root = new DirectoryNode('/', 1);
        if (root.name !== '/') throw new Error('Root name mismatch');
        if (root.inodeId !== 1) throw new Error('Root inode mismatch');
        if (root.isDirectory() !== true) throw new Error('Root should be directory');
    });

    runTest('Add Child (File)', () => {
        const root = new DirectoryNode('/', 1);
        const file = new FileNode('test.txt', 2);
        root.addChild(file);

        if (root.children.size !== 1) throw new Error('Child count incorrect');
        if (file.parent !== root) throw new Error('Parent pointer not set');
        if (root.getChild('test.txt') !== file) throw new Error('Child retrieval failed');
    });

    runTest('Add Child (Directory)', () => {
        const root = new DirectoryNode('/', 1);
        const home = new DirectoryNode('home', 2);
        root.addChild(home);

        if (root.getChild('home') !== home) throw new Error('Directory child retrieval failed');
        if (home.parent !== root) throw new Error('Directory parent pointer incorrect');
    });

    runTest('Remove Child', () => {
        const root = new DirectoryNode('/', 1);
        const file = new FileNode('foo', 2);
        root.addChild(file);

        const removed = root.removeChild('foo');
        if (!removed) throw new Error('Remove returned false');
        if (root.children.has('foo')) throw new Error('Child still exists after remove');
    });

    runTest('Tree Structure (Nested)', () => {
        // / -> home -> operator -> .bashrc
        const root = new DirectoryNode('/', 1);
        const home = new DirectoryNode('home', 2);
        const operator = new DirectoryNode('operator', 3);
        const bashrc = new FileNode('.bashrc', 4);

        root.addChild(home);
        home.addChild(operator);
        operator.addChild(bashrc);

        const retrievedHome = root.getChild('home') as DirectoryNode;
        const retrievedOperator = retrievedHome.getChild('operator') as DirectoryNode;
        const retrievedFile = retrievedOperator.getChild('.bashrc');

        if (retrievedFile !== bashrc) throw new Error('Deep retrieval failed');
        if (retrievedFile?.parent?.parent?.parent !== root) throw new Error('Deep parent traversal failed');
    });

    console.log(`${BLUE}--- All Tests Passed ---${RESET}`);
}

main();
