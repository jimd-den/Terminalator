import { ASTNode, NodeType, IfNode } from '../../interfaces/ShellAST';
import { IStatementParser } from './IStatementParser';
import { IShellParserFacade } from './IShellParserFacade';

/** if compound_list then compound_list { elif ... then ... } [else compound_list] fi */
export class IfParser implements IStatementParser {
    canHandle(facade: IShellParserFacade): boolean {
        return facade.isWord('if');
    }

    parse(facade: IShellParserFacade): ASTNode {
        facade.advance(); // if | elif
        const condition = facade.parseCompoundList();
        if (!condition) facade.syntaxError("expected condition after 'if'");
        facade.expectWord('then');
        const thenBody = facade.parseCompoundList();
        if (!thenBody) facade.syntaxError("expected command after 'then'");

        let elseBody: ASTNode | undefined;
        if (facade.isWord('elif')) {
            // `elif` shares the closing `fi`, so parse it as a nested if without consuming `fi` twice.
            return { type: NodeType.IF, condition: condition!, thenBody: thenBody!, elseBody: this.parse(facade) } as IfNode;
        }
        if (facade.isWord('else')) {
            facade.advance();
            elseBody = facade.parseCompoundList() ?? undefined;
            if (!elseBody) facade.syntaxError("expected command after 'else'");
        }
        facade.expectWord('fi');
        return { type: NodeType.IF, condition: condition!, thenBody: thenBody!, elseBody } as IfNode;
    }
}
