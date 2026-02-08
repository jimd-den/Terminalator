import { ASTNode, NodeType, IfNode, ForNode, WhileNode, SubshellNode, BlockNode, FunctionDefNode, CommandNode, RedirectNode } from '../../interfaces/ShellAST';
import { TokenType } from '../ShellLexer';
import { IStatementParser } from './IStatementParser';
import { IShellParserFacade } from './IShellParserFacade';

/**
 * IfParser - Domain Layer
 * 
 * Parses IF-THEN-ELSE-FI constructs. Supports ELIF nesting.
 *
 * Pillar: The Balanced Scale (SRP) - Isolated parsing of 'if' statements.
 */
export class IfParser implements IStatementParser {
    canHandle(facade: IShellParserFacade): boolean {
        const token = facade.peek();
        return token.type === TokenType.WORD && token.value === 'if';
    }

    parse(facade: IShellParserFacade): ASTNode {
        facade.advance(); // if
        const condition = facade.parseList();

        while (facade.peek().type === TokenType.NEWLINE || facade.peek().type === TokenType.SEMI) {
            facade.advance();
        }

        if (facade.peek().value !== 'then') {
            throw new Error(`Syntax Error: Expected 'then' at position ${facade.peek().position}`);
        }
        facade.advance(); // then

        const thenBody = facade.parseList();

        let elseBody: ASTNode | undefined;
        while (facade.peek().type === TokenType.NEWLINE || facade.peek().type === TokenType.SEMI) {
            facade.advance();
        }

        const nextWord = facade.peek().value;
        if (nextWord === 'else') {
            facade.advance(); // else
            elseBody = facade.parseList() || undefined;
        } else if (nextWord === 'elif') {
            // Recursive delegation for elif
            elseBody = this.parse(facade);
        }

        while (facade.peek().type === TokenType.NEWLINE || facade.peek().type === TokenType.SEMI) {
            facade.advance();
        }

        if (facade.peek().value !== 'fi') {
            throw new Error(`Syntax Error: Expected 'fi' at position ${facade.peek().position}`);
        }
        facade.advance(); // fi

        return {
            type: NodeType.IF,
            condition: condition!,
            thenBody: thenBody!,
            elseBody: elseBody
        } as IfNode;
    }
}
