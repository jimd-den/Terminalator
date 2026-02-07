/**
 * ShellAST.ts - Domain Interfaces
 * 
 * Defines the Abstract Syntax Tree structure for the shell language.
 * Extracted from ShellParser to break circular dependencies.
 */

export enum NodeType {
    COMMAND = 'COMMAND',
    PIPELINE = 'PIPELINE',
    LIST = 'LIST',
    SUBSHELL = 'SUBSHELL',
    FUNCTION_DEF = 'FUNCTION_DEF',
    BLOCK = 'BLOCK',
    REDIRECT = 'REDIRECT',
    IF = 'IF',
    FOR = 'FOR',
    WHILE = 'WHILE'
}

export interface ASTNode {
    type: NodeType;
}

export interface RedirectNode extends ASTNode {
    type: NodeType.REDIRECT;
    op: string; // >, >>, <
    file: string;
}

export interface CommandNode extends ASTNode {
    type: NodeType.COMMAND;
    command: string;
    args: string[];
    redirects: RedirectNode[];
}

export interface PipelineNode extends ASTNode {
    type: NodeType.PIPELINE;
    parts: ASTNode[]; // Usually CommandNodes
}

export interface ListNode extends ASTNode {
    type: NodeType.LIST;
    operator: '&&' | '||' | ';';
    left: ASTNode;
    right: ASTNode;
}

export interface FunctionDefNode extends ASTNode {
    type: NodeType.FUNCTION_DEF;
    name: string;
    body: ASTNode; // Compound command
    redirects: RedirectNode[];
}

export interface BlockNode extends ASTNode {
    type: NodeType.BLOCK; // { ... }
    body: ASTNode;
}

export interface SubshellNode extends ASTNode {
    type: NodeType.SUBSHELL;
    root: ASTNode;
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
    items: string[];
    body: ASTNode;
}

export interface WhileNode extends ASTNode {
    type: NodeType.WHILE;
    condition: ASTNode;
    body: ASTNode;
}
