/**
 * TutorService - Domain Service
 * 
 * Analyzes the game state and generates context-aware hints for the player.
 * Acts as a pure functional core for the "TutorBot" NPC.
 * 
 * Pillar: The Balanced Scale (SOLID / KISS) - Pure Logic
 */

import { TerminalState } from '../entities/TerminalState';
import { Mission } from '../entities/Mission';
import { CommandResponse } from '../entities/Command';

export interface TutorAction {
    message: string;
    type: 'HINT' | 'WARNING' | 'CONGRATS';
    confidence: number; // 0-1
}

/**
 * Analyzes the current state and mission to determine if a hint is needed.
 * @param mission - The active mission the player is tracking.
 * @param state - Current terminal state.
 * @param lastResponse - The result of the last executed command.
 */
export function analyzeGameState(mission: Mission, state: TerminalState, lastResponse: CommandResponse): TutorAction | null {
    if (!mission || mission.status !== 'active') return null;

    // Stage 1: Connect to Target
    if (!state.fsContext || state.fsContext !== mission.targetSystem) {
        // If user is trying to connect but failing
        if (lastResponse.output.includes('ssh:') || lastResponse.output.includes('Could not resolve')) {
            return {
                message: `Connection failed. Ensure you are using the correct hostname: ${mission.targetSystem}. Syntax: 'ssh user@${mission.targetSystem}'.`,
                type: 'HINT',
                confidence: 0.9
            };
        }

        // If user is idling or doing local commands
        return {
            message: `Operator, your objective is on a remote system. Initiate connection: 'ssh admin@${mission.targetSystem}'.`,
            type: 'HINT',
            confidence: 0.5
        };
    }

    // Stage 2: On Target - Locate Objective
    if (state.fsContext === mission.targetSystem) {
        // Check if objective is completed (simulated for now based on last command)

        switch (mission.type) {
            case 'exfiltrate':
                if (lastResponse.output.includes('scp') && lastResponse.exitCode === 0) {
                    return {
                        message: `Payload transfer confirmed. Disconnect using 'exit' and verify the file in your local loot.`,
                        type: 'CONGRATS',
                        confidence: 1.0
                    };
                }
                if (!lastResponse.output.includes(mission.objectiveTarget)) {
                    return {
                        message: `Locate the target file '${mission.objectiveTarget}'. Try 'ls' or 'find . -name ${mission.objectiveTarget}'.`,
                        type: 'HINT',
                        confidence: 0.7
                    };
                }
                break;

            case 'modify':
                if (lastResponse.exitCode === 0 && (lastResponse.output.includes('echo') || lastResponse.output.includes('vim') || lastResponse.output.includes('Saved'))) {
                    // Primitive check: Did they edit the file? 
                    // ideally we'd check FS state, but this function is pure logic based on inputs.
                    // We might need to inject FS service or check file content in a separate step.
                    return {
                        message: `Modifications detected. Verify signature and disconnect.`,
                        type: 'CONGRATS',
                        confidence: 0.8
                    };
                }
                return {
                    message: `Target acquired: '${mission.objectiveTarget}'. Append the signature 'HACKED' to this file.`,
                    type: 'HINT',
                    confidence: 0.8
                };
        }
    }

    return null;
}
