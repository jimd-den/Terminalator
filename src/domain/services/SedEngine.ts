/**
 * SedEngine - Domain Service
 * 
 * Provides parsing and execution of sed scripts.
 */

export interface SedAddress {
    type: 'line' | 'regex' | 'last';
    value: number | RegExp | null;
}

export interface SedInstruction {
    addresses: SedAddress[];
    function: string;
    arguments: any;
    negated: boolean;
    label?: string;
    jumpTarget?: number;
}

export interface SedState {
    patternSpace: string;
    holdSpace: string;
    lineNumber: number;
    isLastLine: boolean;
    deleted: boolean;
    printed: string[];
    nextCycle: boolean;
    quit: boolean;
    substSuccess: boolean;
    rangeActive: boolean[];
    rangeEnding: boolean[];
    appendBuffer: string[];
    insertBuffer: string[];

    // For n, N support
    lines: string[];
    currentIndex: number;
    suppressAutoPrint: boolean;
}

export class SedParser {
    static parse(script: string, ere: boolean = false): SedInstruction[] {
        const instructions: SedInstruction[] = [];
        const lines = script.split('\n');
        let i = 0;

        while (i < lines.length) {
            let line = lines[i].trim();
            if (!line || line.startsWith('#')) { i++; continue; }

            const match = line.match(/^([0-9, /$.!]*?)([aic])\\?$/);
            if (match) {
                const addresses = this.parseAddresses(match[1]);
                const func = match[2];
                let text = '';
                i++;
                while (i < lines.length) {
                    const nextLine = lines[i];
                    if (nextLine.endsWith('\\')) {
                        text += nextLine.slice(0, -1) + '\n';
                        i++;
                    } else {
                        text += nextLine;
                        i++;
                        break;
                    }
                }
                instructions.push({ addresses: addresses.addresses, function: func, arguments: text, negated: addresses.negated });
                continue;
            }

            const parts = this.splitCommands(line);
            for (const part of parts) {
                instructions.push(this.parseSingle(part.trim(), ere));
            }
            i++;
        }
        return this.resolveJumpsAndLabels(instructions);
    }

    private static parseAddresses(src: string): { addresses: SedAddress[], negated: boolean } {
        let s = src.trim();
        let negated = false;
        if (s.endsWith('!')) { negated = true; s = s.slice(0, -1).trim(); }
        const addresses: SedAddress[] = [];
        const parts = s.split(',').map(p => p.trim()).filter(p => p.length > 0);
        for (const p of parts) {
            if (p === '$') addresses.push({ type: 'last', value: null });
            else if (p.startsWith('/')) {
                const end = p.lastIndexOf('/');
                addresses.push({ type: 'regex', value: new RegExp(p.slice(1, end)) });
            } else if (p.match(/^\d+$/)) {
                addresses.push({ type: 'line', value: parseInt(p) });
            }
        }
        return { addresses, negated };
    }

