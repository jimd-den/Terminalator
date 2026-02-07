import { ASTNode, NodeType, IfNode, ForNode, WhileNode, SubshellNode, BlockNode, FunctionDefNode, CommandNode, RedirectNode } from '../../interfaces/ShellAST';
import { TokenType } from '../ShellLexer';
import { IStatementParser } from './IStatementParser';
import { IShellParserFacade } from './IShellParserFacade';

/**
 * FunctionDefParser - Domain Layer
 * 
 * Parses function definition constructs: name() [newlines] compound_command [redirects]
 *
 * Pillar: The Balanced Scale (SRP) - Isolated parsing of function definitions.
 */
export class FunctionDefParser implements IStatementParser {
    canHandle(facade: IShellParserFacade): boolean {
        const t1 = facade.peek(0);
        const t2 = facade.peek(1);
        const t3 = facade.peek(2);

        return t1.type === TokenType.WORD &&
            t2.type === TokenType.LPAREN &&
            t3.type === TokenType.RPAREN;
    }

    parse(facade: IShellParserFacade): ASTNode {
        const nameToken = facade.advance(); // name
        facade.advance(); // (
        facade.advance(); // )

        while (facade.peek().type === TokenType.NEWLINE) facade.advance();

        const body = facade.parseCommand();
        if (!body) throw new Error(`Syntax Error: Missing body for function ${nameToken.value}`);

        const redirects: RedirectNode[] = [];
        while (facade.isRedirect(facade.peek())) {
            redirects.push(facade.parseRedirect());
        }

        return {
            type: NodeType.FUNCTION_DEF,
            name: nameToken.value,
            body: body,
            redirects: redirects
        } as FunctionDefNode;
    }
}
