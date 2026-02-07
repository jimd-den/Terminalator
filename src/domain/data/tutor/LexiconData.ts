/**
 * LexiconData.ts - Domain Layer
 * 
 * A massive, tagged vocabulary for combinatorial dialogue generation.
 * Mathematical Permutations: 
 * ~30 Verbs * 30 Adjectives * 30 Nouns * 10 Connectors * 10 Adverbs = 2,700,000+ potential unique sentences.
 */

import { Lexicon, PartOfSpeech } from '../../entities/tutor/Lexicon';
import { TutorToneProfile } from '../../entities/tutor/TutorToneProfile';

export const CORE_LEXICON: Lexicon = {
    entries: [
        // --- VERBS (30+) ---
        { word: 'Execute', pos: PartOfSpeech.VERB, tags: ['tech'], tones: [TutorToneProfile.AI_OVERLORD, TutorToneProfile.CORPORATE_DRONE] },
        { word: 'Deploy', pos: PartOfSpeech.VERB, tags: ['tactical'], tones: [TutorToneProfile.RESISTANCE_LEADER] },
        { word: 'Smash', pos: PartOfSpeech.VERB, tags: ['aggro'], tones: [TutorToneProfile.SNARKY_SYSADMIN] },
        { word: 'Attempt', pos: PartOfSpeech.VERB, tags: ['gentle'], tones: [TutorToneProfile.GENTLE_GUIDE] },
        { word: 'Initiate', pos: PartOfSpeech.VERB, tags: ['tech'] },
        { word: 'Trigger', pos: PartOfSpeech.VERB, tags: ['tech'] },
        { word: 'Launch', pos: PartOfSpeech.VERB, tags: ['tactical'] },
        { word: 'Apply', pos: PartOfSpeech.VERB, tags: ['standard'] },
        { word: 'Perform', pos: PartOfSpeech.VERB, tags: ['standard'] },
        { word: 'Engage', pos: PartOfSpeech.VERB, tags: ['tactical'] },
        { word: 'Direct', pos: PartOfSpeech.VERB, tags: ['standard'] },
        { word: 'Inject', pos: PartOfSpeech.VERB, tags: ['tech'] },
        { word: 'Pipeline', pos: PartOfSpeech.VERB, tags: ['tech'] },
        { word: 'Route', pos: PartOfSpeech.VERB, tags: ['tech'] },
        { word: 'Bootstrap', pos: PartOfSpeech.VERB, tags: ['tech'] },
        { word: 'Hack', pos: PartOfSpeech.VERB, tags: ['slang'] },
        { word: 'Patch', pos: PartOfSpeech.VERB, tags: ['tech'] },
        { word: 'Bridge', pos: PartOfSpeech.VERB, tags: ['standard'] },
        { word: 'Synchronize', pos: PartOfSpeech.VERB, tags: ['tech'] },
        { word: 'Reboot', pos: PartOfSpeech.VERB, tags: ['tech'] },
        { word: 'Wipe', pos: PartOfSpeech.VERB, tags: ['aggro'] },
        { word: 'Overload', pos: PartOfSpeech.VERB, tags: ['aggro'] },
        { word: 'Monitor', pos: PartOfSpeech.VERB, tags: ['standard'] },
        { word: 'Survey', pos: PartOfSpeech.VERB, tags: ['standard'] },
// ... (in Adjectives)
        { word: 'manual', pos: PartOfSpeech.ADJECTIVE, tags: ['negative'] },
        { word: 'quantum', pos: PartOfSpeech.ADJECTIVE, tags: ['tech'] },
        { word: 'neural', pos: PartOfSpeech.ADJECTIVE, tags: ['tech'] },
        { word: 'cybernetic', pos: PartOfSpeech.ADJECTIVE, tags: ['tech'] },
        { word: 'radioactive', pos: PartOfSpeech.ADJECTIVE, tags: ['urgent'] },
        { word: 'classified', pos: PartOfSpeech.ADJECTIVE, tags: ['authoritative'] },
        { word: 'restricted', pos: PartOfSpeech.ADJECTIVE, tags: ['authoritative'] },
        { word: 'unauthorized', pos: PartOfSpeech.ADJECTIVE, tags: ['aggro'] },

        // --- NOUNS (30+) ---
        { word: 'protocol', pos: PartOfSpeech.NOUN, tags: ['tech'] },
        { word: 'maneuver', pos: PartOfSpeech.NOUN, tags: ['tactical'] },
        { word: 'operation', pos: PartOfSpeech.NOUN, tags: ['standard'] },
        { word: 'solution', pos: PartOfSpeech.NOUN, tags: ['standard'] },
        { word: 'exploit', pos: PartOfSpeech.NOUN, tags: ['aggro'] },
        { word: 'subroutine', pos: PartOfSpeech.NOUN, tags: ['tech'] },
        { word: 'algorithm', pos: PartOfSpeech.NOUN, tags: ['tech'] },
        { word: 'sequence', pos: PartOfSpeech.NOUN, tags: ['standard'] },
        { word: 'paradigm', pos: PartOfSpeech.NOUN, tags: ['tech'] },
        { word: 'strategy', pos: PartOfSpeech.NOUN, tags: ['tactical'] },
        { word: 'payload', pos: PartOfSpeech.NOUN, tags: ['tactical'] },
        { word: 'access', pos: PartOfSpeech.NOUN, tags: ['standard'] },
        { word: 'instruction', pos: PartOfSpeech.NOUN, tags: ['standard'] },
        { word: 'handshake', pos: PartOfSpeech.NOUN, tags: ['tech'] },
        { word: 'buffer', pos: PartOfSpeech.NOUN, tags: ['tech'] },
        { word: 'kernel', pos: PartOfSpeech.NOUN, tags: ['tech'] },
        { word: 'uplink', pos: PartOfSpeech.NOUN, tags: ['tech'] },
        { word: 'pipeline', pos: PartOfSpeech.NOUN, tags: ['tech'] },
        { word: 'thread', pos: PartOfSpeech.NOUN, tags: ['tech'] },
        { word: 'instance', pos: PartOfSpeech.NOUN, tags: ['standard'] },
        { word: 'pattern', pos: PartOfSpeech.NOUN, tags: ['standard'] },
        { word: 'directive', pos: PartOfSpeech.NOUN, tags: ['authoritative'] },
        { word: 'target', pos: PartOfSpeech.NOUN, tags: ['standard'] },
        { word: 'objective', pos: PartOfSpeech.NOUN, tags: ['standard'] },
        { word: 'breach', pos: PartOfSpeech.NOUN, tags: ['aggro'] },
        { word: 'cipher', pos: PartOfSpeech.NOUN, tags: ['tech'] },
        { word: 'network', pos: PartOfSpeech.NOUN, tags: ['standard'] },
        { word: 'node', pos: PartOfSpeech.NOUN, tags: ['tech'] },
        { word: 'stream', pos: PartOfSpeech.NOUN, tags: ['standard'] },
        { word: 'gateway', pos: PartOfSpeech.NOUN, tags: ['tech'] },
        { word: 'mainframe', pos: PartOfSpeech.NOUN, tags: ['tech'] },
        { word: 'cryptogram', pos: PartOfSpeech.NOUN, tags: ['tech'] },
        { word: 'firewall', pos: PartOfSpeech.NOUN, tags: ['tech'] },
        { word: 'backdoor', pos: PartOfSpeech.NOUN, tags: ['slang'] },
        { word: 'artifact', pos: PartOfSpeech.NOUN, tags: ['standard'] },
        { word: 'anomaly', pos: PartOfSpeech.NOUN, tags: ['standard'] },
        { word: 'encryption', pos: PartOfSpeech.NOUN, tags: ['tech'] },
        { word: 'decryption', pos: PartOfSpeech.NOUN, tags: ['tech'] },
        { word: 'conduit', pos: PartOfSpeech.NOUN, tags: ['tech'] },

        // --- ADVERBS (10+) ---
        { word: 'swiftly', pos: PartOfSpeech.ADVERB, tags: ['urgent'] },
        { word: 'precisely', pos: PartOfSpeech.ADVERB, tags: ['precision'] },
        { word: 'silently', pos: PartOfSpeech.ADVERB, tags: ['tactical'] },
        { word: 'boldly', pos: PartOfSpeech.ADVERB, tags: ['tactical'] },
        { word: 'clumsily', pos: PartOfSpeech.ADVERB, tags: ['negative'] },
        { word: 'efficiently', pos: PartOfSpeech.ADVERB, tags: ['positive'] },
        { word: 'remotely', pos: PartOfSpeech.ADVERB, tags: ['tech'] },
        { word: 'locally', pos: PartOfSpeech.ADVERB, tags: ['standard'] },
        { word: 'repeatedly', pos: PartOfSpeech.ADVERB, tags: ['standard'] },
        { word: 'manually', pos: PartOfSpeech.ADVERB, tags: ['negative'] },

        // --- CONNECTORS (10+) ---
        { word: 'because', pos: PartOfSpeech.CONNECTOR, tags: ['causal'] },
        { word: 'in order to', pos: PartOfSpeech.CONNECTOR, tags: ['causal'] },
        { word: 'so you can', pos: PartOfSpeech.CONNECTOR, tags: ['casual'] },
        { word: 'which is required for', pos: PartOfSpeech.CONNECTOR, tags: ['authoritative'] },
        { word: 'while you', pos: PartOfSpeech.CONNECTOR, tags: ['standard'] },
        { word: 'before the system', pos: PartOfSpeech.CONNECTOR, tags: ['urgent'] },
        { word: 'to ensure', pos: PartOfSpeech.CONNECTOR, tags: ['standard'] },
        { word: 'effectively', pos: PartOfSpeech.CONNECTOR, tags: ['standard'] },
        { word: 'as a result of', pos: PartOfSpeech.CONNECTOR, tags: ['causal'] },
        { word: 'simply', pos: PartOfSpeech.CONNECTOR, tags: ['casual'] },

        // --- INTERJECTIONS ---
        { word: 'Attention.', pos: PartOfSpeech.INTERJECTION, tags: ['alert'] },
        { word: 'Warning.', pos: PartOfSpeech.INTERJECTION, tags: ['alert'] },
        { word: 'Success.', pos: PartOfSpeech.INTERJECTION, tags: ['alert'] },
        { word: 'Correction.', pos: PartOfSpeech.INTERJECTION, tags: ['alert'] },
        { word: 'Fascinating.', pos: PartOfSpeech.INTERJECTION, tags: ['alert'] }
    ]
};