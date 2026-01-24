/**
 * autocomplete_test.ts
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Balanced Scale (TDD)
 *
 * Intent:
 * Verifies AutocompleteService logic.
 */

import { FileSystem } from '../src/domain/entities/FileSystem';
import { FileSystemService } from '../src/domain/services/FileSystemService';
import { AutocompleteService } from '../src/domain/services/AutocompleteService';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

function runTest(name: string, fn: () => void) {
    try {
        process.stdout.write(`Testing ${name.padEnd(50)}: `);
        fn();
        console.log(`${GREEN}PASS${RESET}`);
    } catch (e: any) {
        console.log(`${RED}FAIL${RESET}`);
        console.error(`  ${e.message}`);
        process.exit(1);
    }
}

function main() {
    console.log("--- AutocompleteService Tests ---");

    const fs = new FileSystem();
    const fsService = new FileSystemService(fs);
    const service = new AutocompleteService(fsService);

    runTest('Command Completion (Partial)', () => {
        const suggestion = service.getSuggestion('he', '/');
        if (suggestion !== 'lp') throw new Error(`Expected 'lp', got '${suggestion}'`);
    });

    runTest('Command Completion (Full Match)', () => {
        const suggestion = service.getSuggestion('help', '/');
        if (suggestion !== '') throw new Error(`Expected '', got '${suggestion}'`);
    });

    runTest('Command Completion (Unknown)', () => {
        const suggestion = service.getSuggestion('xyz', '/');
        if (suggestion !== '') throw new Error(`Expected '', got '${suggestion}'`);
    });

    runTest('File Completion (ls)', () => {
        // Setup
        fsService.writeFile('/home/operator/notes.txt', 'data');

        const suggestion = service.getSuggestion('ls not', '/home/operator');
        if (suggestion !== 'es.txt') throw new Error(`Expected 'es.txt', got '${suggestion}'`);
    });

    runTest('File Completion (cat)', () => {
        const suggestion = service.getSuggestion('cat not', '/home/operator');
        if (suggestion !== 'es.txt') throw new Error(`Expected 'es.txt', got '${suggestion}'`);
    });

    runTest('File Completion (Empty/No Match)', () => {
        const suggestion = service.getSuggestion('cat zzz', '/home/operator');
        if (suggestion !== '') throw new Error(`Expected '', got '${suggestion}'`);
    });

    runTest('Tutor Safety (Service ignores state)', () => {
        // Service is pure logic, doesn't know about tutor state.
        // VM handles the suppression.
        // Just verify basic functionality works.
        const suggestion = service.getSuggestion('cle', '/');
        if (suggestion !== 'ar') throw new Error(`Service should work normally. Got '${suggestion}'`);
    });
}

main();
