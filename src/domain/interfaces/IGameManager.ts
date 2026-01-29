/**
 * IGameManager.ts
 *
 * Domain Interface for Game Management.
 * Allows Domain Services to trigger game events without depending on the Interface Adapter layer.
 */
import { MailMessage } from '../usecases/MailSystem';
import { Mission } from '../entities/Mission';

export interface IGameManager {
    spawnNPCEvent(): Mission | null;
}
