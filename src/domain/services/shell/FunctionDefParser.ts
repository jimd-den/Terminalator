import { ASTNode, NodeType, FunctionDefNode, RedirectNode } from '../../interfaces/ShellAST';
import { TokenType } from '../ShellLexer';
import { IStatementParser } from './IStatementParser';
import { IShellParserFacade } from './IShellParserFacade';

/** fname '(' ')' linebreak compound_command [redirect_list] */
export class FunctionDefParser implements IStatementParser {
    canHandle(facade: IShellParserFacade): boolean {
        const name = facade.peek(0);
        return name.type === TokenType.WORD && !name.quoted &&
            facade.peek(1).type === TokenType.LPAREN &&
            facade.peek(2).type === TokenType.RPAREN;
    }

    parse(facade: IShellParserFacade): ASTNode {
        const name = facade.advance().value;
        if (!/^[A-Za-z_][A-Za-z0-9_.-]*$/.test(name)) facade.syntaxError(`bad function name '${name}'`);
        facade.advance(); // (
        facade.advance(); // )
        facade.skipNewlines();

        const body = facade.parseCommand();
        if (!body || body.type === NodeType.COMMAND) facade.syntaxError(`function '${name}' needs a compound command body`);

        // parseCommand already folds a trailing redirect list into a REDIRECTED node.
        const redirects: RedirectNode[] = [];
        return { type: NodeType.FUNCTION_DEF, name, body: body!, redirects } as FunctionDefNode;
    }
}
