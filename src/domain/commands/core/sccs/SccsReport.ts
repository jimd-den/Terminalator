/**
 * SccsReport - accumulates one SCCS utility run's standard output, standard
 * error and exit status ("name: file: message" diagnostics; the first
 * failure sets status 1 unless a utility supplies its own code).
 */
import { CommandResponse } from '../../../entities/Command';
import { TerminalState } from '../../../entities/TerminalState';

export class SccsReport {
    out = '';
    err = '';
    status = 0;

    constructor(private readonly name: string) { }

    error(message: string, status = 1): void {
        this.err += `${this.name}: ${message}\n`;
        this.status = this.status || status;
    }

    warn(message: string): void {
        this.err += `${this.name}: warning: ${message}\n`;
    }

    response(state: TerminalState): CommandResponse {
        return { output: this.out, stderr: this.err || undefined, exitCode: this.status, newState: state };
    }
}
