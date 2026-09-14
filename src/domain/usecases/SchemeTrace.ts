/**
 * SchemeTrace - Domain Use Case Layer
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * Making Evaluation Visible
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * The VM already knows everything worth teaching about how Scheme runs -- when
 * a call stacks a frame, when a tail call reuses one, when a continuation is
 * captured and warped back to. None of it ever left the interpreter, so
 * `(+ 1 2)` printed `3` and the entire mechanism stayed invisible.
 *
 * This is the recording half of the fix. It captures evaluation as a list of
 * discrete steps that a view can replay at human speed, which is the whole
 * pedagogical trick: a rule you WATCH happen is learned; a rule you are TOLD
 * is memorised and forgotten.
 *
 * Two constraints shape the design:
 *
 *   1. TRACING MUST BE FREE WHEN OFF. The VM executes millions of instructions
 *      in a tight loop; an always-on recorder would make the interpreter
 *      useless. Nothing is allocated unless a recorder is attached.
 *
 *   2. TRACING MUST BE BOUNDED WHEN ON. A tail loop can run a million
 *      iterations. Recording all of them would exhaust memory to produce an
 *      unwatchable animation, so the recorder stops at a budget and reports
 *      how much it elided.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export type StepKind =
    /** A procedure call that pushed a new frame. */
    | 'call'
    /**
     * A call in tail position, which REUSED the caller's frame.
     * The distinction from 'call' is the point: it is what makes a loop
     * written as recursion run in constant space, and seeing the frame get
     * replaced rather than stacked is how that stops being a slogan.
     */
    | 'tail-call'
    /** A frame returned a value to its caller. */
    | 'return'
    /** A variable was resolved to a value. */
    | 'lookup'
    /** A name was bound in the current scope. */
    | 'bind'
    /** A continuation was captured -- a save point. */
    | 'capture'
    /** A continuation was invoked -- a jump back to its capture point. */
    | 'warp'
    /** A condition was raised. */
    | 'raise';

export interface EvalStep {
    kind: StepKind;
    /** Call-stack depth AFTER the step, for indentation and stack height. */
    depth: number;
    /** Procedure or variable name, where one applies. */
    label?: string;
    /** Rendered argument or result values. */
    detail?: string;
}

export interface TraceResult {
    steps: EvalStep[];
    /** Steps that occurred after the budget ran out. */
    elided: number;
    /** Peak call-stack depth reached. */
    maxDepth: number;
    /** Frames saved by tail calls -- the depth the run would have reached. */
    tailCalls: number;
}

/**
 * Collects evaluation steps up to a budget.
 *
 * Attach one to a SchemeVM to turn tracing on; leave it unset for full speed.
 */
export class TraceRecorder {
    private steps: EvalStep[] = [];
    private elided = 0;
    private maxDepth = 0;
    private tailCalls = 0;

    constructor(private readonly budget: number = 400) {}

    public record(step: EvalStep): void {
        if (step.depth > this.maxDepth) this.maxDepth = step.depth;
        if (step.kind === 'tail-call') this.tailCalls++;

        if (this.steps.length >= this.budget) {
            this.elided++;
            return;
        }
        this.steps.push(step);
    }

    public result(): TraceResult {
        return {
            steps: this.steps,
            elided: this.elided,
            maxDepth: this.maxDepth,
            tailCalls: this.tailCalls
        };
    }

    public get isFull(): boolean {
        return this.steps.length >= this.budget;
    }
}

/** Glyph and one-word gloss for each kind, shared by every renderer. */
export const STEP_GLYPH: Record<StepKind, { glyph: string; gloss: string }> = {
    'call':      { glyph: '▸', gloss: 'call' },
    'tail-call': { glyph: '↻', gloss: 'tail' },
    'return':    { glyph: '◂', gloss: 'return' },
    'lookup':    { glyph: '·', gloss: 'lookup' },
    'bind':      { glyph: '=', gloss: 'bind' },
    'capture':   { glyph: '⚑', gloss: 'capture' },
    'warp':      { glyph: '⇜', gloss: 'warp' },
    'raise':     { glyph: '!', gloss: 'raise' }
};

/**
 * Renders a trace as plain text, for `scheme -t` and for piping.
 *
 * Indentation IS the call stack, so a tail loop shows as a flat column while
 * ordinary recursion shows as a staircase -- the same lesson the animated view
 * teaches, in a form that survives `grep`.
 */
export const formatTrace = (trace: TraceResult): string => {
    const lines = trace.steps.map(s => {
        const { glyph } = STEP_GLYPH[s.kind];
        const indent = '  '.repeat(Math.min(s.depth, 12));
        const label = s.label ?? '';
        const detail = s.detail ? ` ${s.detail}` : '';
        return `${indent}${glyph} ${label}${detail}`;
    });

    if (trace.elided > 0) {
        lines.push(`  … ${trace.elided} further steps not shown`);
    }

    lines.push('');
    lines.push(`depth ${trace.maxDepth} · ${trace.tailCalls} tail call(s) reused a frame`);
    return lines.join('\n');
};
