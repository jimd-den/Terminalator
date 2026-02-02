import { ASTNode, NodeType, WhileNode } from '../ShellParser';
import { TokenType } from '../ShellLexer';
import { IStatementParser } from './IStatementParser';
import { IShellParserFacade } from './IShellParserFacade';

/**
 * WhileParser - Domain Layer
 * 
 * Parses WHILE-DO-DONE constructs.
 *
 * Pillar: The Balanced Scale (SRP) - Isolated parsing of 'while' loops.
 */
export class WhileParser implements IStatementParser {
    canHandle(facade: IShellParserFacade): boolean {
        const token = facade.peek();
        return token.type === TokenType.WORD && token.value === 'while';
    }

    parse(facade: IShellParserFacade): ASTNode {
        facade.advance(); // while
        const condition = facade.parseList();

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
            type: NodeType.WHILE,
            condition: condition!,
            body: body!
        } as WhileNode;
    }
}
