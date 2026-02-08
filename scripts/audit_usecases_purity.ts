import * as fs from 'fs';
import * as path from 'path';

const TARGET_DIR = path.join(__dirname, '../src/domain/usecases');
const REPORT_FILE = path.join(__dirname, '../conductor/tracks/clean_arch_audit_20260205/audit_findings/phase2_usecases_audit.md');

interface AuditResult {
    file: string;
    violations: string[];
}

function auditFile(filePath: string): AuditResult {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const violations: string[] = [];

    lines.forEach((line, index) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('import')) {
            if (trimmed.includes('infrastructure') || 
                trimmed.includes('frameworks-drivers') || 
                trimmed.includes('react-native') ||
                trimmed.includes('expo')) {
                violations.push(`Line ${index + 1}: ${trimmed}`);
            }
        }
    });

    return { file: path.relative(path.join(__dirname, '..'), filePath), violations };
}

function walk(dir: string, results: AuditResult[]) {
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const filePath = path.join(dir, file);
        const stats = fs.statSync(filePath);
        if (stats.isDirectory()) {
            walk(filePath, results);
        } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
            results.push(auditFile(filePath));
        }
    });
}

function runAudit() {
    console.log(`Auditing usecases in ${TARGET_DIR} for dependency rule violations...`);
    const results: AuditResult[] = [];
    walk(TARGET_DIR, results);

    const totalFiles = results.length;
    const filesWithViolations = results.filter(r => r.violations.length > 0);

    let report = `# Phase 2: Use Cases Dependency Audit Report

## Summary
- **Total Use Case Files Audited:** ${totalFiles}
- **Files with Potential Dependency Rule Violations:** ${filesWithViolations.length}

## Analysis
According to Clean Architecture, Use Cases should contain application-specific business rules. They should depend on Entities and should NOT depend on outer layers like Infrastructure or Frameworks.

`;

    if (filesWithViolations.length > 0) {
        report += `## Violations Detected\n\n`;
        filesWithViolations.forEach(res => {
            report += `### ${res.file}\n`;
            res.violations.forEach(v => {
                report += `- ${v}\n`;
            });
            report += `\n`;
        });
    } else {
        report += `## Result: No dependency rule violations detected in Use Cases layer. ✅\n`;
    }

    fs.writeFileSync(REPORT_FILE, report);
    console.log(`Audit complete. Report written to ${REPORT_FILE}`);
}

runAudit();