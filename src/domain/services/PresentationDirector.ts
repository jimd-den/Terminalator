/**
 * PresentationDirector - Domain Service
 * 
 * Orchestrates theatrical sequences for command execution.
 * Implements Phase IV: Theatrical Mainframe Presentation.
 * 
 * Pillar: THE STORYTELLER'S CODE (Presentation)
 * Pillar: THESwift Stream (Animation/Timing)
 */

import { SimulationBus, GameEventType } from './SimulationBus';

export enum TheatricalVerb {
    SYNTHESIZE = "SYNTHESIZING BINARY",
    SCAN = "SCANNING DATA SECTORS",
    PURGE = "PURGING ARTIFACTS",
    EXTRACT = "EXTRACTING DATA STREAM",
    UPLINK = "ESTABLISHING SECURE UPLINK",
    HANDSHAKE = "SYNCHRONIZING DATA HANDSHAKE",
    OVERRIDE = "OVERRIDING SYSTEM PERMISSIONS"
}

export class PresentationDirector {
    private readonly VERB_MAP: Record<string, TheatricalVerb> = {
        'gcc': TheatricalVerb.SYNTHESIZE,
        'compile': TheatricalVerb.SYNTHESIZE,
        'ls': TheatricalVerb.SCAN,
        'rm': TheatricalVerb.PURGE,
        'cat': TheatricalVerb.EXTRACT,
        'grep': TheatricalVerb.EXTRACT,
        'ssh': TheatricalVerb.UPLINK,
        'connect': TheatricalVerb.UPLINK,
        'chmod': TheatricalVerb.OVERRIDE,
        'chown': TheatricalVerb.OVERRIDE
    };

    constructor(private bus: SimulationBus) {}

    /**
     * Triggers a theatrical sequence for a command.
     */
    public async presentCommand(command: string, args: string[]): Promise<void> {
        const verb = this.VERB_MAP[command] || TheatricalVerb.EXTRACT;
        
        // 1. Emit Start Event
        // The SimulationMediator will await ANIMATION_COMPLETE
        this.bus.emit(GameEventType.TUTOR_EVENT, {
            type: 'PRESENTATION_START' as any,
            payload: { verb, command, args }
        });
    }

    /**
     * Visualizes a pipe between two processes.
     */
    public async presentPipe(source: string, target: string): Promise<void> {
        this.bus.emit(GameEventType.TUTOR_EVENT, {
            type: 'PIPE_VISUALIZATION' as any,
            payload: { source, target, verb: TheatricalVerb.HANDSHAKE }
        });
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}
