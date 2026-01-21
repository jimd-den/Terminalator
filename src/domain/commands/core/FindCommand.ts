/**
 * FindCommand - Core Command
 *
 * Searches for files in a directory hierarchy.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 * Pillar: The Storyteller’s Code (Literate Documentation)
 *
 * Intent:
 * Allows the operator to search for files matching specific criteria.
 */

import { ICommand } from '../ICommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../usecases/ExecuteCommand';
import { FileSystemService } from '../../services/FileSystemService';
import { Dentry, S_IFDIR, S_IFREG, S_IFLNK } from '../../entities/FileSystem';

// Expression Node Types
type ExpressionNode =
    | { type: 'AND', left: ExpressionNode, right: ExpressionNode }
    | { type: 'OR', left: ExpressionNode, right: ExpressionNode }
    | { type: 'NOT', expr: ExpressionNode }
    | { type: 'PREDICATE', name: string, args: string[] };

interface ExecutionContext {
    prune: boolean;
    execPlusBuffers: Map<string, { cmd: string[], paths: string[] }>;
}

export class FindCommand implements ICommand {
    constructor(private fs: FileSystemService) { }

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const { paths, expressionArgs, options } = this.parseArguments(args);

        // Default path is '.'
        if (paths.length === 0) paths.push('.');

        // Parse expression
        const parseResult = this.parseExpression(expressionArgs);
        if (parseResult.error) {
            return { output: parseResult.error, newState: state, exitCode: 1 };
        }

        let rootExpr = parseResult.expr;

        if (!rootExpr) {
            rootExpr = { type: 'PREDICATE', name: '-print', args: [] };
        } else {
            if (!this.hasSideEffect(rootExpr)) {
                rootExpr = {
                    type: 'AND',
                    left: rootExpr,
                    right: { type: 'PREDICATE', name: '-print', args: [] }
                };
            }
        }

        const depth = this.hasDepth(rootExpr);

        const results: string[] = [];
        const execContext: ExecutionContext = {
            prune: false,
            execPlusBuffers: new Map()
        };

        for (const path of paths) {
            let startPath = path;
            if (!startPath.startsWith('/')) {
                startPath = state.currentDirectory === '/'
                    ? `/${path}`
                    : `${state.currentDirectory}/${path}`;
            }

            const startNode = this.fs.resolve(startPath, state.currentDirectory, options.followSymlinks);
            if (!startNode) {
                return { output: `find: \`${path}\`: No such file or directory`, newState: state, exitCode: 1 };
            }

            this.traverse(startNode, path, rootExpr, results, execContext, depth, options.followSymlinks);
        }

        // Flush exec + buffers
        for (const [key, data] of execContext.execPlusBuffers) {
            if (data.paths.length > 0) {
                if (data.cmd[0] === 'echo') {
                    const fixedArgs = data.cmd.slice(1);
                    const allArgs = [...fixedArgs, ...data.paths];
                    results.push(allArgs.join(' ') + '\n');
                }
            }
        }

