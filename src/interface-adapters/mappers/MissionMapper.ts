/**
 * Mission Mapper
 * 
 * " The Translator "
 * 
 * Responsible for converting internal Mission Entities into Mission DTOs.
 * This ensures that the UI never touches the actual Entity objects.
 * 
 * Pillar: The Swift Stream (Pure Functions)
 * Pillar: The Balanced Scale (SRP)
 */

import { Mission } from '../../domain/entities/Mission';
import { MissionDTO, ChatMessageDTO } from '../../domain/dtos/MissionDTO';

export class MissionMapper {

    /**
     * Converts a single Mission Entity into a Mission DTO.
     * This is a pure function: Input (Entity) -> Output (DTO).
     * 
     * @param entity - The internal domain representation of a mission.
     * @returns A pure data object ready for the UI.
     */
    static toDTO(entity: Mission): MissionDTO {
        return {
            id: entity.id,
            type: entity.type,
            assignerName: entity.assignerName,
            status: entity.status,
            currentStep: entity.currentStep,

            // Map the internal chat history to DTOs to ensure deep decoupling
            chatHistory: entity.chatHistory.map(MissionMapper.toMessageDTO)
        };
    }

    /**
     * Helper function to map individual messages.
     * Kept small and composable.
     */
    private static toMessageDTO(msg: { sender: string; message: string; timestamp: number }): ChatMessageDTO {
        return {
            sender: msg.sender,
            message: msg.message,
            timestamp: msg.timestamp
        };
    }
}
