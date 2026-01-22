/**
 * ShellParser Service - Domain Layer
 *
 * Parses a stream of tokens into an Abstract Syntax Tree (AST).
 * Implements a Recursive Descent Parser for the POSIX shell grammar.
 *
 * Grammar (Simplified):
 *  CompleteCommand : List (SEMI List)*
 *  List            : Pipeline ((AND_IF | OR_IF) Pipeline)*
 *  Pipeline        : Command (PIPE Command)*
 *  Command         : WORD+ | LPAREN List RPAREN
 */

import { ShellLexer, Token, TokenType } from './ShellLexer';

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
    REDIRECT = 'REDIRECT'
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
}

export interface BlockNode extends ASTNode {
    type: NodeType.BLOCK; // { ... }
    body: ASTNode;
}

export interface SubshellNode extends ASTNode {
    type: NodeType.SUBSHELL;
    root: ASTNode;
}

export class ShellParser {
    private lexer: ShellLexer;
    private tokens: Token[] = [];
    private pos: number = 0;

    constructor() {
        this.lexer = new ShellLexer();
    }

    parse(input: string): ASTNode | null {
        if (!input.trim()) return null;
        this.tokens = this.lexer.tokenize(input);
        this.pos = 0;

        const root = this.parseList();

        // If we have remaining tokens (except EOF), that's a list sequence too (implicit ;) or syntax error
        // For simplicity, let's assume parseList handles the highest precedence grouping.
        // Actually, 'List' in our grammar handles && ||. Top level is usually ; separated.

        if (this.peek().type !== TokenType.EOF) {
            // If tokens remain, usually it's a Semicolon chain handled by parseComplete? 
            // Let's defer to parseList handling everything for now or error.
            // But wait, `ls; pwd` -> parseList finds `ls`. Next is `;`.
            // We need a wrapper for Sequences.
        }

        return root;
    }

    private peek(offset: number = 0): Token {
        return this.tokens[this.pos + offset] || { type: TokenType.EOF, value: '', position: -1 };
    }

    private advance(): Token {
        return this.tokens[this.pos++] || { type: TokenType.EOF, value: '', position: -1 };
    }

    private match(type: TokenType): boolean {
        if (this.peek().type === type) {
            this.advance();
            return true;
        }
        return false;
    }

    // --- Recursive Descent Methods ---

    // Top Level: Sequence of Lists separated by SEMI (;)
    // Note: POSIX defines 'List' as AND-OR sequences. 'Complete Command' is List (Sep List)*
    // We will call this parseList for nomenclature, but it handles ; too.
    // Actually, distinct levels:
    // 1. Sequence (;)
    // 2. Logic List (&& ||)
    // 3. Pipeline (|)
    // 4. Command

