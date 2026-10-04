import { ShellLexer, Token, TokenType, REDIRECT_TOKENS } from './ShellLexer';
import { IShellParserFacade } from './shell/IShellParserFacade';
import { IStatementParser } from './shell/IStatementParser';
import { IfParser } from './shell/IfParser';
import { ForParser } from './shell/ForParser';
import { WhileParser } from './shell/WhileParser';
import { CaseParser } from './shell/CaseParser';
import { SubshellParser } from './shell/SubshellParser';
import { BlockParser } from './shell/BlockParser';
import { FunctionDefParser } from './shell/FunctionDefParser';
import { SimpleCommandParser } from './shell/SimpleCommandParser';
import { IncompleteInputError, ShellSyntaxError } from './shell/ShellSyntaxError';
import {
    ASTNode, NodeType, ListNode, PipelineNode, RedirectNode, RedirectOp, AsyncNode, RedirectedNode, TimedNode
} from '../interfaces/ShellAST';

export {
    ASTNode, NodeType, ListNode, PipelineNode, RedirectNode, CommandNode, FunctionDefNode, BlockNode,
    SubshellNode, IfNode, ForNode, WhileNode, CaseNode, AsyncNode, RedirectedNode
} from '../interfaces/ShellAST';

/** Words that close a compound_list when they appear in command position. */
const LIST_TERMINATORS = new Set(['then', 'else', 'elif', 'fi', 'do', 'done', 'esac', '}']);

const REDIRECT_OPS: Partial<Record<TokenType, RedirectOp>> = {
    [TokenType.LESS]: '<',
    [TokenType.GREAT]: '>',
    [TokenType.DGREAT]: '>>',
    [TokenType.CLOBBER]: '>|',
    [TokenType.LESSGREAT]: '<>',
    [TokenType.LESSAND]: '<&',
    [TokenType.GREATAND]: '>&',
    [TokenType.DLESS]: '<<',
    [TokenType.DLESSDASH]: '<<-',
};

/**
 * ShellParser - Domain Layer
 *
 * Recursive-descent parser for the POSIX shell grammar (XCU §2.10.2).
 * Compound commands are delegated to IStatementParser strategies (OCP);
 * this class owns the list / and-or / pipeline levels and alias substitution.
 */
export class ShellParser implements IShellParserFacade {
    private lexer = new ShellLexer();
    private tokens: Token[] = [];
    private pos = 0;
    private aliases: Record<string, string> = {};
    private readonly statementParsers: IStatementParser[] = [
        new FunctionDefParser(),
        new SubshellParser(),
        new BlockParser(),
        new IfParser(),
        new ForParser(),
        new WhileParser(),
        new CaseParser(),
        new SimpleCommandParser(),
    ];

    /**
     * Parses a complete program. Returns null for empty input.
     * @throws IncompleteInputError when more input is needed (PS2 continuation)
     * @throws ShellSyntaxError on malformed input
     */
    public parse(input: string, aliases: Record<string, string> = {}): ASTNode | null {
        this.tokens = this.lexer.tokenize(input);
        this.pos = 0;
        this.aliases = aliases;

        this.skipNewlines();
        const program = this.parseCompoundList();
        this.skipNewlines();
        if (this.peek().type !== TokenType.EOF) {
            this.syntaxError(`unexpected '${this.peek().value}'`);
        }
        return program;
    }

    /** Starts incremental parsing of a program (see `parseNext`). */
    public begin(input: string): void {
        this.tokens = this.lexer.tokenize(input);
        this.pos = 0;
    }

