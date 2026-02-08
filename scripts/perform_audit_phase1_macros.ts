
import * as fs from 'fs';
import * as path from 'path';
import { findGlobalConstructs } from './audit_macros';

const TARGET_DIR = path.join(__dirname, '../src');
const OUTPUT_FILE = path.join(__dirname, '../conductor/tracks/clean_arch_audit_20260205/audit_findings/phase1_macros.md');

function runAudit() {
    console.log(`Scanning for macros and global utilities in ${TARGET_DIR}...`);
    try {
        const findings = findGlobalConstructs(TARGET_DIR);
        
        let report = `# Phase 1: Global Utilities & Macros Audit

`;
        report += `## Global Utility Directories (Potential Leakage)
`;
        if (findings.utils.length > 0) {
            report += `Found ${findings.utils.length} 'utils' directories:
`;
            findings.utils.forEach(p => {
                report += `- ${path.relative(TARGET_DIR, p)}
`;
            });
        } else {
            report += `No 'utils' directories found.
`;
        }

        report += `
## Global Constants Directories
`;
        if (findings.constants.length > 0) {
            report += `Found ${findings.constants.length} 'constants' directories:
`;
            findings.constants.forEach(p => {
                report += `- ${path.relative(TARGET_DIR, p)}
`;
            });
        } else {
            report += `No 'constants' directories found.
`;
        }

        report += `
## Analysis
- **Utils:** Frequent use of 'utils' folders can indicate a lack of proper abstraction or "God Classes" split into functions.
- **Constants:** Global constants are generally acceptable but should be scoped to their domain layer if specific.
`;

        fs.writeFileSync(OUTPUT_FILE, report);
        console.log(`Report written to ${OUTPUT_FILE}`);
    } catch (e) {
        console.error("Error during audit:", e);
        process.exit(1);
    }
}

runAudit();
