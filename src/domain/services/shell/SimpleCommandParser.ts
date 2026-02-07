import { ASTNode, NodeType, IfNode, ForNode, WhileNode, SubshellNode, BlockNode, FunctionDefNode, CommandNode, RedirectNode } from '../../interfaces/ShellAST';
import { TokenType } from '../ShellLexer';
import { IStatementParser } from './IStatementParser';
import { IShellParserFacade } from './IShellParserFacade';

/**
 * SimpleCommandParser - Domain Layer
 * 
 * The default parser for simple commands and redirections (e.g., 'ls -la > out.txt').
 *
 * Pillar: The Balanced Scale (SRP) - Isolated parsing of simple commands.
 */
export class SimpleCommandParser implements IStatementParser {
    canHandle(facade: IShellParserFacade): boolean {
        const token = facade.peek();
        return token.type === TokenType.WORD || facade.isRedirect(token);
    }

    parse(facade: IShellParserFacade): ASTNode {
        const token = facade.peek();

        // Check if it's a reserved word that shouldn't be parsed as a command
        if (token.value === '}') return null as any;

        const args: string[] = [];
        const redirects: RedirectNode[] = [];

        while (facade.peek().type === TokenType.WORD || facade.isRedirect(facade.peek())) {
            const t = facade.peek();

            // If it's a reserved word and we already have a command, it's a delimiter
            if (args.length > 0 && t.type === TokenType.WORD && facade.isReservedWord(t.value)) {
                break;
            }

            if (facade.isRedirect(t)) {
                redirects.push(facade.parseRedirect());
            } else {
                args.push(facade.advance().value);
            }
        }

        if (args.length === 0 && redirects.length === 0) return null as any;

        const cmdName = args.length > 0 ? args.shift()! : '';

        return {
            type: NodeType.COMMAND,
            command: cmdName,
            args: args,
            redirects: redirects
        } as CommandNode;
    }
}
