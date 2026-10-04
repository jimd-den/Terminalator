import { ASTNode, NodeType, CommandNode, RedirectNode } from '../../interfaces/ShellAST';
import { TokenType } from '../ShellLexer';
import { IStatementParser } from './IStatementParser';
import { IShellParserFacade } from './IShellParserFacade';

const ASSIGNMENT = /^[A-Za-z_][A-Za-z0-9_]*=/;

/**
 * simple_command: cmd_prefix [cmd_word [cmd_suffix]] | cmd_name [cmd_suffix]
 * Assignments are only recognised before the command name.
 */
export class SimpleCommandParser implements IStatementParser {
    canHandle(facade: IShellParserFacade): boolean {
        const t = facade.peek();
        return t.type === TokenType.WORD || facade.isRedirect(t);
    }

    parse(facade: IShellParserFacade): ASTNode | null {
        const assignments: string[] = [];
        const words: string[] = [];
        const redirects: RedirectNode[] = [];

        while (true) {
            const t = facade.peek();
            if (facade.isRedirect(t)) {
                redirects.push(facade.parseRedirect());
            } else if (t.type === TokenType.WORD) {
                if (words.length === 0 && ASSIGNMENT.test(t.value)) {
                    assignments.push(facade.advance().value);
                } else {
                    words.push(facade.advance().value);
                }
            } else {
                break;
            }
        }

        if (!words.length && !assignments.length && !redirects.length) return null;
        const [command = '', ...args] = words;
        return { type: NodeType.COMMAND, assignments, command, args, redirects } as CommandNode;
    }
}
