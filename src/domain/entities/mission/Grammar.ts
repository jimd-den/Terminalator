/**
 * Grammar.ts - Domain Entity
 * 
 * Defines the pools of variables for combinatorial mission generation.
 * 
 * Pillar: THE MASTER'S TOOL (Combinatorial Grammar)
 * Pillar: THE STORYTELLER'S CODE (Literate Documentation)
 */

export enum MissionMotive {
    CORPORATE_SABOTAGE = 'CORPORATE_SABOTAGE',
    INFRASTRUCTURE_AUDIT = 'INFRASTRUCTURE_AUDIT',
    ROGUE_HACK = 'ROGUE_HACK',
    POLITICAL_EXFILTRATION = 'POLITICAL_EXFILTRATION',
    EMERGENCY_RECOVERY = 'EMERGENCY_RECOVERY'
}

export enum MissionVerb {
    EXTRACT = 'EXTRACT',
    APPEND = 'APPEND',
    DELETE = 'DELETE',
    VERIFY = 'VERIFY',
    COUNT = 'COUNT',
    SORT = 'SORT'
}

export enum MissionNoun {
    SERVER_LOGS = 'SERVER_LOGS',
    DB_RECORDS = 'DB_RECORDS',
    CONFIG_FILES = 'CONFIG_FILES',
    SATLINK_STREAM = 'SATLINK_STREAM',
    PERSONNEL_FILES = 'PERSONNEL_FILES'
}

export interface GrammarRegistry {
    motives: MissionMotive[];
    verbs: MissionVerb[];
    nouns: MissionNoun[];
}
