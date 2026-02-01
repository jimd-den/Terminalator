/**
 * MakeExecutor - Engine for traversing the Makefile rule graph and executing recipes.
 * 
 * Handles dependency resolution, mtime checks, and command execution.
 * Adheres to SRP by isolating execution from parsing.
 * 
 * Pillar: The Four-Fold Shield (Clean Architecture)
 * Pillar: The Storyteller's Code (Literate Documentation)
 */

import { FileSystemService } from '../../services/FileSystemService';
import { TerminalState } from '../../entities/TerminalState';
import { MakeRule, MakefileData } from './MakefileParser';

export interface MakeOptions {
    ignoreErrors: boolean;
    dryRun: boolean;
    keepGoing: boolean;
    touch: boolean;
}

export class MakeExecutor {
    private processed = new Set<string>();
    private outputLines: string[] = [];
    private globalExitCode = 0;

    constructor(
        private fs: FileSystemService,
        private state: TerminalState,
        private data: MakefileData,
        private options: MakeOptions
    ) { }

    /**
     * Executes the building process for a list of goals.
     */
    public async execute(goals: string[]): Promise<{ output: string, exitCode: number }> {
        this.processed.clear();
        this.outputLines = [];
        this.globalExitCode = 0;

        try {
            for (const goal of goals) {
                await this.executeTarget(goal);
            }
        } catch (e: any) {
            if (e.message !== 'Stop') {
                this.outputLines.push(`make: Internal error: ${e.message}`);
                this.globalExitCode = 2;
            }
        }

        return {
            output: this.outputLines.join('\n'),
            exitCode: this.globalExitCode
        };
    }

    private async executeTarget(targetName: string): Promise<boolean> {
        if (this.processed.has(targetName)) return true;
        this.processed.add(targetName);

        const rule = this.data.rules.get(targetName);
        const targetMtime = this.getMtime(targetName);
        let rebuild = false;

        if (!rule) {
            // Source file check
            if (targetMtime !== -1) return true;
            this.outputLines.push(`make: *** No rule to make target '${targetName}'. Stop.`);
            if (!this.options.keepGoing) throw new Error('Stop');
            this.globalExitCode = 1;
            return false;
        }

        // Build dependencies
        for (const dep of rule.dependencies) {
            const expandedDep = this.expand(dep);
            if (!expandedDep) continue;

            const depSuccess = await this.executeTarget(expandedDep);
            if (!depSuccess) {
                if (!this.options.keepGoing) return false;
                this.outputLines.push(`make: *** Target '${targetName}' not remade because of errors.`);
                return false;
            }

            const depMtime = this.getMtime(expandedDep);
            if (depMtime > targetMtime) rebuild = true;
        }

        if (targetMtime === -1) rebuild = true;
        if (rule.dependencies.length === 0 && targetMtime === -1) rebuild = true;

        if (!rebuild && targetMtime !== -1) {
            return true;
        }

        // Execute recipes
        if (this.options.touch) {
            this.touchTarget(targetName);
            return true;
        }

        for (const recipe of rule.recipes) {
            const expandedRecipe = this.expand(recipe);
            const silent = expandedRecipe.startsWith('@');
            const ignore = this.options.ignoreErrors || expandedRecipe.startsWith('-');

            let cmdStr = expandedRecipe;
            if (cmdStr.startsWith('@')) cmdStr = cmdStr.substring(1);
            if (cmdStr.startsWith('-')) cmdStr = cmdStr.substring(1);

            if (!silent) this.outputLines.push(cmdStr);
            if (this.options.dryRun) continue;

            const cmdExit = this.simulationExecute(cmdStr);

            if (cmdExit !== 0) {
                if (!ignore) {
                    this.outputLines.push(`make: *** [${targetName}] Error ${cmdExit}`);
                    if (!this.options.keepGoing) {
                        this.globalExitCode = 2;
                        throw new Error('Stop');
                    }
                    this.globalExitCode = 1;
                    return false;
                } else {
                    this.outputLines.push(`make: [${targetName}] Error ${cmdExit} (ignored)`);
                }
            }
        }
        return true;
    }

    private expand(str: string): string {
        return str.replace(/\$\(([a-zA-Z0-9_]+)\)/g, (_, name) => {
            return this.data.macros.get(name) || this.state.environment[name] || '';
        });
    }

    private getMtime(path: string): number {
        const node = this.fs.resolve(path, this.state.currentDirectory);
        if (!node) return -1;
        const inode = this.fs.getInode(node.inodeId);
        return inode ? inode.mtime : -1;
    }

    private touchTarget(targetName: string) {
        if (this.options.dryRun) return;
        try {
            const path = targetName.startsWith('/') ? targetName : this.state.currentDirectory + '/' + targetName;
            this.fs.writeFile(path, '', 'a', undefined, undefined, this.state.currentDirectory);
            const node = this.fs.resolve(path, this.state.currentDirectory);
            if (node) {
                const inode = this.fs.getInode(node.inodeId);
                if (inode) {
                    inode.mtime = Date.now();
                    inode.ctime = Date.now();
                }
            }
            this.outputLines.push(`touch ${targetName}`);
        } catch (e) { }
    }

    /**
     * Simulated execution of recipe commands.
     * In a full implementation, this might call a real shell/executor.
     */
    private simulationExecute(cmdStr: string): number {
        const parts = cmdStr.split(/\s+/);
        const prog = parts[0];
        const progArgs = parts.slice(1);

        try {
            if (prog === 'echo') {
                let text = progArgs.join(' ');
                this.outputLines.push(text.replace(/['"]/g, ''));
                return 0;
            } else if (prog === 'touch') {
                const file = progArgs[0];
                this.touchTarget(file);
                return 0;
            } else if (prog === 'false') {
                return 1;
            } else if (prog === 'true') {
                return 0;
            }
            return 0; // Default success for unknown
        } catch (e) {
            return 1;
        }
    }
}
