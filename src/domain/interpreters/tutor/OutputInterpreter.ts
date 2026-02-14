/**
 * OutputInterpreter.ts - Domain Interpreter
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * Sensory Input Interpreter
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { KnowledgeEntity, KnowledgeType } from '../../entities/knowledge/KnowledgeEntity';

export class OutputInterpreter {
    public interpret(command: string, output: string): KnowledgeEntity[] {
        const entities: KnowledgeEntity[] = [];
        const cmd = command.trim().split(' ')[0];

        switch (cmd) {
            case 'ls':
                entities.push(...this.parseLs(output, command));
                break;
            case 'check-comms':
                entities.push(...this.parseCheckComms(output));
                break;
            case 'ifconfig':
                entities.push(...this.parseIfconfig(output));
                break;
            case 'nmap':
                entities.push(...this.parseNmap(output));
                break;
            case 'grep':
                entities.push(...this.parseGrep(output));
                break;
            case 'whoami':
                entities.push(...this.parseWhoami(output));
                break;
            case 'ps':
                entities.push(...this.parsePs(output));
                break;
        }

        return entities;
    }

    private parseLs(output: string, command: string): KnowledgeEntity[] {
        const entities: KnowledgeEntity[] = [];
        const lines = output.split('\n');
        
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('total')) continue;
            
            const parts = trimmed.split(/\s+/);
            // In 'ls -la', filename is the last part.
            // We ignore '.' and '..'
            const name = parts[parts.length - 1];
            if (name && name !== '.' && name !== '..' && !/^\d+$/.test(name)) {
                entities.push({
                    type: KnowledgeType.PATH,
                    value: name,
                    discoveredAt: Date.now(),
                    source: command,
                    isBelief: false
                });
            }
        }
        return entities;
    }

    private parseCheckComms(output: string): KnowledgeEntity[] {
        const entities: KnowledgeEntity[] = [];
        const lines = output.split('\n');
        for (const line of lines) {
            if (line.startsWith('Target:')) {
                const hostname = line.split(':')[1].trim();
                if (hostname) {
                    entities.push({
                        type: KnowledgeType.HOSTNAME,
                        value: hostname,
                        discoveredAt: Date.now(),
                        source: 'check-comms',
                        isBelief: false
                    });
                }
            }
        }
        return entities;
    }

    private parseIfconfig(output: string): KnowledgeEntity[] {
        const entities: KnowledgeEntity[] = [];
        const lines = output.split('\n');
        for (const line of lines) {
            if (line.includes('inet ')) {
                const match = /inet\s+((?:\d{1,3}\.){3}\d{1,3})/.exec(line);
                if (match && match[1] !== '127.0.0.1') {
                    entities.push({
                        type: KnowledgeType.IP,
                        value: match[1],
                        discoveredAt: Date.now(),
                        source: 'ifconfig',
                        isBelief: false
                    });
                }
            }
        }
        return entities;
    }

    private parseNmap(output: string): KnowledgeEntity[] {
        const entities: KnowledgeEntity[] = [];
        // Extract "Nmap scan report for 10.0.0.1"
        const ipRegex = /Nmap scan report for ([^\s]+)/g;
        let match;
        while ((match = ipRegex.exec(output)) !== null) {
            const val = match[1];
            // If it's a hostname with IP in parens, extract IP
            const parenMatch = /\(([^)]+)\)/.exec(val);
            const ip = parenMatch ? parenMatch[1] : val;
            
            entities.push({
                type: KnowledgeType.IP,
                value: ip,
                discoveredAt: Date.now(),
                source: 'nmap',
                isBelief: false
            });
        }
        return entities;
    }

    private parseGrep(output: string): KnowledgeEntity[] {
        const entities: KnowledgeEntity[] = [];
        const lines = output.split('\n');
        for (const line of lines) {
            if (line.includes(':')) {
                const path = line.split(':')[0].trim();
                if (path && !path.includes(' ')) {
                    entities.push({
                        type: KnowledgeType.PATH,
                        value: path,
                        discoveredAt: Date.now(),
                        source: 'grep',
                        isBelief: false
                    });
                }
            }
        }
        return entities;
    }

    private parseWhoami(output: string): KnowledgeEntity[] {
        const user = output.trim();
        if (user) {
            return [{
                type: KnowledgeType.USER,
                value: user,
                discoveredAt: Date.now(),
                source: 'whoami',
                isBelief: false
            }];
        }
        return [];
    }

    private parsePs(output: string): KnowledgeEntity[] {
        const entities: KnowledgeEntity[] = [];
        const lines = output.split('\n').slice(1);
        for (const line of lines) {
            const parts = line.trim().split(/\s+/);
            const pid = parts[0];
            if (pid && /^\d+$/.test(pid)) {
                entities.push({
                    type: KnowledgeType.PID,
                    value: pid,
                    discoveredAt: Date.now(),
                    source: 'ps',
                    isBelief: false
                });
            }
        }
        return entities;
    }
}
