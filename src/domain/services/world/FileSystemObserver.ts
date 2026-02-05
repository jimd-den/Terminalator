/**
 * FileSystemObserver.ts - Domain Service
 * 
 * Subscribes to FileSystemService events and forwards them to the WorldEffectDispatcher.
 * 
 * Pillar: The Balanced Scale (SRP / Observer Pattern)
 */

import { FileSystemService } from '../FileSystemService';
import { WorldEffectDispatcher } from './WorldEffectDispatcher';

export class FileSystemObserver {
    constructor(
        private dispatcher: WorldEffectDispatcher
    ) {}

    /**
     * Attaches the observer to a FileSystemService instance.
     */
    public observe(hostname: string, service: FileSystemService): void {
        service.onWrite((path: string, content: string | Uint8Array, actingUser?: { uid: number, gid: number, groups: number[] }) => {
            // Ignore System/Root writes to prevent feedback loops
            if (actingUser?.uid === 0) return;

            if (typeof content === 'string') {
                this.dispatcher.dispatch(hostname, path, content);
            } else {
                // Handle binary writes if needed, for now only string commands for /dev
                const decoder = new TextDecoder();
                this.dispatcher.dispatch(hostname, path, decoder.decode(content));
            }
        });
    }
}
