import { describe, it, before, beforeEach } from 'node:test';
import assert from 'node:assert';
import { SedCommand } from '../../../../src/domain/commands/core/SedCommand';
import { FileSystem } from '../../../../src/domain/entities/FileSystem';
import { createInitialTerminalState, TerminalState } from '../../../../src/domain/entities/TerminalState';

describe('SedCommand POSIX TDD Suite', () => {
    let fs: FileSystem;
    let state: TerminalState;
    let cmd: SedCommand;

    beforeEach(() => {
        fs = new FileSystem();
        state = createInitialTerminalState();
        state.fs = fs;
        cmd = new SedCommand(fs);
    });

    /**
     * Category 1: Substitution Basics (s///)
     */
    describe('Substitution (s)', () => {
        it('1. should substitute first occurrence', () => {
            const res = cmd.execute(["s/a/b/"], state, "apple");
            assert.strictEqual(res.output, "bpple\n");
        });

        it('2. should substitute globally with g flag', () => {
            const res = cmd.execute(["s/a/b/g"], state, "banana");
            assert.strictEqual(res.output, "bbnbnb\n");
        });

        it('3. should substitute nth occurrence', () => {
            const res = cmd.execute(["s/a/b/2"], state, "banana");
            assert.strictEqual(res.output, "banbna\n");
        });

        it('4. should be case-insensitive with i flag (Austin Group extension)', () => {
            const res = cmd.execute(["s/A/b/i"], state, "Apple");
            assert.strictEqual(res.output, "bpple\n");
        });

        it('5. should handle ampersand & in replacement', () => {
            const res = cmd.execute(["s/[a-z]*/(&)/"], state, "hello");
            assert.strictEqual(res.output, "(hello)\n");
        });
    });

    /**
     * Category 2: Addresses & Ranges
     */
    describe('Addresses & Ranges', () => {
        it('6. should match by line number', () => {
            const res = cmd.execute(["2d"], state, "line1\nline2\nline3");
            assert.strictEqual(res.output, "line1\nline3\n");
        });

        it('7. should match by regex address', () => {
            const res = cmd.execute(["/match/d"], state, "line1\nmatch me\nline3");
            assert.strictEqual(res.output, "line1\nline3\n");
        });

        it('8. should match by line range', () => {
            const res = cmd.execute(["1,2d"], state, "1\n2\n3\n4");
            assert.strictEqual(res.output, "3\n4\n");
        });

        it('9. should match from regex to regex', () => {
            const res = cmd.execute(["/START/,/END/d"], state, "keep\nSTART\ninside\nEND\nkeep");
            assert.strictEqual(res.output, "keep\nkeep\n");
        });

        it('10. should match from line to $ (last line)', () => {
            const res = cmd.execute(["2,$d"], state, "1\n2\n3\n4");
            assert.strictEqual(res.output, "1\n");
        });

        it('11. should handle negated address (!)', () => {
            const res = cmd.execute(["2!d"], state, "1\n2\n3");
            assert.strictEqual(res.output, "2\n");
        });

        it('12. should handle non-matching range (second address less than first)', () => {
            const res2 = cmd.execute(["-n", "2,1p"], state, "1\n2\n3");
            assert.strictEqual(res2.output, "2\n");
        });
    });

    /**
     * Category 3: Deletion, Print, Next
     */
    describe('D, P, N commands', () => {
        it('13. should delete line (d)', () => {
            const res = cmd.execute(["d"], state, "a\nb");
            assert.strictEqual(res.output, "");
        });

        it('14. should print pattern space (p)', () => {
            const res = cmd.execute(["p"], state, "a");
            assert.strictEqual(res.output, "a\na\n"); // One from p, one from auto-print
        });

        it('15. should suppress auto-print with -n', () => {
            const res = cmd.execute(["-n", "p"], state, "a");
            assert.strictEqual(res.output, "a\n");
        });

        it('16. should read next line (n)', () => {
            const res = cmd.execute(["n;s/a/b/"], state, "a\na");
            assert.strictEqual(res.output, "a\nb\n");
        });

        it('17. should append next line (N)', () => {
            const res = cmd.execute(["N;s/\\n/:/"], state, "line1\nline2");
            assert.strictEqual(res.output, "line1:line2\n");
        });
    });

    /**
     * Category 4: Append, Insert, Change, Quit, =
     */
    describe('a, i, c, q, =', () => {
        it('18. should append text after line (a)', () => {
            const res = cmd.execute(["1a\\\nAPPENDED"], state, "line1\nline2");
            assert.strictEqual(res.output, "line1\nAPPENDED\nline2\n");
        });

        it('19. should insert text before line (i)', () => {
            const res = cmd.execute(["1i\\\nINSERTED"], state, "line1\nline2");
            assert.strictEqual(res.output, "INSERTED\nline1\nline2\n");
        });

        it('20. should change line (c)', () => {
            const res = cmd.execute(["1,2c\\\nCHANGED"], state, "1\n2\n3");
            assert.strictEqual(res.output, "CHANGED\n3\n");
        });

        it('21. should quit after line (q)', () => {
            const res = cmd.execute(["2q"], state, "1\n2\n3\n4");
            assert.strictEqual(res.output, "1\n2\n");
        });

        it('22. should print line number (=)', () => {
            const res = cmd.execute(["="], state, "a\nb");
            assert.strictEqual(res.output, "1\na\n2\nb\n");
        });
    });

    /**
     * Category 5: Hold Space (h, H, g, G, x)
     */
    describe('Hold Space', () => {
        it('23. should store and retrieve (h, g)', () => {
            const res = cmd.execute(["1h;2g"], state, "first\nsecond");
            assert.strictEqual(res.output, "first\nfirst\n");
        });

        it('24. should append to hold space (H, G)', () => {
            const res = cmd.execute(["1h;2H;2G"], state, "a\nb");
            assert.strictEqual(res.output, "a\nb\na\nb\n");
        });

        it('25. should exchange spaces (x)', () => {
            const res = cmd.execute(["1h;2x"], state, "a\nb");
            assert.strictEqual(res.output, "a\na\n");
        });

        it('26. should reverse lines using hold space', () => {
            const res = cmd.execute(["1!G;h;$!d"], state, "1\n2\n3");
            assert.strictEqual(res.output, "3\n2\n1\n");
        });

        it('27. should handle empty hold space', () => {
            const res = cmd.execute(["g"], state, "a\nb");
            assert.strictEqual(res.output, "\n\n");
        });
    });

    /**
     * Category 6: Control Flow (Labels, Branches)
     */
    describe('Control Flow', () => {
        it('28. should branch to label (b)', () => {
            const res = cmd.execute(["/skip/b end;s/a/b/;:end"], state, "a\nskip a");
            assert.strictEqual(res.output, "b\nskip a\n");
        });

        it('29. should branch if substitution made (t)', () => {
            const res = cmd.execute(["s/a/b/;t ok;s/c/d/;:ok"], state, "a\nc");
            assert.strictEqual(res.output, "b\nd\n");
        });

        it('30. should handle grouped commands { }', () => {
            const res = cmd.execute(["/a/{s/a/A/;s/x/X/;}"], state, "ax\nby");
            assert.strictEqual(res.output, "AX\nby\n");
        });

        it('31. should handle multiple -e options', () => {
            const res = cmd.execute(["-e", "s/a/b/", "-e", "s/b/c/"], state, "a");
            assert.strictEqual(res.output, "c\n");
        });

        it('32. should handle semicolon as command separator', () => {
            const res = cmd.execute(["s/a/b/;s/b/c/"], state, "a");
            assert.strictEqual(res.output, "c\n");
        });
    });

    /**
     * Category 7: Multiline & Delimiters
     */
    describe('Advanced Parsing', () => {
        it('33. should support alternative delimiters in s///', () => {
            const res = cmd.execute(["s:/:_:g"], state, "/path/to/file");
            assert.strictEqual(res.output, "_path_to_file\n");
        });

        it('34. should support backreferences \\1', () => {
            const res = cmd.execute(["s/\\([a-z]*\\)/\\1-\\1/"], state, "hello");
            assert.strictEqual(res.output, "hello-hello\n");
        });

        it('35. should treat escaped delimiter as literal', () => {
            const res = cmd.execute(["s/\\//_/"], state, "/");
            assert.strictEqual(res.output, "_\n");
        });

        it('36. should transliterate (y)', () => {
            const res = cmd.execute(["y/abc/ABC/"], state, "banana");
            assert.strictEqual(res.output, "BAnAnA\n");
        });
    });

    /**
     * Category 8: Options & Compliance
     */
    describe('Options & Standards', () => {
        it('37. should support ERE with -E', () => {
            const res = cmd.execute(["-E", "s/(a|b)/X/g"], state, "abc");
            assert.strictEqual(res.output, "XXc\n");
        });

        it('38. should read commands from file with -f', () => {
            fs.writeFile("/cmds.sed", "s/a/b/g", "w");
            const res = cmd.execute(["-f", "/cmds.sed"], state, "aaa");
            assert.strictEqual(res.output, "bbb\n");
        });

        it('39. should support in-place edit with -i (extension)', () => {
            fs.writeFile("/file.txt", "hello", "w");
            const res = cmd.execute(["-i", "s/hello/hi/", "/file.txt"], state);
            assert.strictEqual(fs.readFile("/file.txt"), "hi\n");
            assert.strictEqual(res.exitCode, 0);
        });

        it('40. should fail with exit code > 0 for invalid script', () => {
            const res = cmd.execute(["s/unfinished"], state, "abc");
            assert.ok(res.exitCode > 0);
        });
    });
});
