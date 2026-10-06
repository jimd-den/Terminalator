import { Token } from '../ShellLexer';
import { ASTNode, RedirectNode } from '../../interfaces/ShellAST';

/**
 * IShellParserFacade - Domain Layer
 *
 * The narrow view of the parser that grammar strategies (if/for/case/...)
 * use to consume tokens and recurse, without seeing parser internals.
 */
export interface IShellParserFacade {
    peek(offset?: number): Token;
    advance(): Token;
    /** True if the next token is an unquoted WORD equal to `word`. */
    isWord(word: string, offset?: number): boolean;
    /** Consumes the reserved word or throws a syntax error. */
    expectWord(word: string): void;
    /** Skips NEWLINE tokens (the grammar's `linebreak`). */
    skipNewlines(): void;
    /** compound_list: a sequence of and-or lists up to a terminator. */
    parseCompoundList(): ASTNode | null;
    /** A single command (simple, compound or function definition). */
    parseCommand(): ASTNode | null;
    isRedirect(token: Token): boolean;
    parseRedirect(): RedirectNode;
    /** Throws IncompleteInputError at EOF, otherwise a ShellSyntaxError. */
    syntaxError(what: string): never;
}
