/**
 * ToolRegistry.ts - Domain Service
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * The Black Market Inventory
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export interface Tool {
    id: string;
    name: string;
    cost: number;
    description: string;
    binaryName: string;
}

export class ToolRegistry {
    private static readonly TOOLS: Tool[] = [
        {
            id: 'bypass',
            name: 'Bypass Script',
            cost: 500,
            description: 'Automates privilege escalation on known vulnerabilities.',
            binaryName: 'bypass.sh'
        },
        {
            id: 'decrypter',
            name: 'Advanced Decrypter',
            cost: 1200,
            description: 'Bypasses standard file encryption.',
            binaryName: 'decrypter.bin'
        },
        {
            id: 'scanner',
            name: 'Network Crawler',
            cost: 300,
            description: 'Automatically maps adjacent nodes in the lattice.',
            binaryName: 'crawler.bin'
        }
    ];

    public static getTools(): Tool[] {
        return [...this.TOOLS];
    }

    public static getToolByBinary(name: string): Tool | undefined {
        return this.TOOLS.find(t => t.binaryName === name);
    }
}
