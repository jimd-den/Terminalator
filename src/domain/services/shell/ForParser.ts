import { ASTNode, NodeType, ForNode } from '../../interfaces/ShellAST';
import { TokenType } from '../ShellLexer';
import { IStatementParser } from './IStatementParser';
import { IShellParserFacade } from './IShellParserFacade';
import { parseDoGroup } from './DoGroup';

/** for name [linebreak in word... (';' | NEWLINE)] linebreak do_group */
export class ForParser implements IStatementParser {
    canHandle(facade: IShellParserFacade): boolean {
        return facade.isWord('for');
    }

    parse(facade: IShellParserFacade): ASTNode {
        facade.advance(); // for
        const name = facade.peek();
        if (name.type !== TokenType.WORD || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(name.value)) {
            facade.syntaxError("bad for loop variable");
        }
        facade.advance();

        let items: string[] | undefined;
        facade.skipNewlines();
        if (facade.isWord('in')) {
            facade.advance();
            items = [];
            while (facade.peek().type === TokenType.WORD) items.push(facade.advance().value);
            const sep = facade.peek().type;
            if (sep !== TokenType.SEMI && sep !== TokenType.NEWLINE) facade.syntaxError("expected ';' or newline in for loop");
            facade.advance();
        } else if (facade.peek().type === TokenType.SEMI) {
            facade.advance();
        }
        facade.skipNewlines();

        const body = parseDoGroup(facade);
        return { type: NodeType.FOR, variable: name.value, items, body } as ForNode;
    }
}
