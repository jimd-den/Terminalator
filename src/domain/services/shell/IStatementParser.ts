import { ASTNode } from '../ShellParser';
import { IShellParserFacade } from './IShellParserFacade';

/**
 * IStatementParser - Domain Layer
 * 
 * Strategy interface for parsing specific shell grammar constructs (If, For, While, etc.).
 *
 * Pillar: The Balanced Scale (SOLID) - OCP: New constructs only require new implementations.
 */
export interface IStatementParser {
    /**
     * Determines if this parser can handle the current token stream.
     */
    canHandle(facade: IShellParserFacade): boolean;

    /**
     * Parses the construct and returns an AST node.
     */
    parse(facade: IShellParserFacade): ASTNode | null;
}