    private static splitCommands(line: string): string[] {
        const result: string[] = [];
        let current = '';
        let mode: 'normal' | 's' | 'regex' = 'normal';
        let delim = '';
        let delimCount = 0;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (mode === 'normal') {
                if (char === ';') { result.push(current); current = ''; }
                else if (char === '{' || char === '}') { result.push(current); result.push(char); current = ''; }
                else if (char === '/') { mode = 'regex'; delim = '/'; current += char; }
                else if (char === 's') {
                    const next = line[i + 1];
                    if (next && !next.match(/[ \n\t0-9a-zA-Z]/)) {
                        mode = 's'; delim = next; delimCount = 1; current += char + next; i++;
                    } else current += char;
                } else current += char;
            } else if (mode === 'regex') {
                current += char;
                if (char === delim && line[i - 1] !== '\\') mode = 'normal';
            } else if (mode === 's') {
                current += char;
                if (char === delim && line[i - 1] !== '\\') {
                    delimCount++;
                    if (delimCount === 3) mode = 'normal';
                }
            }
        }
        if (current) result.push(current);
        return result.filter(r => r.trim().length > 0);
    }

    private static parseSingle(cmd: string, ere: boolean): SedInstruction {
        let src = cmd;
        if (src === '{' || src === '}') return { addresses: [], function: src, arguments: {}, negated: false };
        const addrInfo = this.extractAddresses(src);
        src = addrInfo.remaining;
        const addresses = addrInfo.addresses;
        let negated = false;
        if (src.startsWith('!')) { negated = true; src = src.slice(1).trim(); }
        const funcChar = src[0];
        if (!funcChar) return { addresses, function: '#', arguments: {}, negated: false };
        const argsStr = src.slice(1).trim();
        return {
            addresses,
            function: funcChar,
            arguments: this.parseArgs(funcChar, argsStr, ere),
            negated,
            label: funcChar === ':' ? argsStr : undefined
        };
    }

    private static extractAddresses(src: string): { addresses: SedAddress[], remaining: string } {
        let current = src.trim();
        const addresses: SedAddress[] = [];
        while (current.length > 0) {
            const addr = this.consumeAddress(current);
            if (!addr) break;
            addresses.push(addr.address);
            current = addr.remaining.trim();
            if (current.startsWith(',')) current = current.slice(1).trim();
            else break;
        }
        return { addresses, remaining: current };
    }

    private static consumeAddress(src: string): { address: SedAddress, remaining: string } | null {
        if (src.startsWith('$')) return { address: { type: 'last', value: null }, remaining: src.slice(1) };
        const lineMatch = src.match(/^(\d+)/);
        if (lineMatch) return { address: { type: 'line', value: parseInt(lineMatch[1]) }, remaining: src.slice(lineMatch[0].length) };
        if (src.startsWith('/')) {
            let end = -1;
            for (let i = 1; i < src.length; i++) {
                if (src[i] === '/' && src[i - 1] !== '\\') { end = i; break; }
            }
            if (end !== -1) {
                const pattern = src.slice(1, end);
                return { address: { type: 'regex', value: new RegExp(pattern) }, remaining: src.slice(end + 1) };
            }
        }
        return null;
    }

    private static parseArgs(func: string, argsStr: string, ere: boolean): any {
        switch (func) {
            case 's': {
                const delim = argsStr[0];
                if (!delim) throw new Error("Missing delimiter");
                const parts: string[] = [];
                let current = '';
                let dCount = 0;
                for (let i = 1; i < argsStr.length; i++) {
                    if (argsStr[i] === delim && argsStr[i - 1] !== '\\') {
                        parts.push(current); current = ''; dCount++;
                        if (dCount === 2) { parts.push(argsStr.slice(i + 1)); break; }
                    } else current += argsStr[i];
                }
                if (dCount < 2) throw new Error("Unfinished s command");
                const pattern = parts[0] || '';
                const replacement = parts[1] || '';
                const flagsStr = parts[2] || '';
                let finalPattern = pattern;
                let finalReplacement = replacement;
                if (!ere) {
                    finalPattern = pattern.replace(/\\\(/g, '(').replace(/\\\)/g, ')').replace(/\\\+/g, '+');
                    finalReplacement = replacement.replace(/\\(\d)/g, '$$$1');
                }
                finalReplacement = finalReplacement.replace(/(?<!\\)&/g, '$$&').replace(/\\&/g, '&');
                const flags = {
                    global: flagsStr.includes('g'),
                    print: flagsStr.includes('p'),
                    ignoreCase: flagsStr.includes('i'),
                    nth: parseInt(flagsStr.match(/\d+/)?.[0] || '0')
                };
                return {
                    pattern: new RegExp(finalPattern, (flags.global ? 'g' : '') + (flags.ignoreCase ? 'i' : '')),
                    replacement: finalReplacement,
                    flags
                };
            }
            case 'a': case 'i': case 'c': return argsStr.replace(/^\\?\n?/, '').replace(/\\n/g, '\n').replace(/\\$/, '');
            case 'y': {
                const delim = argsStr[0];
                const parts = argsStr.slice(1).split(delim);
                return { srcMap: parts[0], destMap: parts[1] };
            }
            case 'b': case 't': case ':': return argsStr.split(/[; \n]/)[0];
            default: return argsStr;
        }
    }

    private static resolveJumpsAndLabels(instructions: SedInstruction[]): SedInstruction[] {
        const labels: Map<string, number> = new Map();
        for (let i = 0; i < instructions.length; i++) {
            if (instructions[i].function === ':') labels.set(instructions[i].label!, i);
        }
        const stack: number[] = [];
        for (let i = 0; i < instructions.length; i++) {
            const inst = instructions[i];
            if (inst.function === 'b' || inst.function === 't') {
                if (inst.arguments) inst.jumpTarget = labels.get(inst.arguments);
                else inst.jumpTarget = instructions.length;
            } else if (inst.function === '{') stack.push(i);
            else if (inst.function === '}') {
                const start = stack.pop();
                if (start !== undefined) instructions[start].jumpTarget = i + 1;
            }
        }
        return instructions;
    }
}

export class SedVM {
    static execute(instructions: SedInstruction[], state: SedState): SedState {
        let currentState: SedState = { ...state, deleted: false, printed: [], nextCycle: false, insertBuffer: [], appendBuffer: [] };
        if (currentState.rangeActive.length < instructions.length) {
            currentState.rangeActive = new Array(instructions.length).fill(false);
            currentState.rangeEnding = new Array(instructions.length).fill(false);
        }

        for (let i = 0; i < instructions.length; i++) {
            if (currentState.quit || currentState.nextCycle) break;
            const inst = instructions[i];
            if (inst.function === '}' || inst.function === ':') continue;

            const matches = this.checkAddress(inst.addresses, currentState, i);
            const shouldExecute = inst.negated ? !matches : matches;

            if (shouldExecute) {
                if (inst.function === '{') continue;
                currentState = this.applyFunction(inst, currentState, i);
                if (inst.function === 'b') {
                    i = (inst.jumpTarget !== undefined ? inst.jumpTarget - 1 : instructions.length);
                } else if (inst.function === 't') {
                    if (currentState.substSuccess) {
                        currentState.substSuccess = false;
                        i = (inst.jumpTarget !== undefined ? inst.jumpTarget - 1 : instructions.length);
                    }
                }
            } else if (inst.function === '{') {
                i = (inst.jumpTarget !== undefined ? inst.jumpTarget - 1 : instructions.length);
            }
        }
        return currentState;
    }

