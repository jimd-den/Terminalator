
import { ShellLexer, Token, TokenType } from './ShellLexer';
import { IShellParserFacade } from './shell/IShellParserFacade';
import { IStatementParser } from './shell/IStatementParser';
import { IfParser } from './shell/IfParser';
import { ForParser } from './shell/ForParser';
import { WhileParser } from './shell/WhileParser';
import { SubshellParser } from './shell/SubshellParser';
import { BlockParser } from './shell/BlockParser';
import { FunctionDefParser } from './shell/FunctionDefParser';
import { SimpleCommandParser } from './shell/SimpleCommandParser';

enum RedirectType {
    Output = '>',
    Append = '>>',
    Input = '<'
}

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

/**
 * ShellParser - Domain Layer
 * 
 * Orchestrates the parsing of shell tokens into an AST using a Strategy-based
 * Recursive Descent approach. Implements IShellParserFacade to allow
 * specialized rules to interact with the shared parsing state.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Master’s Tool (Pragmatic Design Patterns) - Strategy Pattern
 * Pillar: The Balanced Scale (SOLID) - SRP & OCP adherence.
 */
export class ShellParser implements IShellParserFacade {
    private lexer: ShellLexer;
    private tokens: Token[] = [];
    private pos: number = 0;
    private statementParsers: IStatementParser[] = [];

    constructor() {
        this.lexer = new ShellLexer();
        this.registerStrategies();
    }

    private registerStrategies() {
        // Order matters for precedence/lookahead
        this.statementParsers = [
            new FunctionDefParser(),
            new SubshellParser(),
            new BlockParser(),
            new IfParser(),
            new ForParser(),
            new WhileParser(),
            new SimpleCommandParser() // Catch-all
        ];
    }

    public parse(input: string): ASTNode | null {
        if (!input.trim()) return null;
        this.tokens = this.lexer.tokenize(input);
        this.pos = 0;

        return this.parseList();
    }

    public peek(offset: number = 0): Token {
        return this.tokens[this.pos + offset] || { type: TokenType.EOF, value: '', position: -1 };
    }

    public advance(): Token {
        return this.tokens[this.pos++] || { type: TokenType.EOF, value: '', position: -1 };
    }

    public match(type: TokenType): boolean {
        if (this.peek().type === type) {
            this.advance();
            return true;
        }
        return false;
    }

    public isReservedWord(word: string): boolean {
        return ['then', 'else', 'elif', 'fi', 'do', 'done', '}', 'esac'].includes(word);
    }

    // --- Recursive Descent Levels ---

    // Level 1: Sequence (;)
    public parseList(): ASTNode | null {
        let left = this.parseLogicList();

        while (left && (this.peek().type === TokenType.SEMI || this.peek().type === TokenType.NEWLINE)) {
            this.advance(); // consume ; or \n

            const next = this.peek();
            if (next.type === TokenType.EOF ||
                next.type === TokenType.RPAREN ||
                (next.type === TokenType.WORD && this.isReservedWord(next.value))) {
                return left;
            }

            const right = this.parseLogicList();
            if (!right) return left;

            left = {
                type: NodeType.LIST,
                operator: ';',
                left: left,
                right: right
            } as ListNode;
        }
        return left;
    }

    // Level 2: Logic (&&, ||)
    private parseLogicList(): ASTNode | null {
        let left = this.parsePipeline();

        while (left && (this.peek().type === TokenType.AND_IF || this.peek().type === TokenType.OR_IF)) {
            const opToken = this.advance();
            const right = this.parsePipeline();
            if (!right) {
                throw new Error("Syntax Error: Unexpected end of input after " + opToken.value);
            }

            left = {
                type: NodeType.LIST,
                operator: opToken.value as '&&' | '||',
                left: left,
                right: right
            } as ListNode;
        }
        return left;
    }

    // Level 3: Pipeline (|)
    private parsePipeline(): ASTNode | null {
        let left = this.parseCommand();

        if (left && this.peek().type === TokenType.PIPE) {
            const parts = [left];
            while (this.peek().type === TokenType.PIPE) {
                this.advance();
                const right = this.parseCommand();
                if (!right) {
                    throw new Error("Syntax Error: Missing command after pipe");
                }
                parts.push(right);
            }
            return {
                type: NodeType.PIPELINE,
                parts: parts
            } as PipelineNode;
        }

        return left;
    }

    // Level 4: Command (Delegated to strategies)
    public parseCommand(): ASTNode | null {
        for (const strategy of this.statementParsers) {
            if (strategy.canHandle(this)) {
                return strategy.parse(this);
            }
        }
        return null;
    }

    // Helper utilities for strategies
    public isRedirect(token: Token): boolean {
        return (token.type === TokenType.WORD && (token.value === '>' || token.value === '>>' || token.value === '<'));
    }

    public parseRedirect(): RedirectNode {
        const op = this.advance().value;
        if (this.peek().type !== TokenType.WORD) {
            throw new Error(`Syntax Error: Missing filename after redirection ${op}`);
        }
        const file = this.advance().value;
        return {
            type: NodeType.REDIRECT,
            op: op,
            file: file
        };
    }
}

