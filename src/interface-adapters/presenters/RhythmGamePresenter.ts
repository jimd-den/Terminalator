/**
 * RhythmGamePresenter - Interface Adapter Layer
 * 
 * Pure logic class for preparing rhythm game data for the view.
 * Calculates grades, formats scores, and handles feedback mapping.
 */

import { RhythmStats } from '../../domain/entities/TutorEngine';
import { ZincFormatter } from '../../domain/utils/ZincFormatter';

export type RhythmGrade = 'SS' | 'S' | 'A' | 'B' | 'C' | 'D' | 'F';

export interface RhythmSummary {
    grade: RhythmGrade;
    perfectPercentage: string;
    accuracyPercentage: string;
    maxStreak: number;
    totalMined: string;
    totalWallet: string;
}

export class RhythmGamePresenter {
    /**
     * Calculates a JRPG-style letter grade based on session performance.
     */
    static calculateGrade(stats: RhythmStats): RhythmGrade {
        const { accuracy, perfectHits, totalHits } = stats;
        
        if (totalHits === 0) return 'F';

        const perfectRatio = (perfectHits / totalHits) * 100;

        if (accuracy >= 98 && perfectRatio >= 90) return 'SS';
        if (accuracy >= 95 && perfectRatio >= 80) return 'S';
        if (accuracy >= 90) return 'A';
        if (accuracy >= 80) return 'B';
        if (accuracy >= 70) return 'C';
        if (accuracy >= 60) return 'D';
        return 'F';
    }

    /**
     * Prepares a full summary for the end-of-session screen.
     */
    static getSummary(stats: RhythmStats): RhythmSummary {
        return {
            grade: this.calculateGrade(stats),
            perfectPercentage: ((stats.perfectHits / (stats.totalHits || 1)) * 100).toFixed(1) + '%',
            accuracyPercentage: stats.accuracy.toFixed(1) + '%',
            maxStreak: stats.maxStreak,
            totalMined: ZincFormatter.formatFull(stats.totalZincMined),
            totalWallet: ZincFormatter.formatFull(stats.walletBalance)
        };
    }

    /**
     * Maps performance to visual feedback types.
     */
    static getFeedbackType(isOnBeat: boolean, isMistake: boolean): 'PERFECT' | 'GREAT' | 'MISS' | 'NONE' {
        if (isMistake) return 'MISS';
        if (isOnBeat) return 'PERFECT';
        return 'GREAT';
    }
}
