import { ASTNode, NodeType, BlockNode } from '../ShellParser';
import { TokenType } from '../ShellLexer';
import { IStatementParser } from './IStatementParser';
import { IShellParserFacade } from './IShellParserFacade';

/**
 * BlockParser - Domain Layer
 * 
 * Parses { ... } grouping constructs.
 *
 * Pillar: The Balanced Scale (SRP) - Isolated parsing of blocks.
 */
export class BlockParser implements IStatementParser {
    canHandle(facade: IShellParserFacade): boolean {
        const token = facade.peek();
        return token.type === TokenType.WORD && token.value === '{';
    }

    parse(facade: IShellParserFacade): ASTNode {
        facade.advance(); // {
        while (facade.peek().type === TokenType.NEWLINE) facade.advance();

        const list = facade.parseList();
        if (!list) {
            throw new Error("Syntax Error: Block cannot be empty");
        }

        while (facade.peek().type === TokenType.NEWLINE || facade.peek().type === TokenType.SEMI) {
            facade.advance();
        }

        const token = facade.peek();
        if (token.type !== TokenType.WORD || token.value !== '}') {
            throw new Error(`Syntax Error: Missing closing '}' for block at position ${token.position}`);
        }
        facade.advance(); // }

        return {
            type: NodeType.BLOCK,
            body: list
        } as BlockNode;
    }
}
