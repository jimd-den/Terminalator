import { ASTNode } from '../../interfaces/ShellAST';
import { IShellParserFacade } from './IShellParserFacade';

/**
 * IStatementParser - Domain Layer
 *
 * Strategy for one grammar construct (if, for, case, ...). New constructs
 * are added by registering a new strategy (OCP).
 */
export interface IStatementParser {
    /** Whether this strategy recognises the construct at the current token. */
    canHandle(facade: IShellParserFacade): boolean;
    parse(facade: IShellParserFacade): ASTNode | null;
}
