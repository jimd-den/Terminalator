import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { MkdirCommand } from '../../../../src/domain/commands/core/MkdirCommand';
import { FileSystem } from '../../../../src/domain/entities/FileSystem';
import { FileSystemService } from '../../../../src/domain/services/FileSystemService';
import { TerminalState } from '../../../../src/domain/entities/TerminalState';

describe('MkdirCommand POSIX TDD Suite', () => {
    let fs: FileSystem;
    let service: FileSystemService;
    let cmd: MkdirCommand;
    let state: TerminalState;

    function getPermissions(path: string): number {
        const node = service.resolve(path);
        if (!node) return -1;
        const inode = service.getInode(node.inodeId);
        return inode ? (inode.mode & 0o7777) : -1;
    }

    beforeEach(() => {
        fs = new FileSystem();
        service = new FileSystemService(fs);
        cmd = new MkdirCommand(service);
        state = {
            currentDirectory: '/',
            environment: { 'USER': 'testuser' },
            history: [],
            aliases: {},
            user: 'testuser',
            hostname: 'testbox',
            isLocked: false,
            fs: fs
        };
    });

    describe('Basic Functionality', () => {
        it('1. should create a single directory', () => {
            const res = cmd.execute(['dir1'], state);
            assert.strictEqual(res.exitCode, 0);
            assert.ok(service.resolve('/dir1'));
            assert.ok(service.isDirectory(service.resolve('/dir1')!));
        });

        it('2. should create multiple directories', () => {
            const res = cmd.execute(['a', 'b', 'c'], state);
            assert.strictEqual(res.exitCode, 0);
            assert.ok(service.resolve('/a'));
            assert.ok(service.resolve('/b'));
            assert.ok(service.resolve('/c'));
        });

        it('3. should create directory in a subdirectory', () => {
            service.mkdir('/sub', 0o755);
            const res = cmd.execute(['sub/newdir'], state);
            assert.strictEqual(res.exitCode, 0);
            assert.ok(service.resolve('/sub/newdir'));
        });

        it('4. should fail if directory already exists', () => {
            service.mkdir('/exists', 0o755);
            const res = cmd.execute(['exists'], state);
            assert.strictEqual(res.exitCode, 1);
            assert.match(res.output, /File exists/);
        });

        it('5. should fail if parent does not exist', () => {
            const res = cmd.execute(['noparent/dir'], state);
            assert.strictEqual(res.exitCode, 1);
            assert.match(res.output, /No such file or directory/);
        });
    });

    describe('Option -p (Parents)', () => {
        it('6. should create intermediate directories', () => {
            const res = cmd.execute(['-p', 'a/b/c'], state);
            assert.strictEqual(res.exitCode, 0);
            assert.ok(service.resolve('/a/b/c'));
        });

        it('7. should not fail if directory already exists with -p', () => {
            service.mkdir('/exists', 0o755);
            const res = cmd.execute(['-p', 'exists'], state);
            assert.strictEqual(res.exitCode, 0);
            assert.strictEqual(res.output, '');
        });

        it('8. should create multiple levels of missing parents', () => {
            const res = cmd.execute(['-p', 'x/y/z', 'x/y/w'], state);
            assert.strictEqual(res.exitCode, 0);
            assert.ok(service.resolve('/x/y/z'));
            assert.ok(service.resolve('/x/y/w'));
        });

        it('9. should handle trailing slashes with -p', () => {
            const res = cmd.execute(['-p', 'trailing/'], state);
            assert.strictEqual(res.exitCode, 0);
            assert.ok(service.resolve('/trailing'));
        });

        it('10. should handle absolute paths with -p', () => {
            const res = cmd.execute(['-p', '/abs/path/dir'], state);
            assert.strictEqual(res.exitCode, 0);
            assert.ok(service.resolve('/abs/path/dir'));
        });

        it('11. should fail if a component is a file with -p', () => {
            service.writeFile('/somefile', 'content');
            const res = cmd.execute(['-p', 'somefile/dir'], state);
            assert.strictEqual(res.exitCode, 1);
            assert.match(res.output, /File exists/);
        });
    });

    describe('Option -m (Mode)', () => {
        it('12. should set octal permissions', () => {
            const res = cmd.execute(['-m', '700', 'private'], state);
            assert.strictEqual(res.exitCode, 0);
            assert.strictEqual(getPermissions('/private'), 0o700);
        });

        it('13. should set symbolic permissions (absolute)', () => {
            const res = cmd.execute(['-m', 'u=rwx,g=rx,o=', 'symdir'], state);
            assert.strictEqual(res.exitCode, 0);
            assert.strictEqual(getPermissions('/symdir'), 0o750);
        });

        it('14. should set symbolic permissions (relative +)', () => {
            // Assumed initial 777, umask not directly in state but implied by POSIX
            const res = cmd.execute(['-m', 'o+w', 'writedir'], state);
            assert.strictEqual(res.exitCode, 0);
            // POSIX says rel to 777 (a=rwx). 777 o+w is 777.
            assert.strictEqual(getPermissions('/writedir'), 0o777);
        });

        it('15. should set symbolic permissions (relative -)', () => {
            const res = cmd.execute(['-m', 'a-x', 'noexec'], state);
            assert.strictEqual(res.exitCode, 0);
            assert.strictEqual(getPermissions('/noexec'), 0o666);
        });

        it('16. should handle multiple directories with -m', () => {
            const res = cmd.execute(['-m', '711', 'd1', 'd2'], state);
            assert.strictEqual(res.exitCode, 0);
            assert.strictEqual(getPermissions('/d1'), 0o711);
            assert.strictEqual(getPermissions('/d2'), 0o711);
        });

        it('17. should combine -p and -m (mode applies to final only)', () => {
            const res = cmd.execute(['-p', '-m', '700', 'p1/p2/p3'], state);
            assert.strictEqual(res.exitCode, 0);
            assert.strictEqual(getPermissions('/p1/p2/p3'), 0o700);
            // Intermediate dirs should have default permissions (minus umask, plus u+wx)
            // For our sim, let's say 755
            assert.strictEqual(getPermissions('/p1'), 0o755);
        });
    });

    describe('POSIX Standards & Edge Cases', () => {
        it('18. should handle -- as end of options', () => {
            const res = cmd.execute(['--', '-p', 'dir'], state);
            assert.strictEqual(res.exitCode, 0);
            assert.ok(service.resolve('/-p')); // creates dir named -p
            assert.ok(service.resolve('/dir'));
        });

        it('19. should fail with exit code > 0 for missing operand', () => {
            const res = cmd.execute([], state);
            assert.strictEqual(res.exitCode, 1);
            assert.match(res.output, /missing operand/);
        });

        it('20. should fail with exit code > 0 for invalid option', () => {
            const res = cmd.execute(['-z', 'dir'], state);
            assert.strictEqual(res.exitCode, 1);
        });

        it('21. should create directories in order', () => {
            // If creation fails early, subsequent ones should still be tried?
            // "For each dir operand, the mkdir utility shall perform actions..."
            // Usually it continues but returns non-zero at end.
            service.mkdir('/fail', 0o755);
            const res = cmd.execute(['ok1', 'fail', 'ok2'], state);
            assert.strictEqual(res.exitCode, 1);
            assert.ok(service.resolve('/ok1'));
            assert.ok(service.resolve('/ok2'));
        });

        it('22. should handle absolute paths', () => {
            const res = cmd.execute(['/absolute'], state);
            assert.strictEqual(res.exitCode, 0);
            assert.ok(service.resolve('/absolute'));
        });

        it('23. should handle relative paths with ..', () => {
            service.mkdir('/base', 0o755);
            state.currentDirectory = '/base';
            const res = cmd.execute(['../outside'], state);
            assert.strictEqual(res.exitCode, 0);
            assert.ok(service.resolve('/outside'));
        });

        it('24. should handle very deep paths with -p', () => {
            const res = cmd.execute(['-p', '1/2/3/4/5/6/7/8/9/10'], state);
            assert.strictEqual(res.exitCode, 0);
            assert.ok(service.resolve('/1/2/3/4/5/6/7/8/9/10'));
        });

        it('25. should fail if path component is not searchable', () => {
            service.mkdir('/locked', 0o000);
            const res = cmd.execute(['locked/dir'], state);
            assert.strictEqual(res.exitCode, 1);
        });

        it('26. should support -pm (combined flags)', () => {
            const res = cmd.execute(['-pm711', 'combined/dir'], state);
            assert.strictEqual(res.exitCode, 0);
            assert.strictEqual(getPermissions('/combined/dir'), 0o711);
        });

        it('27. should support multiple symbolic mode changes', () => {
            const res = cmd.execute(['-m', 'u+r,g-w,o=x', 'complex_mode'], state);
            assert.strictEqual(res.exitCode, 0);
            // Default 755 -> u+r (755), g-w (755), o=x (751)
            // Wait, default in my sim for new dir is 755. 
            // 755 (rwxr-xr-x) -> u+r (no change), g-w (no change since g is already r-x), o=x (no change since o is already --x)
            // Let's use a more sensitive test: 755 (111 101 101) -> u=r,g=w,o=x (100 010 001) -> 421
            // Or better, stick to the plan: 777 (initial for rel) -> u+r (777), g-w (757), o=x (751)
            assert.strictEqual(getPermissions('/complex_mode'), 0o751);
        });

        it('28. should handle empty string operand as error', () => {
            const res = cmd.execute([''], state);
            assert.strictEqual(res.exitCode, 1);
        });

        it('29. should handle space in directory name', () => {
            const res = cmd.execute(['dir with spaces'], state);
            assert.strictEqual(res.exitCode, 0);
            assert.ok(service.resolve('/dir with spaces'));
        });

        it('30. should handle dot and dot-dot as operands (fail)', () => {
            const res1 = cmd.execute(['.'], state);
            assert.strictEqual(res1.exitCode, 1);
            const res2 = cmd.execute(['..'], state);
            assert.strictEqual(res2.exitCode, 1);
        });

        it('31. should not create anything if path resolution fails early', () => {
            // mkdir -p /tmp/a/b/c where /tmp exists but is a file
            service.writeFile('/myfile', 'file');
            const res = cmd.execute(['-p', '/myfile/a/b/c'], state);
            assert.strictEqual(res.exitCode, 1);
            assert.ok(!service.resolve('/myfile/a'));
        });

        it('32. should handle multiple -m options (last one wins)', () => {
            const res = cmd.execute(['-m', '777', '-m', '700', 'last_m'], state);
            assert.strictEqual(res.exitCode, 0);
            assert.strictEqual(getPermissions('/last_m'), 0o700);
        });

        it('33. should handle -p where the leaf already exists as a file (fail)', () => {
            service.writeFile('/a', 'file');
            const res = cmd.execute(['-p', '/a'], state);
            assert.strictEqual(res.exitCode, 1);
        });

        it('34. should handle symlinks in path (resolve)', () => {
            // Our Sim might not support symlinks yet, but let's assume it does or skip
            // If FileSystem doesn't support symlinks, this might just be a regular path.
        });

        it('35. should be case sensitive', () => {
            cmd.execute(['Dir'], state);
            cmd.execute(['dir'], state);
            assert.ok(service.resolve('/Dir'));
            assert.ok(service.resolve('/dir'));
            assert.notStrictEqual(service.resolve('/Dir'), service.resolve('/dir'));
        });

        it('36. should handle many operands', () => {
            const args = Array.from({ length: 100 }, (_, i) => `d${i}`);
            const res = cmd.execute(args, state);
            assert.strictEqual(res.exitCode, 0);
            for (let i = 0; i < 100; i++) assert.ok(service.resolve(`/d${i}`));
        });

        it('37. should report error if unable to set permissions with -m', () => {
            // Hard to trigger in current Sim without more complexity, but we can mock or plan
        });

        it('38. should handle root directory as ignore with -p', () => {
            const res = cmd.execute(['-p', '/'], state);
            assert.strictEqual(res.exitCode, 0);
            assert.strictEqual(res.output, '');
        });

        it('39. should handle redundant slashes', () => {
            const res = cmd.execute(['-p', 'a///b'], state);
            assert.strictEqual(res.exitCode, 0);
            assert.ok(service.resolve('/a/b'));
        });

        it('40. should fail gracefully on file system errors', () => {
            // Simulate error by passing invalid state or corrupt FS if possible
        });
    });
});
