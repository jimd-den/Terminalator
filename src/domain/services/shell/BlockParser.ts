import { ASTNode, NodeType, BlockNode } from '../../interfaces/ShellAST';
import { IStatementParser } from './IStatementParser';
import { IShellParserFacade } from './IShellParserFacade';

/** brace_group: '{' compound_list '}' */
export class BlockParser implements IStatementParser {
    canHandle(facade: IShellParserFacade): boolean {
        return facade.isWord('{');
    }

    parse(facade: IShellParserFacade): ASTNode {
        facade.advance(); // {
        const body = facade.parseCompoundList();
        if (!body) facade.syntaxError("expected command after '{'");
        facade.expectWord('}');
        return { type: NodeType.BLOCK, body: body! } as BlockNode;
    }
}
