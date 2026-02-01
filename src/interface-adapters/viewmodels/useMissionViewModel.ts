/**
 * useMissionViewModel - Interface Adapter Layer
 * 
 * " The Mission Control "
 * 
 * Manages the state and logic for the Mission System (Comms Pane).
 * Encapsulates the MissionController and exposes DTOs to the View.
 * 
 * Pillar: The Four-Fold Shield (Separation of Concerns)
 * Pillar: The Storyteller's Code (Literate Documentation)
 */

import { useState, useMemo, useCallback } from 'react';
import { IGameManager } from '../../domain/interfaces/IGameManager';
import { MissionController } from '../controllers/MissionController';
import { MissionMapper } from '../mappers/MissionMapper';

export const useMissionViewModel = (gameManager: IGameManager) => {

    // -- State --
    const [missions, setMissions] = useState(gameManager.getActiveMissions());
    const [ircMissionId, setIrcMissionId] = useState<string | null>(null);

    // -- Controller --
    const missionController = useMemo(() => new MissionController(
        gameManager,
        setMissions,
        (id) => setIrcMissionId(id)
    ), [gameManager]);

    // -- Handlers --
    const handleStartMission = useCallback((id: string) => {
        missionController.startMission(id);
    }, [missionController]);

    const handleAbandonMission = useCallback((id: string) => {
        missionController.abandonMission(id);
    }, [missionController]);

    const refreshMissions = useCallback(() => {
        setMissions([...gameManager.getActiveMissions()]);
    }, [gameManager]);

    return {
        missions: missions.map(MissionMapper.toDTO),
        ircMissionId,
        setIrcMissionId,
        handleStartMission,
        handleAbandonMission,
        refreshMissions // Exposed for ShellVM to trigger
    };
};
