
import { strict as assert } from 'assert';
import { RmdirCommand } from '../../../src/domain/commands/core/RmdirCommand';
import { LinkCommand } from '../../../src/domain/commands/core/LinkCommand';
import { UnlinkCommand } from '../../../src/domain/commands/core/UnlinkCommand';
import { ReadlinkCommand } from '../../../src/domain/commands/core/ReadlinkCommand';
import { RealpathCommand } from '../../../src/domain/commands/core/RealpathCommand';
import { FileSystem } from '../../../src/domain/entities/FileSystem';
import { createInitialTerminalState } from '../../../src/domain/entities/TerminalState';

// Helper for colored output
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

async function runTests() {
    console.log('Running FileOps Tests...\n');
    let passed = 0;
    let failed = 0;

    const runTest = async (name: string, fn: () => Promise<void> | void) => {
        try {
            await fn();
            console.log(`${GREEN}[PASS]${RESET} ${name}`);
            passed++;
        } catch (e: any) {
            console.log(`${RED}[FAIL]${RESET} ${name}`);
            console.error(e.message);
            failed++;
        }
    };

    const fs = new FileSystem();
    const state = createInitialTerminalState();

    const rmdir = new RmdirCommand(fs);
    const link = new LinkCommand(fs);
    const unlink = new UnlinkCommand(fs);
    const readlink = new ReadlinkCommand(fs);
    const realpath = new RealpathCommand(fs);

    // --- Rmdir ---
    await runTest('rmdir removes empty directory', async () => {
        fs.mkdir('/empty_dir', 0o755);
        const res = await rmdir.execute(['/empty_dir'], state);
        assert.equal(res.exitCode, 0);
        try {
            fs.resolveNode('/empty_dir');
            assert.fail('Directory should be gone');
        } catch (e) {
            // Expected
        }
    });

    await runTest('rmdir fails on non-empty directory', async () => {
        fs.mkdir('/full_dir', 0o755);
        fs.writeFile('/full_dir/file', 'content', 'w');
        const res = await rmdir.execute(['/full_dir'], state);
        assert.equal(res.exitCode, 1);
        assert.ok(res.output.includes('Directory not empty') || res.output.includes('failed'));
    });

    // --- Link (Hard Link) ---
    await runTest('link creates hard link', async () => {
        fs.writeFile('/source_file', 'data', 'w');
        // link source target
        // Note: fs.link support needed? InodeTable supports multiple dentries pointing to same inode?
        // Yes, FileSystem creates dentry.
        const res = await link.execute(['/source_file', '/hard_link'], state);
        assert.equal(res.exitCode, 0);

        const content = fs.readFile('/hard_link');
        assert.equal(content, 'data');
    });

    // --- Unlink ---
    await runTest('unlink removes file', async () => {
        fs.writeFile('/unlink_me', 'bye', 'w');
        const res = await unlink.execute(['/unlink_me'], state);
        assert.equal(res.exitCode, 0);
        try {
            fs.resolveNode('/unlink_me');
            assert.fail('File should be gone');
        } catch (e) {
            // Expected
        }
    });

    await runTest('unlink fails on directory', async () => {
        fs.mkdir('/dir_unlink', 0o755);
        const res = await unlink.execute(['/dir_unlink'], state);
        assert.equal(res.exitCode, 1);
    });

    // --- Readlink ---
    await runTest('readlink reads symlink target', async () => {
        // Create symlink manually or via ln -s if we trust it, or fs.symlink if available?
        // FileSystem has no explicit symlink method in interface, but `ln -s` works via `LnCommand`.
        // Let's assume we can use `ln -s` via FS manipulation or `LnCommand`.
        // Since we are unit testing `ReadlinkCommand`, we need a symlink.
        // `FileSystem.ts` has `createDentry`? `LnCommand` uses `fs.createSymlink` if it exists?
        // Let's check `LnCommand` implementation or `FileSystem`.
        // If `FileSystem` supports symlinks, we can hack it or use `ln` command instance if needed.
        // For strict unit test of just Readlink, we need to set up state.
        // I'll assume `ln -s` works because `posix_suite` passed `ln -s`.
        // I will use `LnCommand` to create the link for this test setup.

        // Wait, I can't import LnCommand easily if I want to keep this pure?
        // I can instantiate it if I import it. Or just rely on FS capabilities if exposed.
        // `fs.symlink` might not be exposed on `FileSystem` class directly?
        // Let's look at `LnCommand` later. For now, I'll assume `fs` has a way or I'll create one.
        // Actually, `FileSystem` usually has `createSymlink` or similar.
        // I'll try to use a "mock" or just skip setup if hard? No, must test.
        // I will import `LnCommand` for setup.
        const { LnCommand } = require('../../../src/domain/commands/core/LnCommand');
        const ln = new LnCommand(fs);
        await ln.execute(['-s', '/target', '/mysylink'], state);

        const res = await readlink.execute(['/mysylink'], state);
        assert.equal(res.output, '/target');
    });

    // --- Realpath ---
    await runTest('realpath resolves path', async () => {
        // /dir/../file -> /file
        const res = await realpath.execute(['/home/operator/../operator'], state);
        assert.equal(res.output, '/home/operator');
    });

    console.log(`\nResults: ${passed} Passed, ${failed} Failed`);
    if (failed > 0) process.exit(1);
}

runTests().catch(console.error);
