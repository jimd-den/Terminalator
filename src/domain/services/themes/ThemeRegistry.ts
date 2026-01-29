/**
 * ThemeRegistry - Domain Service Helper
 * 
 * Manages narrative themes for procedural generation.
 * Implements the Strategy Pattern registry for OCP compliance.
 */

export interface NarrativeTheme {
    hostPrefixes: string[];
    hostSuffixes: string[];
    emails: { from: string, subject: string, body: string }[];
    logs: string[];
    todos: string[];
}

export class ThemeRegistry {
    private themes: Map<string, NarrativeTheme> = new Map();

    constructor() {
        this.registerDefaults();
    }

    public register(name: string, theme: NarrativeTheme) {
        this.themes.set(name, theme);
    }

    public get(name: string): NarrativeTheme {
        return this.themes.get(name) || this.themes.get('corporate')!;
    }

    public getRandom(): NarrativeTheme {
        const keys = Array.from(this.themes.keys());
        const randomKey = keys[Math.floor(Math.random() * keys.length)];
        return this.themes.get(randomKey)!;
    }

    private registerDefaults() {
        this.register('corporate', {
            hostPrefixes: ['CORP', 'HQ', 'FIN', 'SALES'],
            hostSuffixes: ['SRV', 'NODE', 'UNIT'],
            emails: [
                { from: 'hr@corp.net', subject: 'Policy Update', body: 'Please review the new data retention policy.' },
                { from: 'boss@corp.net', subject: 'Q3 Goals', body: 'We need to hit the targets this quarter.' }
            ],
            logs: ['Auth service started', 'Backup completed', 'User logged in'],
            todos: ['- Submit expense report', '- Update client list', '- Schedule meeting']
        });

        this.register('military', {
            hostPrefixes: ['CMD', 'TAC', 'DEF', 'SEC'],
            hostSuffixes: ['ALPHA', 'BRAVO', 'OMNI'],
            emails: [
                { from: 'cmd@mil.net', subject: 'Classified Briefing', body: 'Eyes only. Operation Blackout is a go.' }
            ],
            logs: ['Security alert level raised', 'Perimeter breach detected', 'Firewall active'],
            todos: ['- Patrol sector 7', '- Calibrate sensors', '- Inspect armory']
        });

        this.register('research', {
            hostPrefixes: ['LAB', 'BIO', 'DATA', 'AI'],
            hostSuffixes: ['PRIME', 'CORE', 'NEXUS'],
            emails: [
                { from: 'lead@research.net', subject: 'Simulation Results', body: 'The anomaly is growing. See attached data.' }
            ],
            logs: ['Experiment 442 initiated', 'Containment field stable', 'Data anomaly detected'],
            todos: ['- Calibrate microscope', '- Order reagents', '- Restart simulation']
        });
    }
}
