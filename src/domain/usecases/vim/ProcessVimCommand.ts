import { IVimBuffer } from '../../entities/vim/IVimBuffer';
import { SaveBuffer } from './SaveBuffer';

/**
 * CommandResult - Domain DTO
 */
export interface CommandResult {
    exit: boolean;
    message: string;
}

/**
 * ProcessVimCommand - Domain Layer Use Case
 * 
 * Logic for parsing and executing Vim command-line commands.
 * 
 * Pillar: THE MASTER’S TOOL (Command Pattern)
 */
export class ProcessVimCommand {
    constructor(private saveBuffer: SaveBuffer) {}

    public execute(cmd: string, buffer: IVimBuffer, filename: string): CommandResult {
        const command = cmd.trim();

        if (command === ':w') {
            const message = this.saveBuffer.execute(buffer, filename);
            return { exit: false, message };
        } else if (command === ':q' || command === ':quit' || command === ':exit') {
            return { exit: true, message: 'UPLINK TERMINATED.' };
        } else if (command === ':wq') {
            this.saveBuffer.execute(buffer, filename);
            return { exit: true, message: 'UPLINK TERMINATED.' };
        } else if (command === ':q!') {
            return { exit: true, message: 'UPLINK TERMINATED.' };
        }

        return { exit: false, message: `E492: Not an editor command: ${command}` };
    }
}
