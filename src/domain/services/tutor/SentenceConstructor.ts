/**
 * SentenceConstructor.ts
 *
 * Pillar: THE MASTER'S TOOL (Syntactic Assembly)
 * Pillar: THE FOUR-FOLD SHIELD (Clean Architecture) - Domain Service
 *
 * Intent:
 * Assembles sentences from atomic lexical entries.
 * Replaces templates with grammar rules:
 * [Imperative Verb] + [Adjective] + [Technical Noun] + [Connector] + [Reason]
 */

import { Lexicon, PartOfSpeech, LexicalEntry } from '../../entities/tutor/Lexicon';
import { TutorToneProfile } from '../../entities/tutor/TutorToneProfile';
import { CORE_LEXICON } from '../../data/tutor/LexiconData';

export class SentenceConstructor {
    private lexicon: Lexicon;

    constructor() {
        this.lexicon = CORE_LEXICON;
    }

    public constructImperative(
        action: string, 
        reason: string, 
        tone: TutorToneProfile
    ): string {
        const structures = [
            () => {
                const verb = this.selectWord(PartOfSpeech.VERB, tone, ['tech', 'standard']);
                const adj = this.selectWord(PartOfSpeech.ADJECTIVE, tone, ['urgent', 'precision']);
                const noun = this.selectWord(PartOfSpeech.NOUN, tone, ['tech', 'standard']);
                const connector = this.selectWord(PartOfSpeech.CONNECTOR, tone, ['causal']);
                return `${verb} the ${adj} ${noun} ${connector} ${reason}.`;
            },
            () => {
                const inter = this.selectWord(PartOfSpeech.INTERJECTION, tone, ['alert']);
                const verb = this.selectWord(PartOfSpeech.VERB, tone, ['tactical', 'tech']);
                const adv = this.selectWord(PartOfSpeech.ADVERB, tone, ['urgent', 'precision']);
                return `${inter} ${verb} ${adv} ${reason}.`;
            },
            () => {
                const adj = this.selectWord(PartOfSpeech.ADJECTIVE, tone, ['positive', 'tech']);
                const noun = this.selectWord(PartOfSpeech.NOUN, tone, ['standard', 'tech']);
                return `This ${adj} ${noun} is ${reason}.`;
            }
        ];

        const selectedStructure = structures[Math.floor(Math.random() * structures.length)];
        return selectedStructure();
    }

    public constructCritique(
        error: string,
        tone: TutorToneProfile
    ): string {
        const inter = this.selectWord(PartOfSpeech.INTERJECTION, tone, ['alert']);
        const adj = this.selectWord(PartOfSpeech.ADJECTIVE, tone, ['negative']);
        const adv = this.selectWord(PartOfSpeech.ADVERB, tone, ['negative']);
        
        const structures = [
            () => `${inter} That command was ${adj}.`,
            () => `You are ${adv} failing the mission. ${error}.`,
            () => `System integrity is ${adj} because you are ${adv} typing nonsense.`
        ];

        const selectedStructure = structures[Math.floor(Math.random() * structures.length)];
        return selectedStructure();
    }

    public constructGreeting(tone: TutorToneProfile): string {
        const inter = this.selectWord(PartOfSpeech.INTERJECTION, tone, ['alert']);
        const verb = this.selectWord(PartOfSpeech.VERB, tone, ['tech', 'standard']);
        const adj = this.selectWord(PartOfSpeech.ADJECTIVE, tone, ['positive', 'tech']);
        
        const structures = [
            () => `${inter} Initializing ${adj} workspace.`,
            () => `${verb} the terminal. We are online.`,
            () => `System is ${adj}. Awaiting your ${adj} input.`
        ];

        return structures[Math.floor(Math.random() * structures.length)]();
    }

    public constructBriefing(verb: string, noun: string, target: string, tone: TutorToneProfile): string {
        const structures = [
            () => `DIRECTIVE: ${verb} the ${noun} on ${target}.`,
            () => `We need to ${verb} ${noun} at ${target} immediately.`,
            () => `Priority operation: ${verb} ${noun}. Location: ${target}.`
        ];

        return structures[Math.floor(Math.random() * structures.length)]();
    }

    public constructIdle(tone: TutorToneProfile): string {
        const structures = [
            () => {
                const adj = this.selectWord(PartOfSpeech.ADJECTIVE, tone, ['tech', 'precision']);
                const noun = this.selectWord(PartOfSpeech.NOUN, tone, ['tech', 'tactical']);
                const adv = this.selectWord(PartOfSpeech.ADVERB, tone, ['tech', 'standard']);
                return `Monitoring ${adj} ${noun} ${adv}.`;
            },
            () => {
                const inter = this.selectWord(PartOfSpeech.INTERJECTION, tone, ['alert']);
                return `${inter} The terminal awaits your input.`;
            },
            () => {
                const verb = this.selectWord(PartOfSpeech.VERB, tone, ['standard', 'tech']);
                const noun = this.selectWord(PartOfSpeech.NOUN, tone, ['tech']);
                return `Please ${verb} the ${noun} to maintain synchronization.`;
            }
        ];

        return structures[Math.floor(Math.random() * structures.length)]();
    }

    public constructRhythmFeedback(tone: TutorToneProfile, speed: 'FAST' | 'SLOW'): string {
        const adv = this.selectWord(PartOfSpeech.ADVERB, tone, speed === 'FAST' ? ['urgent', 'precision'] : ['negative']);
        const adj = this.selectWord(PartOfSpeech.ADJECTIVE, tone, ['tech']);
        
        const structures = [
            () => `Your keystrokes are ${adv} ${speed === 'FAST' ? 'efficient' : 'stalling'}.`,
            () => `${speed === 'FAST' ? 'Impressive' : 'Disappointing'} ${adj} rhythm detected.`,
            () => `System synchronization is ${speed === 'FAST' ? 'optimal' : 'degrading'} because you type ${adv}.`
        ];

        return structures[Math.floor(Math.random() * structures.length)]();
    }

    public constructAccuracyFeedback(tone: TutorToneProfile): string {
        const structures = [
            () => `Correction. Precision is mandatory.`,
            () => `Syntax error in buffer. Re-type with surgical focus.`,
            () => `Your input buffer is unstable. Maintain synchronization.`
        ];

        return structures[Math.floor(Math.random() * structures.length)]();
    }

    public constructInputProgress(tone: TutorToneProfile): string {
        const structures = [
            () => `I see you working on that command.`,
            () => `Buffer stream active. Maintaining uplink.`,
            () => `Data throughput increasing. Keep going.`
        ];

        return structures[Math.floor(Math.random() * structures.length)]();
    }

    private selectWord(pos: PartOfSpeech, tone: TutorToneProfile, desiredTags: string[]): string {
        const candidates = this.lexicon.entries.filter(e => {
            if (e.pos !== pos) return false;
            // Tone check: if word has tones, must match. If empty, it's universal.
            if (e.tones && !e.tones.includes(tone)) return false;
            return true;
        });

        if (candidates.length === 0) return '[WORD_MISSING]';

        // Prefer tags
        const better = candidates.filter(e => e.tags.some(t => desiredTags.includes(t)));
        const pool = better.length > 0 ? better : candidates;

        const selected = pool[Math.floor(Math.random() * pool.length)];
        return selected.word;
    }
}