    // Level 1: Sequence (;)
    private parseList(): ASTNode | null {
        let left = this.parseLogicList();

        while (left && this.peek().type === TokenType.SEMI) {
            this.advance(); // consume ;
            // Allow trailing semicolon (e.g., "ls;")
            if (this.peek().type === TokenType.EOF ||
                this.peek().type === TokenType.RPAREN ||
                (this.peek().type === TokenType.WORD && this.peek().value === '}')) {
                // Return left, but maybe wrap in a list so executor knows it was terminated?
                return left;
            }

            // Also check if next is } without semicolon? 
            // parseList is Sequence. } must be separated by ; or newline.
            // Our ParseList loop requires SEMI. 
            // If input is "cmd }", loop condition `peek() === SEMI` fails, return left.
            // Correct.

            const right = this.parseLogicList();
            if (!right) {
                // "ls; " -> just ls
                return left;
            }

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

    // Level 4: Command (Simple, Compound, or Function)
    private parseCommand(): ASTNode | null {
        // Lookahead for Function Definition: name()
        if (this.isFunctionDefinition()) {
            return this.parseFunctionDefinition();
        }

        const token = this.peek();

        // Subshell ( ... )
        if (token.type === TokenType.LPAREN) {
            this.advance();
            // Allow newlines after (
            while (this.peek().type === TokenType.NEWLINE) this.advance();

            const inner = this.parseList();

            while (this.peek().type === TokenType.NEWLINE) this.advance();

            if (!this.match(TokenType.RPAREN)) {
                throw new Error("Syntax Error: Missing closing parenthesis for subshell");
            }
            return {
                type: NodeType.SUBSHELL,
                root: inner!
            } as SubshellNode;
        }

        // Grouping/Block { ... } - requires token recognition of '{' which is usually WORD in lexer unless reserved?
        // In POSIX, { is a reserved word if it's the start. Lexer returns WORD '{'.
        if (token.type === TokenType.WORD && token.value === '{') {
            return this.parseBlock();
        }

        // Control structures (if, while, etc.) - Future

        return this.parseSimpleCommand();
    }

    private isFunctionDefinition(): boolean {
        // check: WORD + LPAREN + RPAREN
        const t1 = this.peek(0);
        const t2 = this.peek(1);
        const t3 = this.peek(2);

        // Note: Newlines might be between ) and body, but not inside name()
        return t1.type === TokenType.WORD &&
            t2.type === TokenType.LPAREN &&
            t3.type === TokenType.RPAREN;
    }

    private parseFunctionDefinition(): ASTNode {
        const nameToken = this.advance(); // name
        this.advance(); // (
        this.advance(); // )

        // Optional newlines before body
        while (this.peek().type === TokenType.NEWLINE) this.advance();

        const body = this.parseCommand(); // Expect compound command usually
        if (!body) throw new Error(`Syntax Error: Missing body for function ${nameToken.value}`);

        return {
            type: NodeType.FUNCTION_DEF,
            name: nameToken.value,
            body: body
        } as FunctionDefNode;
    }

    private parseBlock(): ASTNode {
        this.advance(); // {
        // Optional newlines
        while (this.peek().type === TokenType.NEWLINE) this.advance();

        const list = this.parseList();

        // Expect }
        // POSIX says } must be on a new line or separated by semi?
        // " The '}' must be separated from the list by a semicolon or newline. "
        // Our parseList usually consumes semicolons.

        while (this.peek().type === TokenType.NEWLINE || this.peek().type === TokenType.SEMI) {
            this.advance();
        }

        const token = this.peek();
        if (token.type !== TokenType.WORD || token.value !== '}') {
            throw new Error("Syntax Error: Missing closing '}' for block");
        }
        this.advance(); // }

        return {
            type: NodeType.BLOCK,
            body: list!
        } as BlockNode;
    }

    private parseSimpleCommand(): ASTNode | null {
        const token = this.peek();

        // Subshell
        if (token.type === TokenType.LPAREN) {
            this.advance();
            const inner = this.parseList(); // Recurse to top
            if (!this.match(TokenType.RPAREN)) {
                throw new Error("Syntax Error: Missing closing parenthesis");
            }
            return {
                type: NodeType.SUBSHELL,
                root: inner!
            } as SubshellNode;
        }

        // Simple Command
        if (token.type === TokenType.WORD) {
            // Reserved word check: } is reserved if it's the first word
            if (token.value === '}') {
                return null; // Don't parse '}' as a command, let caller handle it (e.g. parseBlock)
            }

            const args: string[] = [];
            const redirects: RedirectNode[] = [];

            while (this.peek().type === TokenType.WORD || this.isRedirect(this.peek())) {
                const t = this.peek();
                if (this.isRedirect(t)) {
                    // Start redirect parsing
                    redirects.push(this.parseRedirect());
                } else {
                    args.push(this.advance().value);
                }
            }

            if (args.length === 0 && redirects.length === 0) return null;

            // If args empty but redirects exist? valid command (e.g. > file)
            // But we need a command name usually. POSIX says simple code is optional word...
            // > file is valid.

            const cmdName = args.length > 0 ? args.shift()! : '';

            return {
                type: NodeType.COMMAND,
                command: cmdName,
                args: args,
                redirects: redirects
            } as CommandNode;
        }

        return null; // Empty or unexpected
    }

    private isRedirect(token: Token): boolean {
        // We assume Lexer emits WORD for > ?
        // Or do we need TokenType.REDIRECT?
        // Lexer emits WORD for > unless we change Lexer.
        // My Lexer emits WORD for > (it is not in isOperatorStart list? Checking Lexer...)
        return (token.type === TokenType.WORD && (token.value === '>' || token.value === '>>' || token.value === '<'));
    }

    private parseRedirect(): RedirectNode {
        const op = this.advance().value; // >
        // Next must be filename (WORD)
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

