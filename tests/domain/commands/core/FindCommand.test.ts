import assert from 'node:assert';
import { describe, it, beforeEach } from 'node:test';
import { FindCommand } from '../../../../src/domain/commands/core/FindCommand';
import { FileSystem } from '../../../../src/domain/entities/FileSystem';
import { InodeTable } from '../../../../src/domain/entities/filesystem/InodeTable';
import { PathResolver } from '../../../../src/domain/services/filesystem/PathResolver';
import { createInitialTerminalState, TerminalState } from '../../../../src/domain/entities/TerminalState';

describe('FindCommand POSIX TDD Suite', () => {
    let fs: FileSystem;
    let cmd: FindCommand;
    let state: TerminalState;

    beforeEach(() => {
        fs = new FileSystem();
        cmd = new FindCommand(fs);
        state = {
            currentDirectory: '/',
            environment: { 'USER': 'operator' },
            history: [],
            aliases: {},
            user: 'operator',
            hostname: 'mainframe-01',
            isLocked: false,
            fs: fs
        };

        // Setup a test hierarchy
        // /root
        //   /a (dir)
        //     file1.txt (reg, 100 bytes)
        //     file2.log (reg, 200 bytes)
        //   /b (dir, perm 700)
        //     file3.txt (reg)
        //   link_to_a -> /root/a (symlink)
        //   empty_dir (dir)
        //   .hidden (reg)

        fs.mkdir('/root', 0o755);
        fs.mkdir('/root/a', 0o755);
        fs.createFile('/root/a/file1.txt', 0o644);
        fs.createFile('/root/a/file2.log', 0o644);
        fs.mkdir('/root/b', 0o700);
        fs.createFile('/root/b/file3.txt', 0o644);
        fs.symlink('/root/a', '/root/link_to_a');
        fs.mkdir('/root/empty_dir', 0o755);
        fs.createFile('/root/.hidden', 0o644);
    });

    const getOutputLines = (output: string) => output.split('\n').filter(l => l.length > 0).sort();

    describe('Basic Path Operands', () => {
        it('1. should find all files in a directory by default', () => {
            const res = cmd.execute(['/root/a'], state);
            assert.strictEqual(res.exitCode, 0);
            const lines = getOutputLines(res.output);
            assert.deepStrictEqual(lines, ['/root/a', '/root/a/file1.txt', '/root/a/file2.log']);
        });

        it('2. should support multiple path operands', () => {
            const res = cmd.execute(['/root/a', '/root/empty_dir'], state);
            assert.strictEqual(res.exitCode, 0);
            const lines = getOutputLines(res.output);
            assert.deepStrictEqual(lines, ['/root/a', '/root/a/file1.txt', '/root/a/file2.log', '/root/empty_dir']);
        });

        it('3. should use current directory if no path is provided', () => {
            state.currentDirectory = '/root/a';
            const res = cmd.execute([], state);
            assert.strictEqual(res.exitCode, 0);
            const lines = getOutputLines(res.output);
            assert.deepStrictEqual(lines, ['.', './file1.txt', './file2.log']);
        });
    });

    describe('Primaries: -name and -iname', () => {
        it('4. should filter by name using glob patterns', () => {
            const res = cmd.execute(['/root', '-name', '*.txt'], state);
            assert.strictEqual(res.exitCode, 0);
            const lines = getOutputLines(res.output);
            assert.deepStrictEqual(lines, ['/root/a/file1.txt', '/root/b/file3.txt']);
        });

        it('5. should be case-sensitive with -name', () => {
            fs.createFile('/root/FILE.TXT', 0o644);
            const res = cmd.execute(['/root', '-name', 'file*.txt'], state);
            const lines = getOutputLines(res.output);
            assert.deepStrictEqual(lines, ['/root/a/file1.txt', '/root/b/file3.txt']);
        });

        it('6. should be case-insensitive with -iname', () => {
            fs.createFile('/root/FILE.TXT', 0o644);
            const res = cmd.execute(['/root', '-iname', 'file*.txt'], state);
            const lines = getOutputLines(res.output);
            assert.ok(lines.includes('/root/FILE.TXT'));
            assert.ok(lines.includes('/root/a/file1.txt'));
        });

        it('7. should handle exact name matches', () => {
            const res = cmd.execute(['/root', '-name', 'file1.txt'], state);
            const lines = getOutputLines(res.output);
            assert.deepStrictEqual(lines, ['/root/a/file1.txt']);
        });

        it('8. should match hidden files if explicitly requested', () => {
            const res = cmd.execute(['/root', '-name', '.*'], state);
            const lines = getOutputLines(res.output);
            assert.deepStrictEqual(lines, ['/root/.hidden']);
        });
    });

    describe('Primaries: -type', () => {
        it('9. should filter directories with -type d', () => {
            const res = cmd.execute(['/root', '-type', 'd'], state);
            const lines = getOutputLines(res.output);
            assert.deepStrictEqual(lines, ['/root', '/root/a', '/root/b', '/root/empty_dir']);
        });

        it('10. should filter regular files with -type f', () => {
            const res = cmd.execute(['/root', '-type', 'f'], state);
            const lines = getOutputLines(res.output);
            assert.ok(lines.includes('/root/a/file1.txt'));
            assert.ok(!lines.includes('/root/a'));
        });

        it('11. should filter symlinks with -type l', () => {
            const res = cmd.execute(['/root', '-type', 'l'], state);
            const lines = getOutputLines(res.output);
            assert.deepStrictEqual(lines, ['/root/link_to_a']);
        });

        it('12. should handle unknown type with error', () => {
            const res = cmd.execute(['/root', '-type', 'z'], state);
            assert.notStrictEqual(res.exitCode, 0);
        });
    });

    describe('Primaries: -path', () => {
        it('13. should match full relative path with -path', () => {
            const res = cmd.execute(['/root', '-path', '/root/a/file*'], state);
            const lines = getOutputLines(res.output);
            assert.deepStrictEqual(lines, ['/root/a/file1.txt', '/root/a/file2.log']);
        });

        it('14. should be case sensitive with -path', () => {
            const res = cmd.execute(['/root', '-path', '/ROOT/a/*'], state);
            assert.strictEqual(getOutputLines(res.output).length, 0);
        });
    });

    describe('Operators: -a, -o, !, ( )', () => {
        it('15. should imply AND between primaries', () => {
            const res = cmd.execute(['/root', '-name', '*.txt', '-type', 'f'], state);
            const lines = getOutputLines(res.output);
            assert.deepStrictEqual(lines, ['/root/a/file1.txt', '/root/b/file3.txt']);
        });

        it('16. should support explicit -a', () => {
            const res = cmd.execute(['/root', '-name', '*.txt', '-a', '-type', 'f'], state);
            const lines = getOutputLines(res.output);
            assert.deepStrictEqual(lines, ['/root/a/file1.txt', '/root/b/file3.txt']);
        });

        it('17. should support OR with -o', () => {
            const res = cmd.execute(['/root', '-name', '*.txt', '-o', '-name', '*.log'], state);
            const lines = getOutputLines(res.output);
            assert.deepStrictEqual(lines, ['/root/a/file1.txt', '/root/a/file2.log', '/root/b/file3.txt']);
        });

        it('18. should support negation with !', () => {
            const res = cmd.execute(['/root/a', '!', '-name', '*.log'], state);
            const lines = getOutputLines(res.output);
            assert.deepStrictEqual(lines, ['/root/a', '/root/a/file1.txt']);
        });

        it('19. should support parentheses for grouping', () => {
            const res = cmd.execute(['/root/a', '(', '-name', '*.txt', '-o', '-name', '*.log', ')'], state);
            const lines = getOutputLines(res.output);
            assert.deepStrictEqual(lines, ['/root/a/file1.txt', '/root/a/file2.log']);
        });

        it('20. should respect precedence: ! > -a > -o', () => {
            // !A -o B -a C  =>  (!A) -o (B -a C)
            const res = cmd.execute(['/root/a', '!', '-name', 'file1.txt', '-o', '-type', 'f', '-name', 'file*.txt'], state);
            // !file1.txt: /root/a, /root/a/file2.log
            // f AND file*.txt: /root/a/file1.txt
            // Result: all three
            const lines = getOutputLines(res.output);
            assert.deepStrictEqual(lines, ['/root/a', '/root/a/file1.txt', '/root/a/file2.log']);
        });

        it('21. should fail on unbalanced parentheses', () => {
            const res = cmd.execute(['/root', '(', '-name', '*.txt'], state);
            assert.notStrictEqual(res.exitCode, 0);
        });

        it('22. should fail on missing operator operand', () => {
            const res = cmd.execute(['/root', '-name', '*.txt', '-o'], state);
            assert.notStrictEqual(res.exitCode, 0);
        });
    });

    describe('Numeric Primaries: -size, -atime, -mtime, -ctime', () => {
        it('23. should filter by size in blocks (512b) by default', () => {
            // file1.txt: 100 bytes -> 1 block
            // file2.log: 200 bytes -> 1 block
            // Need a bigger file
            const inodeTable = (fs as any).inodeTable;
            const inode = inodeTable.allocate(0o644, 0, 0);
            inode.size = 1000; // 2 blocks
            fs.mkdir('/root/big', 0o755);
            (fs.resolveNode('/root/big') as any).children.set('bigfile', { name: 'bigfile', inodeId: inode.id, parent: fs.resolveNode('/root/big'), children: new Map() });

            const res = cmd.execute(['/root/big', '-size', '2'], state);
            const lines = getOutputLines(res.output);
            assert.deepStrictEqual(lines, ['/root/big/bigfile']);
        });

        it('24. should support size in bytes with "c" suffix', () => {
            // file1.txt is 0 in sim unless content is written
            (fs as any).getInode(fs.resolveNode('/root/a/file1.txt')!.inodeId)!.size = 100;
            const res = cmd.execute(['/root/a', '-size', '100c'], state);
            const lines = getOutputLines(res.output);
            assert.deepStrictEqual(lines, ['/root/a/file1.txt']);
        });

        it('25. should support +n and -n for size', () => {
            (fs as any).getInode(fs.resolveNode('/root/a/file1.txt')!.inodeId)!.size = 100;
            (fs as any).getInode(fs.resolveNode('/root/a/file2.log')!.inodeId)!.size = 200;

            const res = cmd.execute(['/root/a', '-size', '+150c'], state);
            assert.deepStrictEqual(getOutputLines(res.output), ['/root/a/file2.log']);

            const res2 = cmd.execute(['/root/a', '-size', '-150c'], state);
            assert.deepStrictEqual(getOutputLines(res2.output), ['/root/a', '/root/a/file1.txt']);
        });

        it('26. should support -mtime for modification days', () => {
            const now = Date.now();
            const oneDay = 86400 * 1000;
            const inode1 = (fs as any).getInode(fs.resolveNode('/root/a/file1.txt')!.inodeId);
            inode1.mtime = now - (2 * oneDay) - 1000; // > 2 days

            const res = cmd.execute(['/root/a', '-mtime', '+1'], state);
            assert.ok(getOutputLines(res.output).includes('/root/a/file1.txt'));
        });
    });

    describe('Primaries: -perm', () => {
        it('27. should match exact octal permissions', () => {
            const res = cmd.execute(['/root', '-perm', '700'], state);
            const lines = getOutputLines(res.output);
            assert.deepStrictEqual(lines, ['/root/b']);
        });

        it('28. should match bits with -perm -mode', () => {
            // /root/a is 755. Should match -211 (at least --x--x--x)
            const res = cmd.execute(['/root', '-perm', '-111'], state);
            const lines = getOutputLines(res.output);
            assert.ok(lines.includes('/root/a'));
            assert.ok(lines.includes('/root/b'));
        });
    });

    describe('Primaries: -user and -group', () => {
        it('29. should filter by user name', () => {
            const inode = (fs as any).getInode(fs.resolveNode('/root/a/file1.txt')!.inodeId);
            inode.uid = 1001; // Not root
            // Sim might need a way to map UIDs to names for this to work fully
            // For now, let's assume we can match UID if name fails
            const res = cmd.execute(['/root', '-user', '1001'], state);
            assert.deepStrictEqual(getOutputLines(res.output), ['/root/a/file1.txt']);
        });

        it('30. should support -nouser', () => {
            // If UID doesn't exist in /etc/passwd
            const inode = (fs as any).getInode(fs.resolveNode('/root/a/file1.txt')!.inodeId);
            inode.uid = 9999;
            const res = cmd.execute(['/root', '-nouser'], state);
            assert.ok(getOutputLines(res.output).includes('/root/a/file1.txt'));
        });
    });

    describe('Traversal Control: -depth, -prune, -xdev', () => {
        it('31. should visit children before parents with -depth', () => {
            const res = cmd.execute(['/root/a', '-depth'], state);
            const lines = res.output.split('\n').filter(l => l.length > 0);
            // /root/a should be LAST
            assert.strictEqual(lines[lines.length - 1], '/root/a');
        });

        it('32. should not descend with -prune', () => {
            const res = cmd.execute(['/root', '-name', 'a', '-prune', '-o', '-print'], state);
            const lines = getOutputLines(res.output);
            // Should contain /root/a but NOT /root/a/file1.txt
            assert.ok(lines.includes('/root/a'));
            assert.ok(!lines.includes('/root/a/file1.txt'));
        });

        it('33. should stay within same device with -xdev/-mount (stub)', () => {
            // Our sim uses one device, so -xdev should just be true
            const res = cmd.execute(['/root', '-xdev'], state);
            assert.strictEqual(res.exitCode, 0);
        });

        it('34. should handle symlink resolution options -H and -L', () => {
            // Default: don't follow
            const res1 = cmd.execute(['/root/link_to_a'], state);
            assert.deepStrictEqual(getOutputLines(res1.output), ['/root/link_to_a']);

            // -L: follow
            const res2 = cmd.execute(['-L', '/root/link_to_a'], state);
            assert.ok(getOutputLines(res2.output).includes('/root/link_to_a/file1.txt'));
        });
    });

    describe('Actions: -print, -print0, -exec', () => {
        it('35. should support -print0', () => {
            const res = cmd.execute(['/root/a', '-print0'], state);
            assert.ok(res.output.includes('\0'));
            const parts = res.output.split('\0').filter(p => p.length > 0).sort();
            assert.deepStrictEqual(parts, ['/root/a', '/root/a/file1.txt', '/root/a/file2.log']);
        });

        it('36. should support -exec with ; terminator', () => {
            // Mock exec? For now, let's just test it parses.
            // In our environment, -exec might be a stub or trigger a real command execution
            const res = cmd.execute(['/root/a/file1.txt', '-exec', 'ls', '{}', ';'], state);
            assert.strictEqual(res.exitCode, 0);
        });

        it('37. should support -exec with + terminator', () => {
            const res = cmd.execute(['/root/a', '-exec', 'ls', '{}', '+'], state);
            assert.strictEqual(res.exitCode, 0);
        });
    });

    describe('Edge Cases & Standards', () => {
        it('38. should handle redundant slashes in paths', () => {
            const res = cmd.execute(['/root///a/'], state);
            const lines = getOutputLines(res.output);
            assert.ok(lines.includes('/root///a/file1.txt'));
        });

        it('39. should detect infinite loops in symlinks', () => {
            fs.mkdir('/root/loop', 0o755);
            fs.symlink('/root/loop', '/root/loop/child_link');
            const res = cmd.execute(['-L', '/root/loop'], state);
            // Should not crash, should report error to stderr (captured in output string in our sim)
            assert.ok(res.output.toLowerCase().includes('loop') || res.exitCode !== 0);
        });

        it('40. should fail gracefully on unresolvable paths', () => {
            const res = cmd.execute(['/nonexistent'], state);
            assert.notStrictEqual(res.exitCode, 0);
            assert.ok(res.output.includes('No such file or directory'));
        });
    });
});
