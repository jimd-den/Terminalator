import { TutorContext, TUTOR_LINES, TutorLine } from '../../data/TutorPersonality';

export class TutorPersonalityService {
    public getLine(context: TutorContext): string {
        const lines = TUTOR_LINES[context];
        if (!lines || lines.length === 0) return "Checking protocols...";

        // Weighted Random Selection
        const totalWeight = lines.reduce((sum, line) => sum + line.weight, 0);
        let random = Math.random() * totalWeight;
        
        for (const line of lines) {
            if (random < line.weight) return line.text;
            random -= line.weight;
        }

        return lines[0].text;
    }
}