    /**
     * Parses the next complete_command (up to an unquoted newline), using the
     * aliases in effect *now*, as shells do when reading a script.
     * Returns undefined at end of input.
     */
    public parseNext(aliases: Record<string, string> = {}): ASTNode | undefined {
        this.aliases = aliases;
        this.skipNewlines();
        if (this.peek().type === TokenType.EOF) return undefined;

        let result: ASTNode | null = null;
        while (this.peek().type !== TokenType.EOF && this.peek().type !== TokenType.NEWLINE) {
            if (this.atListEnd()) this.syntaxError(`unexpected '${this.peek().value}'`);
            let item: ASTNode | null = this.parseAndOr();
            if (!item) this.syntaxError('expected command');
            if (this.peek().type === TokenType.AMP) {
                this.advance();
                item = { type: NodeType.ASYNC, body: item } as AsyncNode;
            } else if (this.peek().type === TokenType.SEMI) {
                this.advance();
            } else if (this.peek().type !== TokenType.NEWLINE && this.peek().type !== TokenType.EOF) {
                this.syntaxError('expected separator');
            }
            result = result
                ? { type: NodeType.LIST, operator: ';', left: result, right: item! } as ListNode
                : item;
        }
        return result ?? undefined;
    }

    // --- Facade primitives -------------------------------------------------

    public peek(offset = 0): Token {
        return this.tokens[this.pos + offset] || { type: TokenType.EOF, value: '', position: -1 };
    }

    public advance(): Token {
        const token = this.peek();
        if (this.pos < this.tokens.length) this.pos++;
        return token;
    }

    public isWord(word: string, offset = 0): boolean {
        const t = this.peek(offset);
        return t.type === TokenType.WORD && !t.quoted && t.value === word;
    }

    public expectWord(word: string): void {
        if (!this.isWord(word)) this.syntaxError(`expected '${word}'`);
        this.advance();
    }

    public skipNewlines(): void {
        while (this.peek().type === TokenType.NEWLINE) this.advance();
    }

    public syntaxError(what: string): never {
        const t = this.peek();
        if (t.type === TokenType.EOF) throw new IncompleteInputError(`unexpected end of file (${what})`);
        const shown = t.type === TokenType.NEWLINE ? 'newline' : t.value;
        throw new ShellSyntaxError(`${what}: unexpected '${shown}'`);
    }

    public isRedirect(token: Token): boolean {
        // The lexer only emits IO_NUMBER directly before '<' or '>'.
        return REDIRECT_TOKENS.has(token.type) || token.type === TokenType.IO_NUMBER;
    }

    public parseRedirect(): RedirectNode {
        let fd: number | undefined;
        if (this.peek().type === TokenType.IO_NUMBER) fd = parseInt(this.advance().value, 10);
        const opToken = this.advance();
        const op = REDIRECT_OPS[opToken.type];
        if (!op) this.syntaxError('expected redirection operator');
        const target = this.peek();
        if (target.type !== TokenType.WORD) this.syntaxError(`missing target for '${opToken.value}'`);
        this.advance();

        const node: RedirectNode = { type: NodeType.REDIRECT, op: op!, file: target.value };
        if (fd !== undefined) node.fd = fd;
        if (op === '<<' || op === '<<-') {
            node.heredoc = target.heredoc ?? { body: '', quoted: false };
        }
        return node;
    }

    // --- Grammar levels ----------------------------------------------------

    /** True when the current token ends a compound_list. */
    private atListEnd(): boolean {
        const t = this.peek();
        if (t.type === TokenType.EOF || t.type === TokenType.RPAREN || t.type === TokenType.DSEMI) return true;
        return t.type === TokenType.WORD && !t.quoted && LIST_TERMINATORS.has(t.value);
    }

    /**
     * compound_list / program: and_or { (';' | '&' | NEWLINE) and_or }.
     * `&` wraps the preceding and_or in an AsyncNode.
     */
    public parseCompoundList(): ASTNode | null {
        this.skipNewlines();
        let result: ASTNode | null = null;

        while (!this.atListEnd()) {
            let item: ASTNode | null = this.parseAndOr();
            if (!item) this.syntaxError('expected command');

            const sep = this.peek().type;
            if (sep === TokenType.AMP) {
                this.advance();
                item = { type: NodeType.ASYNC, body: item } as AsyncNode;
            } else if (sep === TokenType.SEMI) {
                this.advance();
            } else if (sep !== TokenType.NEWLINE && !this.atListEnd()) {
                this.syntaxError('expected separator');
            }
            this.skipNewlines();

            result = result
                ? { type: NodeType.LIST, operator: ';', left: result, right: item! } as ListNode
                : item;
        }
        return result;
    }

