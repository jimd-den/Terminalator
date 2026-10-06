import { ASTNode } from '../../interfaces/ShellAST';
import { IShellParserFacade } from './IShellParserFacade';

/** do_group: do compound_list done (shared by for/while/until). */
export function parseDoGroup(facade: IShellParserFacade): ASTNode | null {
    facade.expectWord('do');
    const body = facade.parseCompoundList();
    if (!body) facade.syntaxError("expected command after 'do'");
    facade.expectWord('done');
    return body;
}
