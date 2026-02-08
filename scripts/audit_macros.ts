
import * as fs from 'fs';
import * as path from 'path';

export interface MacroFindings {
    utils: string[];
    constants: string[];
}

export function findGlobalConstructs(rootDir: string): MacroFindings {
    const findings: MacroFindings = { utils: [], constants: [] };

    function walk(dir: string) {
        try {
            const list = fs.readdirSync(dir);
            for (const file of list) {
                const filePath = path.join(dir, file);
                const stats = fs.statSync(filePath);
                if (stats.isDirectory()) {
                    if (file === 'utils' || file === 'utilities') {
                        findings.utils.push(filePath);
                    }
                    if (file === 'constants') {
                        findings.constants.push(filePath);
                    }
                    if (file !== 'node_modules' && !file.startsWith('.')) {
                        walk(filePath);
                    }
                }
            }
        } catch (e) {
            // Ignore access errors
        }
    }

    walk(rootDir);
    return findings;
}
