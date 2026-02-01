/**
 * ShellPresenter - Interface Adapter Layer
 * 
 * " The Voice of the Machine "
 * 
 * Responsible for formatting raw data into human-readable terminal output.
 * Takes pure data (strings, exit codes) and transforms it into structured
 * objects ready for the OutputController to render.
 * 
 * Pillar: The Swift Stream (Pure Functions)
 * Pillar: The Storyteller's Code (Literate Documentation)
 * 
 * Intent:
 * Decouples the "What" (Data) from the "How" (Presentation).
 * Ensures consistent formatting for errors, successes, and system messages across the OS.
 */

import { TerminalOutputLine } from '../controllers/OutputController';

export class ShellPresenter {

    /**
     * Formats a standard command output line.
     * 
     * @param text - The raw string output from a command.
     * @param metadata - Optional extra data for special renderers (e.g., 'ls-pretty').
     * @returns A formatted TerminalOutputLine object.
     */
    static presentOutput(text: string, metadata?: any): TerminalOutputLine {
        return {
            text: text || '',
            type: 'output',
            metadata: metadata,
            timestamp: Date.now()
        };
    }

    /**
     * Formats a critical system/kernel message.
     * Use this for boot sequences, errors, or hardware notifications.
     * 
     * @param message - The system message to display.
     * @returns A system-typed TerminalOutputLine.
     */
    static presentSystemMessage(message: string): TerminalOutputLine {
        return {
            text: `[ SYSTEM ] ${message.toUpperCase()}`,
            type: 'system',
            timestamp: Date.now()
        };
    }

    /**
     * Formats an error message based on an exit code.
     * 
     * @param exitCode - Non-zero exit code indicating failure.
     * @param commandName - The command that failed.
     * @param errorMessage - Optional specific error details.
     * @returns A formatted error line.
     */
    static presentError(exitCode: number, commandName?: string, errorMessage?: string): TerminalOutputLine {
        const prefix = commandName ? `${commandName}: ` : '';
        const msg = errorMessage || `Command failed with exit code ${exitCode}`;

        return {
            text: `[ ERROR ] ${prefix}${msg}`,
            type: 'system', // Errors are system-level notifications
            exitCode: exitCode,
            timestamp: Date.now()
        };
    }

    /**
     * Formats the user's input echo line.
     * 
     * @param command - The command string typed by the user.
     * @param pending - Whether the command is currently executing.
     * @returns An input-typed TerminalOutputLine.
     */
    static presentInputEcho(command: string, pending: boolean = true): TerminalOutputLine {
        return {
            text: `> ${command}`,
            type: 'input',
            pending: pending,
            timestamp: Date.now()
        };
    }
}