        return {
            output: results.join(''),
            newState: state,
            exitCode: 0
        };
    }

    private hasSideEffect(expr: ExpressionNode): boolean {
        switch (expr.type) {
            case 'AND':
            case 'OR':
                return this.hasSideEffect(expr.left) || this.hasSideEffect(expr.right);
            case 'NOT':
                return this.hasSideEffect(expr.expr);
            case 'PREDICATE':
                return ['-print', '-print0', '-exec', '-ok', '-delete'].includes(expr.name);
        }
    }

    private hasDepth(expr: ExpressionNode): boolean {
        switch (expr.type) {
            case 'AND':
            case 'OR':
                return this.hasDepth(expr.left) || this.hasDepth(expr.right);
            case 'NOT':
                return this.hasDepth(expr.expr);
            case 'PREDICATE':
                return expr.name === '-depth';
        }
    }

    private parseArguments(args: string[]): { paths: string[], expressionArgs: string[], options: { followSymlinks: boolean } } {
        const paths: string[] = [];
        const expressionArgs: string[] = [];
        const options = { followSymlinks: false }; // Default find behavior is NO follow, -L enables it.

        let inPaths = true;

        for (let i = 0; i < args.length; i++) {
            const arg = args[i];

            // Global options must appear before paths
            if (inPaths) {
                if (arg === '-H') {
                    // Follow symlinks on command line only (not fully impl, treating as -L for now or ignored)
                    continue;
                }
                if (arg === '-L') {
                    options.followSymlinks = true;
                    continue;
                }
                if (arg === '-P') {
                    options.followSymlinks = false;
                    continue;
                }

                // If it starts with - (and not option), or ! or (, it's start of expression
                // But paths can start with -? No, POSIX says if arg starts with -, it's expression unless it's --?
                // "The first operand that starts with -, or is ! or (, ... shall be interpreted as expression".
                if (arg.startsWith('-') || arg === '!' || arg === '(' || arg === '\\(') {
                    inPaths = false;
                    expressionArgs.push(arg);
                } else {
                    paths.push(arg);
                }
            } else {
                expressionArgs.push(arg);
            }
        }
        return { paths, expressionArgs, options };
    }

    private parseExpression(args: string[]): { expr?: ExpressionNode, error?: string } {
        const units: any[] = [];
        const knownPredicates = [
            '-name', '-type', '-path', '-user', '-group', '-size', '-perm', '-newer',
            '-maxdepth', '-depth', '-print', '-print0', '-prune', '-exec', '-ok'
        ];

        for (let i = 0; i < args.length; i++) {
            let arg = args[i];
            if (arg === '\\(') arg = '(';
            if (arg === '\\)') arg = ')';

            if (arg === '(' || arg === ')' || arg === '!' || arg === '-o' || arg === '-a') {
                units.push({ type: 'OP', val: arg });
            } else if (arg.startsWith('-')) {
                const name = arg;
                if (!knownPredicates.includes(name)) {
                    return { error: `find: unknown predicate \`${name}\`` };
                }

                const cmdArgs: string[] = [];
                const oneArg = ['-name', '-type', '-path', '-user', '-group', '-size', '-perm', '-newer', '-maxdepth'];

                if (oneArg.includes(name)) {
                    if (i + 1 >= args.length) return { error: `find: missing argument to \`${name}\`` };
                    cmdArgs.push(args[++i]);
                } else if (name === '-exec') {
                    i++;
                    let foundTerminator = false;
                    while(i < args.length) {
                        const sub = args[i];
                        if (sub === ';' || sub === '+') {
                            cmdArgs.push(sub);
                            foundTerminator = true;
                            break;
                        }
                        cmdArgs.push(sub);
                        i++;
                    }
                    if (!foundTerminator) {
                        return { error: `find: missing argument to \`-exec\`` };
                    }
                }
                units.push({ type: 'PRED', name, args: cmdArgs });
            } else {
                 return { error: `find: paths must precede expression: \`${arg}\`` };
            }
        }

        let pos = 0;

        const parseOr = (): ExpressionNode | null => {
            let left = parseAnd();
            if (!left) return null;
            while (pos < units.length && units[pos].type === 'OP' && units[pos].val === '-o') {
                pos++;
                const right = parseAnd();
                if (!right) throw new Error('find: missing expression after -o');
                left = { type: 'OR', left, right };
            }
            return left;
        };

        const parseAnd = (): ExpressionNode | null => {
            let left = parseNot();
            if (!left) return null;
            while (pos < units.length) {
                if (units[pos].type === 'OP' && (units[pos].val === '-o' || units[pos].val === ')')) {
                    break;
                }
                if (units[pos].type === 'OP' && units[pos].val === '-a') {
                    pos++;
                }
                const right = parseNot();
                if (!right) break;
                left = { type: 'AND', left, right };
            }
            return left;
        };

        const parseNot = (): ExpressionNode | null => {
            if (pos < units.length && units[pos].type === 'OP' && units[pos].val === '!') {
                pos++;
                const expr = parseNot();
                if (!expr) throw new Error('find: missing expression after !');
                return { type: 'NOT', expr };
            }
            return parsePrimary();
        };

        const parsePrimary = (): ExpressionNode | null => {
            if (pos >= units.length) return null;
            const u = units[pos];
            if (u.type === 'OP' && u.val === '(') {
                pos++;
                const expr = parseOr();
                if (pos >= units.length || units[pos].val !== ')') {
                    throw new Error('find: missing )');
                }
                pos++;
                return expr;
            }
            if (u.type === 'PRED') {
                pos++;
                return { type: 'PREDICATE', name: u.name, args: u.args };
            }
            return null;
        };

        try {
            const expr = parseOr();
            if (pos < units.length) {
                return { error: `find: unexpected token \`${units[pos].val || units[pos].name}\`` };
            }
            return { expr: expr || undefined };
        } catch (e: any) {
            return { error: e.message };
        }
    }

    private traverse(node: Dentry, currentPath: string, rootExpr: ExpressionNode, results: string[], execContext: ExecutionContext, depth: boolean, followSymlinks: boolean) {
        execContext.prune = false;

        // Symlink resolution for type check?
        // If followSymlinks (-L), traverse follows links.
        // `node` passed here is the Dentry.
        // `evaluate` uses `fs.getInode(node.inodeId)`.
        // If node is link and -L, `fs.resolve` should have resolved it?
        // `startNode` was resolved with `followSymlinks`.
        // During recursion, we get `child`.
        // We should resolve `child` if -L.

        let targetNode = node;
        if (followSymlinks) {
            // resolve target.
            // But we are inside recursion using Dentries.
            // If `node` is symlink, we need target.
            // We can check inode mode.
            const inode = this.fs.getInode(node.inodeId);
            if (inode && (inode.mode & S_IFLNK)) {
                // It is a link.
                // We need to resolve it relative to its parent (implied by currentPath).
                // Or simply `fs.resolve(currentPath)`.
                const resolved = this.fs.resolve(currentPath, '/', true);
                if (resolved) targetNode = resolved;
            }
        }

        if (depth) {
            this.recurse(targetNode, currentPath, rootExpr, results, execContext, depth, followSymlinks);
            this.evaluate(targetNode, currentPath, rootExpr, execContext, results);
        } else {
            this.evaluate(targetNode, currentPath, rootExpr, execContext, results);
            if (!execContext.prune) {
                this.recurse(targetNode, currentPath, rootExpr, results, execContext, depth, followSymlinks);
            }
        }
    }

    private recurse(node: Dentry, currentPath: string, rootExpr: ExpressionNode, results: string[], execContext: ExecutionContext, depth: boolean, followSymlinks: boolean) {
        const inode = this.fs.getInode(node.inodeId);
        if (inode && (inode.mode & S_IFDIR)) {
            const children = Array.from(node.children.entries()).sort((a, b) => a[0].localeCompare(b[0]));
            for (const [name, child] of children) {
                let childPath = currentPath.endsWith('/') ? `${currentPath}${name}` : `${currentPath}/${name}`;
                if (currentPath === '/') childPath = `/${name}`;
                this.traverse(child, childPath, rootExpr, results, execContext, depth, followSymlinks);
            }
        }
    }

    private evaluate(node: Dentry, path: string, expr: ExpressionNode, state: ExecutionContext, results: string[]): boolean {
        const inode = this.fs.getInode(node.inodeId);
        if (!inode) return false;

        switch (expr.type) {
            case 'AND':
                return this.evaluate(node, path, expr.left, state, results) && this.evaluate(node, path, expr.right, state, results);
            case 'OR':
                return this.evaluate(node, path, expr.left, state, results) || this.evaluate(node, path, expr.right, state, results);
            case 'NOT':
                return !this.evaluate(node, path, expr.expr, state, results);
            case 'PREDICATE':
                switch (expr.name) {
                    case '-name': {
                        let pattern = expr.args[0];
                        if ((pattern.startsWith('"') && pattern.endsWith('"')) || (pattern.startsWith("'") && pattern.endsWith("'"))) {
                            pattern = pattern.slice(1, -1);
                        }
                        const re = '^' + pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$';
                        return new RegExp(re).test(node.name);
                    }
                    case '-type': {
                        const t = expr.args[0];
                        if (t === 'f') return (inode.mode & S_IFREG) === S_IFREG;
                        if (t === 'd') return (inode.mode & S_IFDIR) === S_IFDIR;
                        if (t === 'l') return (inode.mode & S_IFLNK) === S_IFLNK;
                        return false;
                    }
                    case '-print':
                        results.push(path + '\n');
                        return true;
                    case '-print0':
                        results.push(path + '\0');
                        return true;
                    case '-prune':
                        state.prune = true;
                        return true;
                    case '-exec': {
                        const cmdArgs = [...expr.args];
                        const terminator = cmdArgs.pop();

                        if (terminator === '+') {
                            const key = cmdArgs.join('\0');
                            if (!state.execPlusBuffers.has(key)) {
                                state.execPlusBuffers.set(key, { cmd: cmdArgs, paths: [] });
                            }
                            state.execPlusBuffers.get(key)!.paths.push(path);
                            return true;
                        } else {
                            const finalArgs = cmdArgs.map(a => a === '{}' ? path : a);
                            if (finalArgs[0] === 'echo') {
                                const output = finalArgs.slice(1).join(' ');
                                results.push(output + '\n');
                                return true;
                            }
                            return true;
                        }
                    }
                    case '-depth':
                        return true;
                    case '-newer': {
                        const refPath = expr.args[0];
                        const refNode = this.fs.resolve(refPath);
                        if (!refNode) return false;
                        const refInode = this.fs.getInode(refNode.inodeId);
                        if (!refInode) return false;
                        return inode.mtime >= refInode.mtime;
                    }
                    case '-path': {
                        let pattern = expr.args[0];
                         if ((pattern.startsWith('"') && pattern.endsWith('"')) || (pattern.startsWith("'") && pattern.endsWith("'"))) {
                            pattern = pattern.slice(1, -1);
                        }
                        const re = '^' + pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$';
                        return new RegExp(re).test(path);
                    }
                    case '-size': {
                        let arg = expr.args[0];
                        let unit = 512;
                        if (arg.endsWith('c')) {
                            unit = 1;
                            arg = arg.slice(0, -1);
                        }

                        let op = 'eq';
                        let numStr = arg;
                        if (arg.startsWith('+')) { op = 'gt'; numStr = arg.substring(1); }
                        else if (arg.startsWith('-')) { op = 'lt'; numStr = arg.substring(1); }

                        const target = parseInt(numStr);
                        if (isNaN(target)) return false;

                        let actual = inode.size;
                        if (unit === 512) actual = Math.ceil(inode.size / 512);

                        if (op === 'gt') return actual > target;
                        if (op === 'lt') return actual < target;
                        return actual === target;
                    }
                    case '-perm': {
                        let modeStr = expr.args[0];
                        let op = 'exact';
                        if (modeStr.startsWith('-')) {
                            op = 'all';
                            modeStr = modeStr.substring(1);
                        }
                        const targetMode = parseInt(modeStr, 8);
                        const currentMode = inode.mode & 0o777; // Only perms

                        if (op === 'exact') return currentMode === targetMode;
                        if (op === 'all') return (currentMode & targetMode) === targetMode;
                        return false;
                    }
                    case '-user': {
                        const u = expr.args[0];
                        if (u === 'operator' && inode.uid === 1000) return true;
                        if (u === 'root' && inode.uid === 0) return true;
                        return false;
                    }
                    case '-group': {
                        const g = expr.args[0];
                        if (g === 'operator' && inode.gid === 1000) return true;
                        return false;
                    }
                    default:
                        return false;
                }
        }
        return false;
    }
}
