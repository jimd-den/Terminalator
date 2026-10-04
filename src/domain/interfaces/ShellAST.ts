/**
 * ShellAST.ts - Domain Interfaces
 *
 * Abstract Syntax Tree for the POSIX Shell Command Language (XCU §2.9–2.10).
 * Words are stored in their raw, still-quoted source form; quoting is only
 * resolved during word expansion, exactly as the standard prescribes.
 */

export enum NodeType {
    COMMAND = 'COMMAND',
    PIPELINE = 'PIPELINE',
    LIST = 'LIST',
    ASYNC = 'ASYNC',
    SUBSHELL = 'SUBSHELL',
    FUNCTION_DEF = 'FUNCTION_DEF',
    BLOCK = 'BLOCK',
    REDIRECT = 'REDIRECT',
    REDIRECTED = 'REDIRECTED',
    IF = 'IF',
    FOR = 'FOR',
    WHILE = 'WHILE',
    CASE = 'CASE',
    TIMED = 'TIMED'
}

export interface ASTNode {
    type: NodeType;
}

export type RedirectOp = '<' | '>' | '>>' | '>|' | '<>' | '<&' | '>&' | '<<' | '<<-';

export interface HereDoc {
    body: string;
    /** True when any part of the delimiter was quoted: the body is then taken literally. */
    quoted: boolean;
}

export interface RedirectNode extends ASTNode {
    type: NodeType.REDIRECT;
    op: RedirectOp;
    /** Explicit file descriptor (IO_NUMBER); defaults to 0 for input ops, 1 for output ops. */
    fd?: number;
    /** Target word (filename, fd number or here-doc delimiter), unexpanded. */
    file: string;
    heredoc?: HereDoc;
}

export interface CommandNode extends ASTNode {
    type: NodeType.COMMAND;
    /** Prefix variable assignments (NAME=value), unexpanded. */
    assignments: string[];
    /** Command name word ('' when the command is only assignments/redirections). */
    command: string;
    args: string[];
    redirects: RedirectNode[];
}

export interface PipelineNode extends ASTNode {
    type: NodeType.PIPELINE;
    parts: ASTNode[];
    /** Leading `!` inverts the pipeline's exit status. */
    negate?: boolean;
}

export interface ListNode extends ASTNode {
    type: NodeType.LIST;
    operator: '&&' | '||' | ';';
    left: ASTNode;
    right: ASTNode;
}

/** A command terminated by `&`: run asynchronously in a subshell environment. */
export interface AsyncNode extends ASTNode {
    type: NodeType.ASYNC;
    body: ASTNode;
}

export interface FunctionDefNode extends ASTNode {
    type: NodeType.FUNCTION_DEF;
    name: string;
    body: ASTNode;
    redirects: RedirectNode[];
}

export interface BlockNode extends ASTNode {
    type: NodeType.BLOCK;
    body: ASTNode;
}

export interface SubshellNode extends ASTNode {
    type: NodeType.SUBSHELL;
    root: ASTNode;
}

/** A compound command followed by a redirect list, e.g. `while ...; done < file`. */
export interface RedirectedNode extends ASTNode {
    type: NodeType.REDIRECTED;
    body: ASTNode;
    redirects: RedirectNode[];
}

export interface IfNode extends ASTNode {
    type: NodeType.IF;
    condition: ASTNode;
    thenBody: ASTNode;
    elseBody?: ASTNode;
}

export interface ForNode extends ASTNode {
    type: NodeType.FOR;
    variable: string;
    /** Word list; undefined means `"$@"` (no `in` clause). */
    items?: string[];
    body: ASTNode | null;
}

export interface WhileNode extends ASTNode {
    type: NodeType.WHILE;
    condition: ASTNode;
    body: ASTNode | null;
    /** `until` loop: runs while the condition FAILS. */
    until?: boolean;
}

export interface CaseItem {
    patterns: string[];
    body: ASTNode | null;
    /** `;&` fall-through is not POSIX; only `;;` is supported. */
}

export interface CaseNode extends ASTNode {
    type: NodeType.CASE;
    word: string;
    items: CaseItem[];
}

/** `time [-p] [pipeline]` (reserved word in bash/ksh): report elapsed time on stderr. */
export interface TimedNode extends ASTNode {
    type: NodeType.TIMED;
    body: ASTNode | null;
    /** -p: POSIX output format. */
    posix: boolean;
}
