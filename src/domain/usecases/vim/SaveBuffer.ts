import { BufferPersistencePort } from '../../ports/BufferPersistencePort';
import { IVimBuffer } from '../../entities/vim/IVimBuffer';

/**
 * SaveBuffer - Domain Layer Use Case
 * 
 * Logic for persisting an editor buffer.
 * 
 * Pillar: THE MASTER’S TOOL (Command/Strategy)
 */
export class SaveBuffer {
    constructor(private persistencePort: BufferPersistencePort) {}

    public execute(buffer: IVimBuffer, filename: string): string {
        const content = buffer.toString();
        this.persistencePort.save(filename, content);
        return `"${filename}" written`;
    }
}
