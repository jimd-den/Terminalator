
import { AwkCommand } from './src/domain/commands/core/AwkCommand.ts';
import { FileSystemService } from './src/domain/services/FileSystemService.ts';
import { ProcessContext } from './src/domain/entities/ProcessContext.ts';
import { TerminalState, createInitialTerminalState } from './src/domain/entities/TerminalState.ts';

// Mock FS
const mockFs = {
    readFile: (path: string) => {
        if (path === '/data') return '10 20\n30 40';
        if (path === '/f') return 'a b\nc d';
        throw new Error('Not found ' + path);
    }
} as any as FileSystemService;

const cmd = new AwkCommand(mockFs);
const state = createInitialTerminalState();

function createCtx(args: string[], input: string | undefined): ProcessContext {
    return {
        fs: {} as any,
        fileSystemService: mockFs,
        env: {},
        cwd: '/home/operator',
        user: { uid: 1000, gid: 1000, groups: [] },
        stdin: input,
        executor: {} as any
    };
}

async function runTests() {
    console.log('--- Verifying AwkCommand (AST) ---');

    const tests = [
        { name: 'Basic Print', args: ["{print $1}"], input: "10 20", expected: "10" },
        { name: 'Field Access', args: ["{print $2}"], input: "10 20", expected: "20" },
        { name: 'Multiple Lines', args: ["{print $1}"], input: "10 20\n30 40", expected: "10\n30" },
        { name: 'String Concat', args: ["{print $1 $2}"], input: "10 20", expected: "1020" }, // The fix!
        { name: 'Comma OFS', args: ["{print $1, $2}"], input: "10 20", expected: "10 20" },
        { name: 'BEGIN Block', args: ["BEGIN {print \"start\"}"], input: "", expected: "start" },
        { name: 'END Block', args: ["END {print \"end\"}"], input: "", expected: "end" },
        { name: 'NR NF', args: ["{print NR, NF}"], input: "a b\nc d e", expected: "1 2\n2 3" },
        { name: 'Custom FS', args: ["-F:", "{print $2}"], input: "a:b\nc:d", expected: "b\nd" },
        { name: 'Arithmetic', args: ["{print $1 + $2}"], input: "10 20", expected: "30" },
        { name: 'Comparison', args: ["{if ($1 > 15) print \"yes\"; else print \"no\"}"], input: "10\n20", expected: "no\nyes" }
    ];

    let passed = 0;
    for (const t of tests) {
        try {
            const ctx = createCtx(t.args, t.input);
            const res = cmd.execute(t.args, ctx, state);
            // execute is not async in AwkCommand signature currently? 
            // Wait, ICommand.execute can be CommandResponse | Promise<CommandResponse>
            // AwkCommand.ts as read in Step 1515 returns CommandResponse (sync).
            // But I modified it. Did I keep it sync?
            // Lexer/Parser/Interpreter are sync. So yes.

            // Wait, did I construct `execute` to be sync in Step 1697?
            // "async execute" or "execute"? 
            // I simply preserved signature from original or ...
            // Original line 28: execute(...) : CommandResponse.
            // My replacement (Step 1697): execute(...) : CommandResponse.
            // So it is sync.
            // BUT, `cmd.execute` in my test needs to handle this.

            const output = (res as any).output; // handle potential async if I messed up

            if (output === t.expected) {
                console.log(`PASS: ${t.name}`);
                passed++;
            } else {
                console.log(`FAIL: ${t.name}`);
                console.log(`  Exp: ${JSON.stringify(t.expected)}`);
                console.log(`  Act: ${JSON.stringify(output)}`);
            }
        } catch (e) {
            console.log(`FAIL: ${t.name} (Exception)`);
            console.log(e);
        }
    }
    console.log(`\nResult: ${passed}/${tests.length} passed.`);
}

runTests();
