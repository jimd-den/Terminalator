/**
 * Buffer Mapper
 * 
 * " The Archivist "
 * 
 * Transforms internal capture buffers into renderable DTOs.
 * Isolates the Archive Service's internal structure from the Buffer Screen.
 * 
 * Pillar: The Swift Stream (Pure Functions)
 * Pillar: The Storyteller's Code (Literate Documentation)
 */

import { CapturedBuffer } from '../../domain/services/ArchiveService';
import { BufferDTO } from '../../domain/dtos/BufferDTO';

export class BufferMapper {

    /**
     * Converts a CapturedBuffer entity into a BufferDTO.
     * 
     * @param entity - The raw buffer from the ArchiveService.
     * @returns A simplified DTO for the UI.
     */
    static toDTO(entity: CapturedBuffer): BufferDTO {
        return {
            id: entity.id,
            timestamp: entity.timestamp,
            command: entity.command,
            output: [...entity.output], // Create a shallow copy to prevent mutation bugs
            tags: [...entity.tags],     // Copy tags array for safety
            hostname: entity.hostname,
            exitCode: entity.exitCode
        };
    }
}
