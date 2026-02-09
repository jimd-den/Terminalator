/**
 * TutorController - Interface Adapter Layer
 *
 * Manages tutor engine events and animation state.
 * Decouples tutor logic from the TerminalViewModel.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Balanced Scale (Single Responsibility)
 *
 * Intent:
 * Handles TutorEngine subscription and event processing.
 * Manages emotion state and crashing indices for animations.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { TutorEngine, TutorEvent, TutorEmotion, Lesson } from '../../domain/entities/TutorEngine';
import { TerminalState } from '../../domain/entities/TerminalState';

export interface TutorControllerState {
    emotion: TutorEmotion;
    crashingIndices: number[];
    isActive: boolean;
}

export interface TutorControllerCallbacks {
    onStart: (lesson: Lesson, targetCwd: string) => void;
    onStop: (originalCwd: string | null) => void;
    onProgress: (input: string, ghostText: string) => void;
    onCorrection: (input: string, ghostText: string) => void;
    onMistake: (input: string, ghostText: string, droppedCount: number) => void;
    onComplete: (payload: { lesson: Lesson, stats: any }, originalCwd: string | null) => void;
}

/**
 * useTutorController - React Hook
 *
 * Provides tutor state and subscribes to TutorEngine events.
 * Emits callbacks for other controllers to handle state updates.
 *
 * @param tutorEngine - The TutorEngine instance to subscribe to
 * @param callbacks - Callbacks for handling tutor events
 * @param currentCwd - Current working directory (for save/restore)
 */
export const useTutorController = (
    tutorEngine: TutorEngine,
    callbacks: TutorControllerCallbacks,
    currentCwd: string
): TutorControllerState => {
    const [emotion, setEmotion] = useState<TutorEmotion>(TutorEmotion.NORMAL);
    const [crashingIndices, setCrashingIndices] = useState<number[]>([]);
    const [isActive, setIsActive] = useState(false);

    // Refs for avoiding stale closures in event handlers
    const cwdRef = useRef(currentCwd);
    const preTutorCwdRef = useRef<string | null>(null);
    const callbacksRef = useRef(callbacks);

    // Update refs when dependencies change
    useEffect(() => {
        cwdRef.current = currentCwd;
    }, [currentCwd]);

    useEffect(() => {
        callbacksRef.current = callbacks;
    }, [callbacks]);

    // Subscribe to TutorEngine events
    useEffect(() => {
        const unsubscribe = tutorEngine.subscribe((event: TutorEvent) => {
            const engine = tutorEngine;
            const cb = callbacksRef.current;

            switch (event.type) {
                case 'START': {
                    const lesson = event.payload as Lesson;
                    preTutorCwdRef.current = cwdRef.current;
                    const targetCwd = (lesson as any).cwd || '/home/operator';
                    setIsActive(true);
                    cb.onStart(lesson, targetCwd);
                    break;
                }

                case 'STOP': {
                    const original = preTutorCwdRef.current;
                    preTutorCwdRef.current = null;
                    setIsActive(false);
                    cb.onStop(original);
                    break;
                }

                case 'EMOTION_CHANGE': {
                    setEmotion(event.payload as TutorEmotion);
                    break;
                }

                case 'CORRECTION': {
                    const completed = engine.getCompletedText();
                    const badChar = event.payload.actual;
                    const ghostText = engine.getGhostText();

                    // Show bad character briefly
                    cb.onCorrection(completed + badChar, ghostText);

                    // Snap back after animation
                    setTimeout(() => {
                        cb.onProgress(completed, ghostText);
                    }, 200);
                    break;
                }

                case 'PROGRESS': {
                    cb.onProgress(engine.getCompletedText(), engine.getGhostText());
                    break;
                }

                case 'MISTAKE': {
                    const droppedCount = event.payload.dropped;
                    const completed = engine.getCompletedText();
                    const startIdx = completed.length;
                    const endIdx = startIdx + droppedCount;

                    // Set crashing indices for animation
                    const indices: number[] = [];
                    for (let i = startIdx; i < endIdx; i++) {
                        indices.push(i);
                    }
                    setCrashingIndices(indices);

                    // Delay state update for animation
                    setTimeout(() => {
                        cb.onMistake(completed, engine.getGhostText(), droppedCount);
                        setCrashingIndices([]);
                    }, 400);
                    break;
                }

                case 'COMPLETE': {
                    const payload = event.payload;
                    const original = preTutorCwdRef.current;
                    setIsActive(false);
                    cb.onComplete(payload, original);

                    // Clear saved CWD after completion callback
                    if (original) {
                        setTimeout(() => {
                            preTutorCwdRef.current = null;
                        }, 1000);
                    }
                    break;
                }
            }
        });

        return unsubscribe;
    }, [tutorEngine]);

    return {
        emotion,
        crashingIndices,
        isActive
    };
};

/**
 * Helper to check if tutor is active (for input routing).
 */
export const createTutorActiveChecker = (tutorEngine: TutorEngine) => {
    return () => tutorEngine.isActive();
};
