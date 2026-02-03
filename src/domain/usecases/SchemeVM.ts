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

export type Instruction =
    | { op: 'CONST', value: SchemeValue }
    | { op: 'LOOKUP', name: string }
    | { op: 'DEFINE', name: string }
    | { op: 'SET', name: string }
    | { op: 'CLOSURE', params: string[], body: Instruction[] }
    | { op: 'APPLY', argCount: number }
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
    private instructionCount: number = 0;

    constructor(env: Environment) {
        this.env = env;
    }

    public getInstructionCount(): number {
        return this.instructionCount;
    }

    /**
     * Executes a sequence of instructions.
     */
    execute(code: Instruction[]): SchemeValue {
        this.code = code;
        this.pc = 0;
        this.stack = [];
        this.callStack = [];
        this.instructionCount = 0;

        while (this.pc < this.code.length) {
            this.instructionCount++;
            const instr = this.code[this.pc];
            // console.log(`VM Trace: PC=${this.pc} OP=${instr.op} Stack=[${this.stack.map(s => schemeToString(s)).join(', ')}]`);

            switch (instr.op) {
                case 'CONST':
                    this.stack.push(instr.value);
                    this.pc++;
                    break;

                case 'LOOKUP':
                    this.stack.push(this.env.lookup(instr.name));
                    this.pc++;
                    break;

                case 'DEFINE':
                    this.env.define(instr.name, this.stack.pop()!);
                    this.stack.push({ type: 'symbol', value: instr.name });
                    this.pc++;
                    break;

                case 'SET':
                    this.env.assign(instr.name, this.stack.pop()!);
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
                    const argCount = instr.argCount;
                    const procVal = this.stack.pop()!;
                    const args: SchemeValue[] = [];
                    for (let i = 0; i < argCount; i++) args.unshift(this.stack.pop()!); // Order: Arg1, Arg2... from stack bottom?
                    // Wait, unshift puts at beginning. 
                    // Stack: [A1, A2, A3]. Pop -> A3. Unshift -> [A3].
                    // Pop -> A2. Unshift -> [A2, A3].
                    // Correct.

                    this.doApply(procVal, args);
                    break;
                }

                case 'RETURN':
                    if (this.callStack.length === 0) {
                        return this.stack[this.stack.length - 1];
                    }
                    const frame = this.callStack.pop();
                    this.pc = frame.pc;
                    this.code = frame.code;
                    this.env = frame.env;
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
                        name: 'continuation',
                        call: (args) => {
                            // Restore state
                            this.stack = [...capturedStack, args[0]];
                            this.env = capturedEnv;
                            this.pc = capturedPC;
                            this.code = capturedCode;
                            this.callStack = [...capturedCallStack];
                            return args[0];
                        }
                    };

                    this.stack.push(makeProcedure(continuation));
                    this.stack.push(receiver);
                    this.pc++;
                    break;
                }

                case 'HALT':
                    return this.stack[this.stack.length - 1];
            }
        }

        return this.stack[this.stack.length - 1] || { type: 'null', value: null };
    }

    private doApply(procVal: SchemeValue, args: SchemeValue[]) {
        if (procVal.type !== 'procedure') {
            throw new Error(`Not a procedure: ${schemeToString(procVal)}`);
        }

        const proc: Procedure = procVal.value;

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

        if (proc.isBuiltin) {
            this.stack.push(proc.call!(args));
            this.pc++;
        } else {
            // Enter function
            this.callStack.push({ pc: this.pc + 1, code: this.code, env: this.env });
            this.env = (proc.env as Environment).extend(proc.params!, args);
            this.code = (proc.body as any).code;
            this.pc = 0;
        }
    }
}
