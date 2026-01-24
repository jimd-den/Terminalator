/**
 * AwkRuntimeEnvironment.ts
 * 
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Balanced Scale (SRP)
 * 
 * Intent:
 * Encapsulates the runtime state of the AWK interpreter (Variables, Fields, Records).
 * Separates "State" from "Execution Logic".
 */

export class AwkRuntimeEnvironment {
    private vars: Map<string, any> = new Map();
    private fields: string[] = [];
    private record: string = '';

    // Built-in Variables (Special Handling)
    public NR: number = 0;
    public NF: number = 0;
    public FS: string = ' ';
    public OFS: string = ' '; // Default output field separator

    constructor() {
        this.vars.set('NR', 0);
        this.vars.set('NF', 0);
        this.vars.set('FS', ' ');
        this.vars.set('OFS', ' ');
    }

    public updateFields(line: string) {
        this.record = line;
        this.NR++;
        this.vars.set('NR', this.NR);

        // Split Logic
        if (this.FS === ' ') {
            // Default: sequence of spaces/tabs matches one separator, trimming leading/trailing
            this.fields = line.trim().split(/\s+/);
            if (line.trim() === '') this.fields = [];
        } else {
            this.fields = line.split(this.FS);
        }

        this.NF = this.fields.length;
        this.vars.set('NF', this.NF);

        // Update $0
        // Implicitly handled by getField(0) returns this.record
    }

    public getField(index: number): any {
        if (index === 0) return this.record;
        if (index < 0) throw new Error("Field index cannot be negative");
        // Fields array is 0-indexed in JS, but maps to $1...$NF.
        // So $1 is fields[0].
        if (index > this.fields.length) return ""; // Awk returns empty for out of bounds
        return this.fields[index - 1];
    }

    public setField(index: number, value: any) {
        if (index === 0) {
            this.record = String(value);
            // Re-splitting needed? Or just update $0?
            // "If $0 is changed, fields are re-split."
            this.updateFields(this.record); // This increments NR! WRONG!
            // We should split without incrementing NR.
            this.reSplit();
            return;
        }

        // Updating $i rebuilds $0?
        // "If a field is changed, $0 is rebuilt using OFS."
        this.fields[index - 1] = String(value);
        this.NF = Math.max(this.NF, index);
        this.vars.set('NF', this.NF);

        // Rebuild $0
        this.record = this.fields.join(this.OFS);
    }

    private reSplit() {
        if (this.FS === ' ') {
            this.fields = this.record.trim().split(/\s+/);
            if (this.record.trim() === '') this.fields = [];
        } else {
            this.fields = this.record.split(this.FS);
        }
        this.NF = this.fields.length;
        this.vars.set('NF', this.NF);
    }

    public getVar(name: string): any {
        // Intercept Built-ins if needed, or rely on them being in map.
        // Optimizing for simple Map
        return this.vars.get(name) ?? ""; // Uninitialized is ""/0
    }

    public setVar(name: string, value: any) {
        this.vars.set(name, value);
        // Sync special vars
        if (name === 'FS') this.FS = String(value);
        if (name === 'OFS') this.OFS = String(value);
        if (name === 'NR') this.NR = Number(value);
        // NF read-onlyish? No, setting NF truncates/expands fields? POSIX says yes.
        // Stub for now: simple set.
        if (name === 'NF') this.NF = Number(value);
    }
}
