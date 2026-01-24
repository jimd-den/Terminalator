/**
 * AutocompleteService.ts
 *
 * Pillar: The Four-Fold Shield (Domain Service)
 * Pillar: The Balanced Scale (SRP)
 *
 * Intent:
 * Encapsulates the logic for predicting user input.
 * Supports Command completion (from a fixed list) and File completion (from FileSystem).
 */

import { FileSystemService } from './FileSystemService';
import { DirectoryNode } from '../entities/filesystem/DirectoryNode';

export class AutocompleteService {
    // Standard commands available in the shell
    private readonly commands = [
        'help', 'ls', 'cd', 'cat', 'whoami', 'mail',
        'check-comms', 'clear', 'vim', 'man', 'grep',
        'jobs', 'kill', 'ps', 'bg', 'fg'
    ];

    constructor(private fsService: FileSystemService) { }

    /**
     * Determines the ghost text suggestion for a given input.
     * @param input - The current input string.
     * @param cwd - The current working directory.
     * @returns The remaining characters to complete the command/filename, or empty string.
     */
    public getSuggestion(input: string, cwd: string): string {
        if (!input) return '';
        const parts = input.split(' ');
        const cmd = parts[0];

        // 1. Command Autocomplete
        if (parts.length === 1) {
            const match = this.commands.find(c => c.startsWith(input.toLowerCase()) && c !== input.toLowerCase());
            return match ? match.substring(input.length) : '';
        }

        // 2. File Autocomplete
        let lookingForFile = false;
        let partialName = '';

        // Commands that expect a file argument
        // TODO: Make this extensible or part of Command Definition
        if (['cd', 'cat', 'vim', 'ls', 'rm', 'touch', 'mkdir'].includes(cmd) && parts.length === 2) {
            lookingForFile = true;
            partialName = parts[1];
        } else if (cmd === 'grep' && parts.length === 3) {
            lookingForFile = true;
            partialName = parts[2];
        }

        if (lookingForFile) {
            // We need to list files in the target directory
            // For simplicity, we only support completions in CWD for now, 
            // or absolute paths if we parse them.
            // Current logic in VM was: resolve(targetDir) which implied CWD.
            // But if partialName implies a path (foo/bar), we need to resolve the directory.

            // Naive implementation matching previous VM logic:
            // Assume completion is ONLY for files in CWD.
            // If partialName contains '/', we might need better logic. 
            // For now, adhere to previous behavior: resolve(state.currentDirectory)

            try {
                const node = this.fsService.resolve(cwd);
                if (node && node.isDirectory()) {
                    const dirNode = node as DirectoryNode;
                    const files = Array.from(dirNode.children.keys());

                    // Filter
                    const match = files.find(f => f.startsWith(partialName) && f !== partialName);
                    return match ? match.substring(partialName.length) : '';
                }
            } catch (e) {
                // Ignore FS errors during autocomplete
                return '';
            }
        }

        return '';
    }
}
