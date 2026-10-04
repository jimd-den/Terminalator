import { ASTNode, NodeType, CaseNode, CaseItem } from '../../interfaces/ShellAST';
import { TokenType } from '../ShellLexer';
import { IStatementParser } from './IStatementParser';
import { IShellParserFacade } from './IShellParserFacade';

/**
 * case word linebreak in linebreak { ['('] pattern {'|' pattern} ')' compound_list ';;' } esac
 * The final item's ';;' is optional.
 */
export class CaseParser implements IStatementParser {
    canHandle(facade: IShellParserFacade): boolean {
        return facade.isWord('case');
    }

    parse(facade: IShellParserFacade): ASTNode {
        facade.advance(); // case
        const word = facade.peek();
        if (word.type !== TokenType.WORD) facade.syntaxError("expected word after 'case'");
        facade.advance();
        facade.skipNewlines();
        facade.expectWord('in');
        facade.skipNewlines();

        const items: CaseItem[] = [];
        while (!facade.isWord('esac')) {
            if (facade.peek().type === TokenType.LPAREN) facade.advance();
            const patterns: string[] = [];
            while (true) {
                const p = facade.peek();
                if (p.type !== TokenType.WORD) facade.syntaxError('expected case pattern');
                patterns.push(facade.advance().value);
                if (facade.peek().type !== TokenType.PIPE) break;
                facade.advance();
            }
            if (facade.peek().type !== TokenType.RPAREN) facade.syntaxError("expected ')' after case pattern");
            facade.advance();

            const body = facade.parseCompoundList();
            items.push({ patterns, body });

            if (facade.peek().type === TokenType.DSEMI) {
                facade.advance();
                facade.skipNewlines();
            } else if (!facade.isWord('esac')) {
                facade.syntaxError("expected ';;' or 'esac'");
            }
        }
        facade.advance(); // esac
        return { type: NodeType.CASE, word: word.value, items } as CaseNode;
    }
}
