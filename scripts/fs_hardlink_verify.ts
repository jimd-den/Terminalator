/**
 * fs_hardlink_verify.ts
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Balanced Scale (Verification)
 *
 * Intent:
 * Verifies that the Composite Pattern refactor maintains POSIX hard link semantics.
 * Specifically checks that content changes reflect across all links (shared Inode).
 */

import { FileSystem } from '../src/domain/entities/FileSystem';
import { FileSystemService } from '../src/domain/services/FileSystemService';
import { S_IFDIR, S_IFREG } from '../src/domain/entities/FileSystem';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

function runVerify() {
    console.log("--- Hard Link Verification ---");

    // Setup
    const fs = new FileSystem();
    const service = new FileSystemService(fs);

    try {
        // 1. Create File 1
        console.log("1. Creating file1...");
        service.writeFile('/file1', 'initial data');
        const content1 = service.readFile('/file1');
        if (content1 !== 'initial data') throw new Error('Initial write failed');

        // 2. Create Hard Link
        console.log("2. Creating hard link link1 -> file1...");
        service.link('/file1', '/link1');

        // Check link content
        const linkContent = service.readFile('/link1');
        if (linkContent !== 'initial data') throw new Error('Link content mismatch');

        // Check Inode ID Identity
        const dentry1 = service.resolve('/file1');
        const dentry2 = service.resolve('/link1');
        if (dentry1?.inodeId !== dentry2?.inodeId) throw new Error('Inode IDs do not match (Not a hard link)');
        console.log(`   Inode Match: ${dentry1?.inodeId} == ${dentry2?.inodeId}`);

        // 3. Modify File 1
        console.log("3. Modifying file1...");
        service.writeFile('/file1', 'modified data');

        // 4. Verify Link 1 Reflects Change
        console.log("4. verifying link1 content...");
        const linkContentNew = service.readFile('/link1');
        if (linkContentNew !== 'modified data') throw new Error(`Link content stale! Expected 'modified data', got '${linkContentNew}'`);
        console.log(`${GREEN}PASS: Shared state confirmed.${RESET}`);

        // 5. Delete Original
        console.log("5. Deleting file1...");
        service.deleteNode('/file1');

        // 6. Verify Link 1 Persists
        const linkContentFinal = service.readFile('/link1');
        if (linkContentFinal !== 'modified data') throw new Error('Link lost data after original deletion');

        // Verify Link Count
        const inode = service.getInode(dentry2!.inodeId);
        if (inode!.links !== 1) throw new Error(`Link count wrong. Expected 1, got ${inode!.links}`);
        console.log(`${GREEN}PASS: Persistence confirmed. Link count: ${inode!.links}${RESET}`);

    } catch (e: any) {
        console.error(`${RED}FAIL: ${e.message}${RESET}`);
        process.exit(1);
    }
}

runVerify();
