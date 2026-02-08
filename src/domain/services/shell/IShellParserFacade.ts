import { Token, TokenType } from '../ShellLexer';
import { ASTNode, RedirectNode } from '../../interfaces/ShellAST';

/**
 * IShellParserFacade - Domain Layer
 * 
 * Provides a controlled interface for specialized grammar parsers to interact
 * with the main ShellParser infrastructure without exposing internal state.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Master’s Tool (Pragmatic Design Patterns) - Facade/Flyweight-ish
 */
export interface IShellParserFacade {
    peek(offset?: number): Token;
    advance(): Token;
    match(type: TokenType): boolean;
    parseList(): ASTNode | null;
    parseCommand(): ASTNode | null;
    isRedirect(token: Token): boolean;
    parseRedirect(): RedirectNode;
    isReservedWord(word: string): boolean;
}
