import { RedirectNode } from '../services/ShellParser';
import { CommandResponse } from '../entities/Command';
import { FileSystemService } from '../services/FileSystemService';
import { TerminalState } from '../entities/TerminalState';

/**
 * RedirectionService - SRP Compliant Handlers
 * 
 * Handles I/O redirection logic separately from command execution.
 */
export class RedirectionService {
    constructor(private fsService: FileSystemService) { }

    /**
     * Applies output redirections (> and >>) to the command response.
     * Side Effect: Writes to filesystem using the injected service.
     * 
     * @param result - The command execution result/response.
     * @param redirects - List of redirection nodes from AST.
     * @param state - Current terminal state (for context/permissions).
     * @returns The modified command response (output cleared if redirected).
     */
    public handleRedirections(result: CommandResponse, redirects: RedirectNode[], state: TerminalState): CommandResponse {
        if (!redirects || redirects.length === 0) return result;

        let finalResult = { ...result };

        for (const redir of redirects) {
            if (redir.op === '>' || redir.op === '>>') {
                if (finalResult.output !== undefined && finalResult.output !== null) {
                    const content = finalResult.output;
                    const mode = redir.op === '>>' ? 'a' : 'w';

                    // Side effect: FS Write
                    this.fsService.writeFile(
                        redir.file,
                        content,
                        mode,
                        state.user.uid,
                        state.user.gid,
                        state.currentDirectory,
                        state.user
                    );
                }
                // Clear output as it has been redirected
                finalResult.output = '';
            }
        }
        return finalResult;
    }
}
