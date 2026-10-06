/**
 * SchemeVM - Domain Use Case Layer
 * 
 * A stack-based virtual machine for executing Scheme bytecode.
 * Designed to support first-class continuations and proper tail recursion.
 * 
 * Pillar: THE SHADOW’S VEIL (Clean Architecture)
 * Pillar: THE MASTER’S TOOL (VM Pattern)
 * Pillar: THE SWIFT STREAM (Performance)
 * 
 * Intent:
 * Provides a controlled execution environment where the stack and instruction
 * pointer are explicitly managed, enabling 'call/cc' and non-local jumps.
 */

import { SchemeValue, makeBoolean, schemeToString, makeProcedure, Procedure, listToArray } from '../entities/SchemeValue';
import { Environment } from '../entities/Environment';
import { TraceRecorder } from './SchemeTrace';

/**
 * A raised Scheme condition travelling as a JS exception.
 *
 * Using the host's throw is what lets a condition unwind out of arbitrarily
 * deep builtin calls; the VM catches it at the interpreter loop and hands it
 * to the innermost installed guard handler.
 */
export class SchemeRaise extends Error {
    constructor(public readonly condition: SchemeValue) {
        super('scheme-raise');
    }
}

/** An installed `guard` handler and the control state to restore for it. */
interface HandlerFrame {
    handler: SchemeValue;
    stack: SchemeValue[];
    pc: number;
    code: Instruction[];
    env: Environment;
    callStack: any[];
    /** Depth at install time, so a normal return can uninstall it. */
    depth: number;
}

export type Instruction =
    | { op: 'CONST', value: SchemeValue }
    | { op: 'LOOKUP', name: string }
    | { op: 'DEFINE', name: string }
    | { op: 'SET', name: string }
    | { op: 'CLOSURE', params: string[], body: Instruction[] }
    | { op: 'APPLY', argCount: number }
    /**
     * Application in tail position. Reuses the caller's frame instead of
     * pushing a new one, so a loop written as tail recursion runs in constant
     * space -- which R7RS requires and a plain APPLY cannot give.
     */
    | { op: 'TAIL_APPLY', argCount: number }
    | { op: 'RETURN' }
    | { op: 'JUMP', offset: number }
    | { op: 'JUMP_IF_FALSE', offset: number }
    | { op: 'CALL_CC' }
    | { op: 'HALT' };

export interface VMState {
    stack: SchemeValue[];
    env: Environment;
    pc: number;
    code: Instruction[];
    callStack: { pc: number, code: Instruction[], env: Environment }[];
}

export class SchemeVM {
    private stack: SchemeValue[] = [];
    private env: Environment;
    private pc: number = 0;
    private code: Instruction[] = [];
    private callStack: any[] = [];
    private handlers: HandlerFrame[] = [];
    private instructionCount: number = 0;
    /**
     * Optional step recorder. Left undefined the VM does no tracing work at
     * all, which matters because this loop runs millions of instructions.
     */
    private tracer?: TraceRecorder;

    constructor(env: Environment) {
        this.env = env;
    }

    public getInstructionCount(): number {
        return this.instructionCount;
    }

    /** Turns on step recording. Off by default; see SchemeTrace. */
    public setTracer(tracer: TraceRecorder | undefined): void {
        this.tracer = tracer;
    }

    /** Short rendering of a value for trace labels. */
    private brief(v: SchemeValue): string {
        const s = schemeToString(v);
        return s.length > 28 ? s.slice(0, 27) + '…' : s;
    }

    private procName(proc: Procedure): string {
        return proc.name ?? (proc.isBuiltin ? 'builtin' : 'lambda');
    }

    /**
     * Gives an anonymous closure the name it is being bound to.
     *
     * Procedures are values, so `(define (sum n) ...)` produces a closure that
     * knows nothing about the name `sum`. Attaching it at the binding site is
     * what lets a trace read `sum` rather than a column of `lambda`.
     */
    private nameIfAnonymous(value: SchemeValue, name: string): SchemeValue {
        if (value.type !== 'procedure') return value;
        const proc = value.value as Procedure;
        if (proc.name) return value;
        return makeProcedure({ ...proc, name });
    }

