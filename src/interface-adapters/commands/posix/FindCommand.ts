import { ICommand, CommandResponse } from '../../../domain/entities/Command';
import { FileSystem, FSNode } from '../../../domain/entities/FileSystem';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { TerminalState } from '../../../domain/entities/TerminalState';

export class FindCommand implements ICommand {
    name = 'find';
    description = 'Search for files in a directory hierarchy';

    constructor(private fs: FileSystem) { }

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

        const startNode = this.fs.resolveNode(searchPath, context.cwd);
        if (!startNode) {
            return { output: `find: '${searchPath}': No such file or directory`, exitCode: 1 };
        }

        const results: string[] = [];
        this.traverse(startNode, searchPath, namePattern, results);

        return {
            output: results.join('\n'),
            exitCode: 0
        };
    }

    private traverse(node: FSNode, currentPath: string, pattern: string, results: string[]) {
        // Check if current matches
        // pattern usually has wildcards *.ts, but for now exact match or simple includes?
        // Let's implement basic wildcard * support regex.
        // Convert glob * to .* 
        const regex = new RegExp('^' + pattern.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$');

        if (!pattern || regex.test(node.name)) {
            // output path relative to start? or absolute?
            // "find ." usually prints "./sub/file"
            // "find /" prints "/sub/file"
            // currentPath is accumulated path.
            results.push(currentPath);
        }

        if (node.type === 'directory' && node.children) {
            for (const key in node.children) {
                const child = node.children[key];
                // Avoid infinite loops if we had hard links (we don't yet).
                // Construct child path.
                const separator = currentPath.endsWith('/') ? '' : '/';
                const childPath = currentPath + separator + key;
                this.traverse(child, childPath, pattern, results);
            }
        }
    }
}
