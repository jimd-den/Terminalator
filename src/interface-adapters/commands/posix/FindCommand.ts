import { ICommand, CommandResponse } from '../../../domain/entities/Command';
import { FileSystem, Dentry } from '../../../domain/entities/FileSystem';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { TerminalState } from '../../../domain/entities/TerminalState';

export class FindCommand implements ICommand {
    name = 'find';
    description = 'Search for files in a directory hierarchy';

    constructor() { }

    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        // Usage: find [path] -name "pattern"
        // Simplest posix find. Default path is .

        let searchPath = '.';
        let namePattern = '';

        if (args.length > 0 && !args[0].startsWith('-')) {
            searchPath = args[0];
            args = args.slice(1);
        }

        if (args[0] === '-name' && args[1]) {
            namePattern = args[1].replace(/['"]/g, ''); // strip quotes
        }

        const startNode = context.fs.resolveNode(searchPath, context.cwd);
        if (!startNode) {
            return { output: `find: '${searchPath}': No such file or directory`, exitCode: 1 };
        }

        const results: string[] = [];
        this.traverse(context.fs, startNode, searchPath, namePattern, results);

        return {
            output: results.join('\n'),
            exitCode: 0
        };
    }

    private traverse(fs: FileSystem, node: Dentry, currentPath: string, pattern: string, results: string[]) {
        // Check if current matches
        // pattern usually has wildcards *.ts, but for now exact match or simple includes?
        // Let's implement basic wildcard * support regex.
        // Convert glob * to .* 
        const regex = new RegExp('^' + pattern.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$');

        if (!pattern || regex.test(node.name)) {
            results.push(currentPath);
        }

        if (fs.isDirectory(node)) {
            for (const key of node.children.keys()) {
                const child = node.children.get(key)!;
                // Avoid infinite loops if we had hard links (we don't yet).
                // Construct child path.
                const separator = currentPath.endsWith('/') ? '' : '/';
                const childPath = currentPath + separator + key;
                this.traverse(fs, child, childPath, pattern, results);
            }
        }
    }
}
