/**
 * Lexicon.ts
 *
 * Pillar: THE STORYTELLER’S CODE (Vocabulary)
 * Pillar: THE FOUR-FOLD SHIELD (Clean Architecture) - Domain Entities
 *
 * Intent:
 * Defines the atomic building blocks of the Tutor's language.
 * Each word is tagged with metadata to allow for semantic assembly.
 */

import { TutorToneProfile } from './TutorToneProfile';

export enum PartOfSpeech {
    NOUN = 'NOUN',
    VERB = 'VERB',
    ADJECTIVE = 'ADJECTIVE',
    ADVERB = 'ADVERB',
    CONNECTOR = 'CONNECTOR',
    INTERJECTION = 'INTERJECTION'
}

export interface LexicalEntry {
    word: string;
    pos: PartOfSpeech;
    
    /**
     * Semantic tags (e.g., 'urgent', 'technical', 'praise').
     */
    tags: string[];
    
    /**
     * Tone profiles this word is suitable for.
     * If empty, suitable for all.
     */
    tones?: TutorToneProfile[];
}

export interface Lexicon {
    entries: LexicalEntry[];
}
