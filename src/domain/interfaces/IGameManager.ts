/**
 * IGameManager.ts
 *
 * Domain Interface for Game Management.
 * Allows Domain Services to trigger game events without depending on the Interface Adapter layer.
 */
import { MailMessage } from '../usecases/MailSystem';

export interface IGameManager {
    spawnNPCEvent(): MailMessage;
}
