
import { strict as assert } from 'assert';
import { ChgrpCommand } from '../../../src/domain/commands/core/ChgrpCommand';
import { FileSystem } from '../../../src/domain/entities/FileSystem';
import { createInitialTerminalState } from '../../../src/domain/entities/TerminalState';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

async function runTests() {
    console.log('Running MoreFile Tests...\n');
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

    const chgrp = new ChgrpCommand(fs);

    // --- Chgrp ---
    await runTest('chgrp changes group', async () => {
        fs.writeFile('/file', 'content', 'w');
        const res = await chgrp.execute(['newgroup', '/file'], state);
        assert.equal(res.exitCode, 0);
        // Verify? Need stat. We assume success if 0 exit.
        // Or check inode if we can access it (unit test privilege).
        const node = fs.resolveNode('/file');
        const inode = fs.getInode(node!.inodeId);
        assert.equal(inode!.gid, 1000); // Wait, newgroup is string. FS uses numbers usually.
        // ChgrpCommand should resolve group name to gid.
        // If no group DB, use gid directly or fail?
        // Standard chgrp accepts ID.
    });

    await runTest('chgrp accepts numeric gid', async () => {
        const res = await chgrp.execute(['2000', '/file'], state);
        assert.equal(res.exitCode, 0);
        const node = fs.resolveNode('/file');
        const inode = fs.getInode(node!.inodeId);
        assert.equal(inode!.gid, 2000);
    });

    console.log(`\nResults: ${passed} Passed, ${failed} Failed`);
    if (failed > 0) process.exit(1);
}

runTests().catch(console.error);