    /**
     * Executes a sequence of instructions.
     */
    execute(code: Instruction[]): SchemeValue {
        this.code = code;
        this.pc = 0;
        this.stack = [];
        this.callStack = [];
        this.handlers = [];
        this.instructionCount = 0;

        while (this.pc < this.code.length) {
            this.instructionCount++;
            const instr = this.code[this.pc];
            try {
            // console.log(`VM Trace: PC=${this.pc} OP=${instr.op} Stack=[${this.stack.map(s => schemeToString(s)).join(', ')}]`);

            switch (instr.op) {
                case 'CONST':
                    this.stack.push(instr.value);
                    this.pc++;
                    break;

                case 'LOOKUP': {
                    const found = this.env.lookup(instr.name);
                    this.stack.push(found);
                    this.tracer?.record({
                        kind: 'lookup', depth: this.callStack.length,
                        label: instr.name, detail: `→ ${this.brief(found)}`
                    });
                    this.pc++;
                    break;
                }

                case 'DEFINE': {
                    const bound = this.nameIfAnonymous(this.stack.pop()!, instr.name);
                    this.env.define(instr.name, bound);
                    this.tracer?.record({
                        kind: 'bind', depth: this.callStack.length,
                        label: instr.name, detail: this.brief(bound)
                    });
                    this.stack.push({ type: 'symbol', value: instr.name });
                    this.pc++;
                    break;
                }

                case 'SET':
                    // Naming here matters for letrec, which binds a hole and
                    // then assigns the real closure -- without this every
                    // recursive procedure would trace as "lambda".
                    this.env.assign(instr.name, this.nameIfAnonymous(this.stack.pop()!, instr.name));
                    this.pc++;
                    break;

                case 'CLOSURE':
                    const closure: Procedure = {
                        isBuiltin: false,
                        params: instr.params,
                        body: { type: 'bytecode', code: instr.body } as any, // Temporary hack to store bytecode in body
                        env: this.env
                    };
                    this.stack.push(makeProcedure(closure));
                    this.pc++;
                    break;

                case 'APPLY': {
                    const procVal = this.stack.pop()!;
                    const args: SchemeValue[] = [];
                    // Arguments were pushed left to right, so popping and
                    // unshifting restores their original order.
                    for (let i = 0; i < instr.argCount; i++) args.unshift(this.stack.pop()!);
                    this.doApply(procVal, args);
                    break;
                }

                case 'TAIL_APPLY': {
                    const procVal = this.stack.pop()!;
                    const args: SchemeValue[] = [];
                    for (let i = 0; i < instr.argCount; i++) args.unshift(this.stack.pop()!);
                    this.doTailApply(procVal, args);
                    break;
                }

                case 'RETURN':
                    this.tracer?.record({
                        kind: 'return', depth: Math.max(0, this.callStack.length - 1),
                        detail: this.stack.length ? this.brief(this.stack[this.stack.length - 1]) : ''
                    });
                    if (this.callStack.length === 0) {
                        return this.stack[this.stack.length - 1];
                    }
                    const frame = this.callStack.pop();
                    this.pc = frame.pc;
                    this.code = frame.code;
                    this.env = frame.env;
                    // Leaving a guarded region normally uninstalls its handler,
                    // so a later unrelated error is not caught by a guard whose
                    // body already finished.
                    while (this.handlers.length > 0 &&
                           this.handlers[this.handlers.length - 1].depth > this.callStack.length) {
                        this.handlers.pop();
                    }
                    break;

                case 'JUMP':
                    this.pc += instr.offset;
                    break;

                case 'JUMP_IF_FALSE':
                    const test = this.stack.pop()!;
                    if (test.type === 'boolean' && test.value === false) {
                        this.pc += instr.offset;
                    } else {
                        this.pc++;
                    }
                    break;

                case 'CALL_CC': {
                    const receiver = this.stack.pop()!;

                    // Capture current state
                    const capturedStack = [...this.stack];
                    const capturedEnv = this.env;
                    // We expect CALL_CC to be followed by APPLY 1. 
                    // So we capture the state AFTER that APPLY would return.
                    const capturedPC = this.pc + 2;
                    const capturedCode = this.code;
                    const capturedCallStack = [...this.callStack];

                    const continuation: Procedure = {
                        isBuiltin: true,
                        isContinuation: true,
                        name: 'continuation',
                        call: (args) => {
                            // Restore state
                            this.stack = [...capturedStack, args[0]];
                            this.env = capturedEnv;
                            this.pc = capturedPC;
                            this.code = capturedCode;
                            this.callStack = [...capturedCallStack];
                            return args.length === 0
                                ? ({ type: 'symbol', value: '#<void>' } as SchemeValue)
                                : args[0];
                        }
                    };

                    this.tracer?.record({
                        kind: 'capture', depth: this.callStack.length,
                        label: 'call/cc', detail: 'save point'
                    });
                    this.stack.push(makeProcedure(continuation));
                    this.stack.push(receiver);
                    this.pc++;
                    break;
                }

                case 'HALT':
                    return this.stack[this.stack.length - 1];
            }
            } catch (err) {
                // Deliver the condition to the innermost guard, restoring the
                // control state captured when that guard was entered. With no
                // handler installed the error is the host's problem again.
                if (this.handlers.length === 0) throw err;

                const frame = this.handlers.pop()!;
                const condition = err instanceof SchemeRaise
                    ? err.condition
                    : ({ type: 'string', value: (err as Error).message } as SchemeValue);

                this.stack = [...frame.stack];
                this.pc = frame.pc;
                this.code = frame.code;
                this.env = frame.env;
                this.callStack = [...frame.callStack];

                this.doApply(frame.handler, [condition]);
            }
        }

        return this.stack[this.stack.length - 1] || { type: 'null', value: null };
    }

