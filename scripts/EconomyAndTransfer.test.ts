/**
 * EconomyAndTransfer.test.ts
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * Unit Tests for the Economy Service and Transfer Command
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// @ts-ignore
import { expect, test, describe, beforeEach } from "bun:test";
import { EconomyService } from "../src/domain/services/EconomyService";
import { FileSystem } from "../src/domain/entities/FileSystem";
import { FileSystemService } from "../src/domain/services/FileSystemService";
import { TransferCommand } from "../src/domain/commands/core/TransferCommand";
import { ProcessContext } from "../src/domain/entities/ProcessContext";
import { createStdinStream, createOutputStream } from "../src/domain/entities/Stream";

describe("Economy and Transfer", () => {
    let fs: FileSystem;
    let fsService: FileSystemService;
    let economy: EconomyService;

    beforeEach(() => {
        fs = new FileSystem();
        fsService = new FileSystemService(fs);
        economy = new EconomyService(fsService);
    });

    test("should accumulate passive income from captured nodes", async () => {
        const initial = economy.getBalance();
        economy.registerCapturedNode("test-host", 500); // 5 Ƶ/sec
        
        // Wait 1.1s
        await new Promise(resolve => setTimeout(resolve, 1100));
        
        expect(economy.getBalance()).toBeGreaterThan(initial);
    });

    test("TransferCommand should deduct funds and write tool to /bin", async () => {
        const cmd = new TransferCommand();
        economy.credit(1000, "Initial Deposit");

        // Setup vendor node (mocking current FS as vendor)
        fsService.mkdirp('/public/tools');
        fsService.writeFile('/public/tools/autopwn.sh', 'dummy');

        const context: ProcessContext = {
            fs,
            fileSystemService: fsService,
            env: {},
            cwd: '/',
            user: { uid: 1000, gid: 1000, groups: [1000] },
            stdin: createStdinStream(),
            stdout: createOutputStream(),
            stderr: createOutputStream(),
            economy
        };

        const state = { 
            currentDirectory: '/', 
            environment: {}, 
            user: context.user,
            history: [],
            aliases: new Map(),
            lastExitCode: 0,
            functions: new Map()
        } as any;

        const res = await cmd.execute(['--amount', '500', '--tool', 'autopwn.sh'], context, state);

        expect(res.exitCode).toBe(0);
        expect(economy.getBalance()).toBe(500);
        expect(fsService.resolve('/bin/autopwn.sh')).toBeDefined();
    });

    test("TransferCommand should fail if insufficient funds", async () => {
        const cmd = new TransferCommand();
        economy.credit(100, "Small Deposit");
        fsService.mkdirp('/public/tools');
        fsService.writeFile('/public/tools/autopwn.sh', 'dummy');

        const context: ProcessContext = {
            fs,
            fileSystemService: fsService,
            env: {},
            cwd: '/',
            user: { uid: 1000, gid: 1000, groups: [1000] },
            stdin: createStdinStream(),
            stdout: createOutputStream(),
            stderr: createOutputStream(),
            economy
        };

        const state = { 
            currentDirectory: '/', 
            environment: {}, 
            user: context.user,
            history: [],
            aliases: new Map(),
            lastExitCode: 0,
            functions: new Map()
        } as any;

        const res = await cmd.execute(['--amount', '500', '--tool', 'autopwn.sh'], context, state);

        expect(res.exitCode).toBe(1);
        expect(res.output).toContain('check balance');
    });
});
