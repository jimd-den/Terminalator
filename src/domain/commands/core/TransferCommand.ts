/**
 * TransferCommand.ts - Core Command
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * The Transaction Engine
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Handles ZINC transfers for purchasing tools from Vendor nodes.
 * Syntax: transfer --amount <n> --tool <binary>
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { CommandBase } from '../CommandBase';
import { CommandCapability } from '../IStructuredCommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../entities/Command';
import { ToolRegistry } from '../../services/economy/ToolRegistry';

export class TransferCommand extends CommandBase {
    public readonly capabilities = [CommandCapability.MODIFY];
    public readonly utility = 'transfer';

    public override async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        this.parseArgs(args, ['amount', 'tool']);
        return this.executeInternal(args, this.flags, this.operands, context, state);
    }

    protected async executeInternal(
        rawArgs: string[],
        flags: Set<string>,
        operands: string[],
        context: ProcessContext,
        state: TerminalState
    ): Promise<CommandResponse> {
        const amountStr = this.options.get('amount');
        const toolName = this.options.get('tool');

        if (!context.economy) {
            return { output: 'transfer: economy service not available', exitCode: 1, newState: state };
        }

        if (!amountStr || !toolName) {
            return { output: 'usage: transfer --amount <n> --tool <binary>', exitCode: 1, newState: state };
        }

        const amount = parseInt(amountStr);
        if (isNaN(amount) || amount <= 0) {
            return { output: 'transfer: invalid amount', exitCode: 1, newState: state };
        }

        const tool = ToolRegistry.getToolByBinary(toolName);
        if (!tool) {
            return { output: `transfer: tool '${toolName}' not found in registry`, exitCode: 1, newState: state };
        }

        if (amount < tool.cost) {
            return { output: `transfer: insufficient funds offered. ${tool.name} costs ${tool.cost} Ƶ.`, exitCode: 1, newState: state };
        }

        // Check if tool is available on the current node (must be a vendor node)
        const vendorToolPath = `/public/tools/${toolName}`;
        try {
            context.fileSystemService.resolve(vendorToolPath);
        } catch (e) {
            return { output: `transfer: tool '${toolName}' is not available for purchase on this node.`, exitCode: 1, newState: state };
        }

        // Perform transaction
        const success = await context.economy.debit(amount, `Purchased ${tool.name}`);
        if (!success) {
            return { output: `transfer: transaction failed. check balance.`, exitCode: 1, newState: state };
        }

        // "Download" tool to local /bin (ALWAYS use localFileSystemService if available)
        const targetFs = context.localFileSystemService || context.fileSystemService;
        const binPath = `/bin/${toolName}`;
        
        const content = `[ LICENSED BINARY: ${tool.name.toUpperCase()} ]
# Authorized for use by operator.
# Capability unlocked.`;
        
        targetFs.writeFile(binPath, content);

        // Set executable
        const node = targetFs.resolve(binPath);
        if (node) {
            const inode = targetFs.getInode(node.inodeId);
            if (inode) {
                inode.mode |= 0o111; // Ensure executable
            }
        }

        return {
            output: `TRANSFER COMPLETE.
DEBIT: ${amount} Ƶ
DOWNLOADED: ${binPath}
CAPABILITY UNLOCKED: ${tool.id.toUpperCase()}`,
            exitCode: 0,
            newState: state
        };
    }

    public override buildArgs(requirements: Record<string, any>): string[] {
        const args: string[] = [];
        if (requirements.amount) {
            args.push('--amount');
            args.push(requirements.amount.toString());
        }
        if (requirements.tool) {
            args.push('--tool');
            args.push(requirements.tool);
        }
        return args;
    }
}
