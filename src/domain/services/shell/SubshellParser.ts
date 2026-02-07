import { ASTNode, NodeType, IfNode, ForNode, WhileNode, SubshellNode, BlockNode, FunctionDefNode, CommandNode, RedirectNode } from '../../interfaces/ShellAST';
import { TokenType } from '../ShellLexer';
import { IStatementParser } from './IStatementParser';
import { IShellParserFacade } from './IShellParserFacade';

/**
 * SubshellParser - Domain Layer
 * 
 * Parses ( ... ) subshell constructs.
 *
 * Pillar: The Balanced Scale (SRP) - Isolated parsing of subshells.
 */
export class SubshellParser implements IStatementParser {
    canHandle(facade: IShellParserFacade): boolean {
        return facade.peek().type === TokenType.LPAREN;
    }

    parse(facade: IShellParserFacade): ASTNode {
        facade.advance(); // (
        while (facade.peek().type === TokenType.NEWLINE) facade.advance();

        const inner = facade.parseList();

        while (facade.peek().type === TokenType.NEWLINE) facade.advance();

        if (!facade.match(TokenType.RPAREN)) {
            throw new Error(`Syntax Error: Missing closing parenthesis for subshell at position ${facade.peek().position}`);
        }

        return {
            type: NodeType.SUBSHELL,
            root: inner!
        } as SubshellNode;
    }
}
