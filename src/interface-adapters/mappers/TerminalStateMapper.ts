import { TerminalState } from '../../domain/entities/TerminalState';
import { TerminalStateDTO } from '../../domain/dtos/TerminalStateDTO';

export class TerminalStateMapper {
    static toDTO(entity: TerminalState): TerminalStateDTO {
        return {
            currentDirectory: entity.currentDirectory,
            environment: { ...entity.environment }, // Shallow copy to prevent mutation
            user: {
                uid: entity.user.uid,
                gid: entity.user.gid
            },
            fsContext: entity.fsContext,
            lastExitCode: entity.lastExitCode
        };
    }
}