    private static checkAddress(addresses: SedAddress[], state: SedState, instIdx: number): boolean {
        if (addresses.length === 0) return true;
        if (addresses.length === 1) return this.matchSingle(addresses[0], state);
        if (state.rangeActive[instIdx]) {
            if (this.matchSingle(addresses[1], state)) {
                state.rangeActive[instIdx] = false;
                state.rangeEnding[instIdx] = true;
            }
            return true;
        } else if (this.matchSingle(addresses[0], state)) {
            state.rangeActive[instIdx] = true;
            // POSIX: "If the second address is a number less than or equal to the line number first selected, only one line shall be selected."
            if (addresses[1].type === 'line' && (addresses[1].value as number) <= state.lineNumber) {
                state.rangeActive[instIdx] = false;
                state.rangeEnding[instIdx] = true;
                return true;
            }
            // Check if end also matches on same line
            if (this.matchSingle(addresses[1], state)) {
                state.rangeActive[instIdx] = false;
                state.rangeEnding[instIdx] = true;
            }
            return true;
        }
        return false;
    }

    private static matchSingle(addr: SedAddress, state: SedState): boolean {
        if (addr.type === 'line') return state.lineNumber === addr.value;
        if (addr.type === 'regex') return (addr.value as RegExp).test(state.patternSpace);
        if (addr.type === 'last') return state.isLastLine;
        return false;
    }

    private static applyFunction(inst: SedInstruction, state: SedState, instIdx: number): SedState {
        const newState = { ...state };
        switch (inst.function) {
            case 's': {
                const { pattern, replacement, flags } = inst.arguments;
                const old = newState.patternSpace;
                if (flags.nth > 0) {
                    let count = 0;
                    newState.patternSpace = old.replace(new RegExp(pattern.source, pattern.flags + 'g'), (match) => {
                        count++; return count === flags.nth ? match.replace(pattern, replacement) : match;
                    });
                } else newState.patternSpace = old.replace(pattern, replacement);
                if (newState.patternSpace !== old) {
                    newState.substSuccess = true;
                    if (flags.print) newState.printed.push(newState.patternSpace);
                }
                break;
            }
            case 'd': newState.deleted = true; newState.nextCycle = true; break;
            case 'D': {
                const firstNL = newState.patternSpace.indexOf('\n');
                if (firstNL !== -1) {
                    newState.patternSpace = newState.patternSpace.slice(firstNL + 1);
                    newState.nextCycle = true;
                } else {
                    newState.deleted = true;
                    newState.nextCycle = true;
                }
                break;
            }
            case 'p': newState.printed.push(newState.patternSpace); break;
            case 'P': newState.printed.push(newState.patternSpace.split('\n')[0]); break;
            case 'q': newState.quit = true; break;
            case 'h': newState.holdSpace = newState.patternSpace; break;
            case 'H': newState.holdSpace += (newState.holdSpace ? '\n' : '') + newState.patternSpace; break;
            case 'g': newState.patternSpace = newState.holdSpace; break;
            case 'G': newState.patternSpace += '\n' + newState.holdSpace; break;
            case 'x': { const tmp = newState.patternSpace; newState.patternSpace = newState.holdSpace; newState.holdSpace = tmp; break; }
            case 'y': {
                const { srcMap, destMap } = inst.arguments;
                let res = '';
                for (const char of newState.patternSpace) {
                    const idx = srcMap.indexOf(char);
                    res += idx !== -1 ? destMap[idx] : char;
                }
                newState.patternSpace = res; break;
            }
            case '=': newState.printed.push(newState.lineNumber.toString()); break;
            case 'a': newState.appendBuffer.push(inst.arguments); break;
            case 'i': newState.insertBuffer.push(inst.arguments); break;
            case 'c':
                if (inst.addresses.length < 2 || newState.rangeEnding[instIdx]) {
                    newState.insertBuffer.push(inst.arguments);
                }
                newState.deleted = true;
                newState.nextCycle = true;
                break;
            case 'n': {
                if (!newState.suppressAutoPrint) newState.printed.push(newState.patternSpace);
                for (const al of newState.appendBuffer) newState.printed.push(al);
                newState.appendBuffer = [];
                newState.currentIndex++;
                if (newState.currentIndex < newState.lines.length) {
                    newState.patternSpace = newState.lines[newState.currentIndex];
                    newState.lineNumber = newState.currentIndex + 1;
                    newState.isLastLine = (newState.currentIndex === newState.lines.length - 1);
                    newState.substSuccess = false;
                } else newState.quit = true;
                break;
            }
            case 'N': {
                newState.currentIndex++;
                if (newState.currentIndex < newState.lines.length) {
                    newState.patternSpace += '\n' + newState.lines[newState.currentIndex];
                    newState.lineNumber = newState.currentIndex + 1;
                    newState.isLastLine = (newState.currentIndex === newState.lines.length - 1);
                } else newState.quit = true;
                break;
            }
        }
        return newState;
    }
}
