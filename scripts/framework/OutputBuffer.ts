/**
 * OutputBuffer.ts
 *
 * Captures and formats user-facing output, separating it from system telemetry.
 */

export class OutputBuffer {
    constructor(private prefix: string = '█ ') {}

    public logInput(cmd: string) {
        console.log(`
${this.prefix}${cmd}`);
    }

    public logOutput(output: string) {
        if (!output) return;
        // Indent output for clarity
        const formatted = output.split('\n').map(line => `  ${line}`).join('\n');
        console.log(formatted);
    }

    public logSystem(msg: string) {
        console.log(`
[SYSTEM] ${msg}`);
    }

    public logError(msg: string) {
        console.error(`
[ERROR] ${msg}`);
    }
}
