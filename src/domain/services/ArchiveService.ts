/**
 * ArchiveService - Domain Service
 * 
 * Manages the "Memory Buffer" of the terminal.
 * Responsible for archiving command outputs, tagging them, and organizing 
 * them into browseable sections.
 * 
 * Pillar: THE STORYTELLER'S CODE (Literate Documentation)
 * Pillar: THE BALANCED SCALE (KISS)
 */

import { TerminalOutputLine } from '../../interface-adapters/controllers/OutputController';

export interface CapturedBuffer {
    id: string;
    timestamp: number;
    command: string;
    output: string[];
    tags: string[];
    exitCode?: number;
    hostname: string;
}

export class ArchiveService {
    private archive: CapturedBuffer[] = [];

    /**
     * Records a command execution and its resulting output into the archive.
     * 
     * @param command - The exact string entered by the user.
     * @param outputLines - The raw lines produced by the command.
     * @param hostname - The context where the command was run.
     * @param exitCode - Numerical status of execution.
     */
    public record(
        command: string,
        outputLines: TerminalOutputLine[],
        hostname: string,
        exitCode?: number
    ): CapturedBuffer {
        const id = `buf_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

        // Extract plain text from output lines for storage
        const plainTextOutput = outputLines
            .filter(l => l.type === 'output' || l.type === 'system')
            .map(l => l.text);

        const buffer: CapturedBuffer = {
            id,
            timestamp: Date.now(),
            command,
            output: plainTextOutput,
            tags: this.autoTag(command, plainTextOutput),
            exitCode,
            hostname
        };

        this.archive.unshift(buffer); // Newest first
        return buffer;
    }

    /**
     * Retrives the entire archived history.
     */
    public getAll(): CapturedBuffer[] {
        return this.archive;
    }

    /**
     * Filters buffers by a specific tag.
     */
    public getByTag(tag: string): CapturedBuffer[] {
        return this.archive.filter(b => b.tags.includes(tag.toLowerCase()));
    }

    /**
     * Deletes a specific buffer from the memory banks.
     */
    public delete(id: string): void {
        this.archive = this.archive.filter(b => b.id !== id);
    }

    /**
     * Automatically assigns metadata tags based on command patterns and content.
     */
    private autoTag(command: string, content: string[]): string[] {
        const tags: string[] = [];
        const baseCmd = command.split(' ')[0].toLowerCase();

        // 1. Categorization by Tool
        if (['ls', 'find', 'locate'].includes(baseCmd)) tags.push('navigation');
        if (['cat', 'grep', 'awk', 'sed', 'val'].includes(baseCmd)) tags.push('data-processing');
        if (['vim', 'nano', 'touch'].includes(baseCmd)) tags.push('editing');
        if (['ssh', 'scp', 'ftp'].includes(baseCmd)) tags.push('network');
        if (['make', 'gcc', 'sh'].includes(baseCmd)) tags.push('system');

        // 2. Content Heuristics
        const text = content.join('\n').toLowerCase();
        if (text.includes('error') || text.includes('failed')) tags.push('errors');
        if (text.includes('password') || text.includes('key')) tags.push('security');
        if (text.includes('total') || text.includes('summary')) tags.push('reports');

        return tags;
    }
}