    /** and_or: pipeline { ('&&' | '||') linebreak pipeline } */
    private parseAndOr(): ASTNode | null {
        let left = this.parsePipeline();
        while (left && (this.peek().type === TokenType.AND_IF || this.peek().type === TokenType.OR_IF)) {
            const op = this.advance().value as '&&' | '||';
            this.skipNewlines();
            const right = this.parsePipeline();
            if (!right) this.syntaxError(`expected command after '${op}'`);
            left = { type: NodeType.LIST, operator: op, left, right: right! } as ListNode;
        }
        return left;
    }

    /** pipeline: ['time' ['-p']] ['!'] command { '|' linebreak command } */
    private parsePipeline(): ASTNode | null {
        if (this.isWord('time')) {
            this.advance();
            const posix = this.isWord('-p');
            if (posix) this.advance();
            const atEnd = [TokenType.EOF, TokenType.NEWLINE, TokenType.SEMI, TokenType.AMP].includes(this.peek().type);
            const body = atEnd ? null : this.parsePipeline();
            return { type: NodeType.TIMED, body, posix } as TimedNode;
        }
        let negate = false;
        while (this.isWord('!')) {
            this.advance();
            negate = !negate;
        }

        const first = this.parseCommand();
        if (!first) {
            if (negate) this.syntaxError("expected command after '!'");
            return null;
        }
        const parts = [first];
        while (this.peek().type === TokenType.PIPE) {
            this.advance();
            this.skipNewlines();
            const next = this.parseCommand();
            if (!next) this.syntaxError("expected command after '|'");
            parts.push(next!);
        }

        if (parts.length === 1 && !negate) return first;
        return { type: NodeType.PIPELINE, parts, negate } as PipelineNode;
    }

    /** command: function_definition | compound_command [redirect_list] | simple_command */
    public parseCommand(): ASTNode | null {
        this.substituteAlias();
        for (const strategy of this.statementParsers) {
            if (!strategy.canHandle(this)) continue;
            const node = strategy.parse(this);
            if (node && !(strategy instanceof SimpleCommandParser) && node.type !== NodeType.FUNCTION_DEF) {
                return this.parseTrailingRedirects(node);
            }
            return node;
        }
        return null;
    }

    private parseTrailingRedirects(node: ASTNode): ASTNode {
        const redirects: RedirectNode[] = [];
        while (this.isRedirect(this.peek())) redirects.push(this.parseRedirect());
        return redirects.length ? { type: NodeType.REDIRECTED, body: node, redirects } as RedirectedNode : node;
    }

    /**
     * Alias substitution (XCU §2.3.1): an unquoted command-name word that
     * names an alias is replaced by the tokens of its value. A value ending
     * in a blank also makes the following word eligible.
     */
    private substituteAlias(seen: Set<string> = new Set()) {
        const t = this.peek();
        if (t.type !== TokenType.WORD || t.quoted || seen.has(t.value)) return;
        const value = this.aliases[t.value];
        if (value === undefined) return;

        seen.add(t.value);
        const replacement = this.lexer.tokenize(value).filter(tok => tok.type !== TokenType.EOF);
        this.tokens.splice(this.pos, 1, ...replacement);
        this.substituteAlias(seen);

        if (/[ \t]$/.test(value)) {
            const savedPos = this.pos;
            this.pos += replacement.length;
            this.substituteAlias(new Set());
            this.pos = savedPos;
        }
    }
}
