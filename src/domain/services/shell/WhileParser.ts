import { ASTNode, NodeType, WhileNode } from '../../interfaces/ShellAST';
import { IStatementParser } from './IStatementParser';
import { IShellParserFacade } from './IShellParserFacade';
import { parseDoGroup } from './DoGroup';

/** while compound_list do_group | until compound_list do_group */
export class WhileParser implements IStatementParser {
    canHandle(facade: IShellParserFacade): boolean {
        return facade.isWord('while') || facade.isWord('until');
    }

    parse(facade: IShellParserFacade): ASTNode {
        const until = facade.advance().value === 'until';
        const condition = facade.parseCompoundList();
        if (!condition) facade.syntaxError(`expected condition after '${until ? 'until' : 'while'}'`);
        const body = parseDoGroup(facade);
        return { type: NodeType.WHILE, condition: condition!, body, until } as WhileNode;
    }
}