    /**
     * Applies a procedure in tail position.
     *
     * The difference from doApply is one line and the whole point of proper
     * tail calls: a Scheme closure REPLACES the current frame rather than
     * stacking on top of it, so the callee returns straight to our caller and
     * the call stack stops growing. Builtins and the VM-handled specials have
     * no frame to replace, so they fall back to the ordinary path followed by
     * a return.
     */
    private doTailApply(procVal: SchemeValue, args: SchemeValue[]) {
        if (procVal.type !== 'procedure') {
            throw new Error(`Not a procedure: ${schemeToString(procVal)}`);
        }
        const proc: Procedure = procVal.value;

        const isSpecial = proc.isBuiltin &&
            (proc.name === 'apply' || proc.name === '%guard' || proc.isContinuation);

        if (proc.isBuiltin || isSpecial) {
            this.doApply(procVal, args);
            if (proc.isContinuation) return;   // already jumped
            this.performReturn();
            return;
        }

        // Reuse the current frame.
        this.env = (proc.env as Environment).extend(proc.params!, args);
        this.code = (proc.body as any).code;
        this.pc = 0;
        this.tracer?.record({
            kind: 'tail-call', depth: this.callStack.length,
            label: this.procName(proc),
            detail: args.map(a => this.brief(a)).join(' ')
        });
    }

    /** The RETURN instruction's behaviour, reusable from tail application. */
    private performReturn(): void {
        this.tracer?.record({
            kind: 'return', depth: Math.max(0, this.callStack.length - 1),
            detail: this.stack.length ? this.brief(this.stack[this.stack.length - 1]) : ''
        });
        if (this.callStack.length === 0) {
            this.pc = this.code.length;   // halt the loop; result is on the stack
            return;
        }
        const frame = this.callStack.pop();
        this.pc = frame.pc;
        this.code = frame.code;
        this.env = frame.env;
        while (this.handlers.length > 0 &&
               this.handlers[this.handlers.length - 1].depth > this.callStack.length) {
            this.handlers.pop();
        }
    }

    private doApply(procVal: SchemeValue, args: SchemeValue[]) {
        if (procVal.type !== 'procedure') {
            throw new Error(`Not a procedure: ${schemeToString(procVal)}`);
        }

        const proc: Procedure = procVal.value;

        // (%guard body-thunk handler): install the handler, then run the body.
        // This lives in the VM because a builtin cannot install control state
        // that outlives its own call.
        if (proc.name === '%guard' && proc.isBuiltin) {
            const [bodyThunk, handler] = args;
            this.handlers.push({
                handler,
                stack: [...this.stack],
                pc: this.pc + 1,
                code: this.code,
                env: this.env,
                callStack: [...this.callStack],
                depth: this.callStack.length
            });
            this.doApply(bodyThunk, []);
            return;
        }

        // Handle 'apply' specially
        if (proc.name === 'apply' && proc.isBuiltin) {
            if (args.length < 2) throw new Error("apply: expects at least 2 arguments");
            const targetProc = args[0];
            const fixedArgs = args.slice(1, args.length - 1);
            const listArg = args[args.length - 1];

            const spreadArgs = listToArray(listArg);
            const finalArgs = [...fixedArgs, ...spreadArgs];

            // Recursive application with flattened args
            this.doApply(targetProc, finalArgs);
            return;
        }

        if (proc.isContinuation) {
            this.tracer?.record({
                kind: 'warp', depth: this.callStack.length,
                label: 'continuation',
                detail: args.length ? `carrying ${this.brief(args[0])}` : 'no value'
            });
            // The continuation's own call() has already set stack, pc, code and
            // env to the captured point. Touching any of them here would undo
            // the jump -- which is exactly what made (k v) fail before.
            proc.call!(args);
            return;
        }

        if (proc.isBuiltin) {
            this.stack.push(proc.call!(args));
            this.pc++;
        } else {
            // Enter function -- this PUSHES a frame, which is the thing a tail
            // call avoids.
            this.callStack.push({ pc: this.pc + 1, code: this.code, env: this.env });
            this.env = (proc.env as Environment).extend(proc.params!, args);
            this.code = (proc.body as any).code;
            this.pc = 0;
            this.tracer?.record({
                kind: 'call', depth: this.callStack.length,
                label: this.procName(proc),
                detail: args.map(a => this.brief(a)).join(' ')
            });
        }
    }
}
