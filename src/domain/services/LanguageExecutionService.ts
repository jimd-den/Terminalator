import { FileSystemService } from './FileSystemService';
import { CommandResponse } from '../entities/Command';

export class LanguageExecutionService {
    constructor(private fsService: FileSystemService) {}

    async execute(path: string): Promise<CommandResponse> {
        const node = this.fsService.resolve(path);
        if (!node || this.fsService.isDirectory(node)) {
            return { output: `File not found: ${path}`, exitCode: 1 } as CommandResponse;
        }

        const inode = this.fsService.getInode(node.inodeId);
        const content = inode?.content as string || '';
        const ext = path.split('.').pop()?.toLowerCase();

        if (ext === 'scm') {
            return this.executeScheme(content);
        } else if (ext === 's' || ext === 'asm') {
            return this.executeAsm(content);
        }

        return { output: `Unsupported file type: .${ext}`, exitCode: 1 } as CommandResponse;
    }

    private executeScheme(source: string): CommandResponse {
        // Mock interpretation for now
        if (source.includes('(display "Hello World")')) {
            return { output: 'Hello World', exitCode: 0 } as CommandResponse;
        }
        return { output: 'Scheme execution simulation...', exitCode: 0 } as CommandResponse;
    }

    private executeAsm(source: string): CommandResponse {
        return { output: 'Assembly execution simulation...', exitCode: 0 } as CommandResponse;
    }
}
