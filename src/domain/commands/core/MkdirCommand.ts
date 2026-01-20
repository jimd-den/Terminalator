/**
 * MkdirCommand - Core Command
 *
 * Creates directories, supporting parent creation with -p.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 * Pillar: The Storyteller’s Code (Literate Documentation)
 * Pillar: The Watchman’s Log (Telemetry)
 *
 * Intent:
 * Allows the operator to expand the file system hierarchy.
 * Validates paths and modes before creation.
 */

import { ICommand } from '../ICommand';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../usecases/ExecuteCommand';
import { FileSystem } from '../../entities/FileSystem';
import { TelemetryPort } from '../../ports/TelemetryPort';

export class MkdirCommand implements ICommand {
    constructor(
        private fs: FileSystem,
        private telemetry?: TelemetryPort
    ) { }

    execute(args: string[], state: TerminalState, input?: string): CommandResponse {
        const executeLogic = () => {
            // Manual argument parsing loop for robustness
            const flags: Set<string> = new Set();
            const targets: string[] = [];
            let endOfFlags = false;

            for (let i = 0; i < args.length; i++) {
                const arg = args[i];
                if (!endOfFlags && arg.startsWith('-') && arg !== '-') {
                    if (arg === '--') {
                        endOfFlags = true;
                        continue;
                    }
                    // Handle combined flags e.g. -p
                    for (let j = 1; j < arg.length; j++) {
                        flags.add(arg[j]);
                    }
                } else {
                    targets.push(arg);
                }
            }

            const createParents = flags.has('p');
            // Stub -m (mode) support if needed

            if (targets.length === 0) {
                return {
                    output: 'mkdir: missing operand',
                    newState: state,
                    exitCode: 1
                };
            }

            let exitCode = 0;
            let outputString = '';

            for (const target of targets) {
                // Resolve path absolute or relative
                let path = target;
                if (!target.startsWith('/')) {
                    path = state.currentDirectory === '/'
                        ? `/${target}`
                        : `${state.currentDirectory}/${target}`;
                }

                // Check existence
                const existing = this.fs.resolveNode(path);
                if (existing) {
                    if (createParents && this.fs.isDirectory(existing)) {
                        continue; // -p suppresses error if dir exists
                    }
                    outputString += `mkdir: cannot create directory '${target}': File exists\n`;
                    exitCode = 1;
                    continue;
                }

                try {
                    if (createParents) {
                        this.mkdirParents(path);
                    } else {
                        // Strict mkdir: parent must exist
                        const lastSlash = path.lastIndexOf('/');
                        const parentPath = lastSlash <= 0 ? '/' : path.substring(0, lastSlash);

                        const parent = this.fs.resolveNode(parentPath);
                        if (!parent || !this.fs.isDirectory(parent)) {
                            outputString += `mkdir: cannot create directory '${target}': No such file or directory\n`;
                            exitCode = 1;
                            continue;
                        }
                        this.fs.mkdir(path, 0o755);
                    }
                } catch (e: any) {
                    outputString += `mkdir: cannot create directory '${target}': ${e.message}\n`;
                    exitCode = 1;
                }
            }

            if (outputString.endsWith('\n')) outputString = outputString.slice(0, -1);

            return {
                output: outputString,
                newState: state,
                exitCode: exitCode
            };
        };

        if (this.telemetry) {
            return this.telemetry.trace('MkdirCommand.execute', executeLogic, args);
        } else {
            return executeLogic();
        }
    }

    private mkdirParents(path: string) {
        const parts = path.split('/').filter(p => p.length > 0);
        let currentPath = '';

        for (const part of parts) {
            currentPath += `/${part}`;
            const node = this.fs.resolveNode(currentPath);
            if (!node) {
                this.fs.mkdir(currentPath, 0o755);
            } else if (!this.fs.isDirectory(node)) {
                throw new Error(`'${currentPath}' exists and is not a directory`);
            }
        }
    }
}
