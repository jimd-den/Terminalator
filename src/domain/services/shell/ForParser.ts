import { ASTNode, NodeType, ForNode } from '../ShellParser';
import { TokenType } from '../ShellLexer';
import { IStatementParser } from './IStatementParser';
import { IShellParserFacade } from './IShellParserFacade';

/**
 * ForParser - Domain Layer
 * 
 * Parses FOR-IN-DO-DONE constructs.
 *
 * Pillar: The Balanced Scale (SRP) - Isolated parsing of 'for' loops.
 */
export class ForParser implements IStatementParser {
    canHandle(facade: IShellParserFacade): boolean {
        const token = facade.peek();
        return token.type === TokenType.WORD && token.value === 'for';
    }

    parse(facade: IShellParserFacade): ASTNode {
        facade.advance(); // for
        const nameToken = facade.advance(); // variable name
        if (nameToken.type !== TokenType.WORD) {
            throw new Error(`Syntax Error: Expected variable name after 'for' at position ${nameToken.position}`);
        }

        let items: string[] = [];
        if (facade.peek().value === 'in') {
            facade.advance(); // in
            while (facade.peek().type === TokenType.WORD && !facade.isReservedWord(facade.peek().value)) {
                items.push(facade.advance().value);
            }
            if (facade.peek().type === TokenType.SEMI || facade.peek().type === TokenType.NEWLINE) {
                facade.advance();
            }
        }

        while (facade.peek().type === TokenType.NEWLINE || facade.peek().type === TokenType.SEMI) {
            facade.advance();
        }

        if (facade.peek().value !== 'do') {
            throw new Error(`Syntax Error: Expected 'do' at position ${facade.peek().position}`);
        }
        facade.advance(); // do

        const body = facade.parseList();

        while (facade.peek().type === TokenType.NEWLINE || facade.peek().type === TokenType.SEMI) {
            facade.advance();
        }

        if (facade.peek().value !== 'done') {
            throw new Error(`Syntax Error: Expected 'done' at position ${facade.peek().position}`);
        }
        facade.advance(); // done

        return {
            type: NodeType.FOR,
            variable: nameToken.value,
            items: items,
            body: body!
        } as ForNode;
    }
}
