import { describe, it, expect } from 'vitest';
import { CommandBase } from '../../src/domain/commands/CommandBase';
import { ProcessContext } from '../../src/domain/entities/ProcessContext';
import { TerminalState } from '../../src/domain/entities/TerminalState';
import { CommandResponse } from '../../src/domain/usecases/ExecuteCommand';

// Concrete implementation for testing
class TestCommand extends CommandBase {
    public executeWasCalled = false;
    public parsedFlags: Set<string> | undefined;
    public parsedOperands: string[] | undefined;

    executeInternal(args: string[], flags: Set<string>, operands: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        this.executeWasCalled = true;
        this.parsedFlags = flags;
        this.parsedOperands = operands;

        return {
            output: 'success',
            newState: state,
            exitCode: 0
        };
    }
}

describe('CommandBase', () => {
    it('should separate flags and operands correctly', async () => {
        const cmd = new TestCommand();
        const args = ['-rf', 'file1', '-v', 'file2'];

        // Mock context/state
        const context = {} as ProcessContext;
        const state = {} as TerminalState;

        await cmd.execute(args, context, state);

        expect(cmd.executeWasCalled).toBe(true);
        expect(cmd.parsedFlags?.has('-rf')).toBe(true);
        expect(cmd.parsedFlags?.has('-v')).toBe(true);
        expect(cmd.parsedOperands).toEqual(['file1', 'file2']);
    });

    it('should handle no flags', async () => {
        const cmd = new TestCommand();
        const args = ['op1', 'op2'];

        await cmd.execute(args, {} as any, {} as any);

        expect(cmd.parsedFlags?.size).toBe(0);
        expect(cmd.parsedOperands).toEqual(['op1', 'op2']);
    });

    it('should handle only flags', async () => {
        const cmd = new TestCommand();
        const args = ['-a', '-b'];

        await cmd.execute(args, {} as any, {} as any);

        expect(cmd.parsedFlags?.has('-a')).toBe(true);
        expect(cmd.parsedFlags?.has('-b')).toBe(true);
        expect(cmd.parsedOperands).toEqual([]);
    });
});
