import { ASTNode, NodeType, SubshellNode } from '../../interfaces/ShellAST';
import { TokenType } from '../ShellLexer';
import { IStatementParser } from './IStatementParser';
import { IShellParserFacade } from './IShellParserFacade';

/** subshell: '(' compound_list ')' */
export class SubshellParser implements IStatementParser {
    canHandle(facade: IShellParserFacade): boolean {
        return facade.peek().type === TokenType.LPAREN;
    }

    parse(facade: IShellParserFacade): ASTNode {
        facade.advance(); // (
        const root = facade.parseCompoundList();
        if (!root) facade.syntaxError("expected command after '('");
        if (facade.peek().type !== TokenType.RPAREN) facade.syntaxError("expected ')'");
        facade.advance();
        return { type: NodeType.SUBSHELL, root: root! } as SubshellNode;
    }
}
