import * as fs from 'fs';
import * as path from 'path';
import { mapFileStructure, FileNode } from './audit_structure';

const TARGET_DIR = path.join(__dirname, '../src');
const OUTPUT_FILE = path.join(__dirname, '../conductor/tracks/clean_arch_audit_20260205/audit_findings/phase1_structure.md');

function generateMarkdownTree(node: FileNode, depth: number = 0): string {
    const indent = '  '.repeat(depth);
    let output = `${indent}- ${node.name}${node.type === 'directory' ? '/' : ''}\n`;
    
    if (node.children) {
        node.children.forEach(child => {
            output += generateMarkdownTree(child, depth + 1);
        });
    }
    return output;
}

function analyzeStructure(root: FileNode): string {
    let analysis = `## Structural Analysis

`;
    
    const topLevelDirs = root.children?.filter(c => c.type === 'directory').map(c => c.name) || [];
    analysis += `**Top-level directories in src/:** ${topLevelDirs.join(', ')}\n\n`;

    // Check for Clean Architecture Layers
    const layers = ['domain', 'usecases', 'interface-adapters', 'frameworks-drivers', 'infrastructure'];
    const foundLayers = topLevelDirs.filter(d => layers.includes(d));
    const missingLayers = layers.filter(d => !topLevelDirs.includes(d));

    analysis += `**Clean Architecture Layers Found:** ${foundLayers.length > 0 ? foundLayers.join(', ') : 'None'}\n`;
    analysis += `**Potential Missing/Renamed Layers:** ${missingLayers.join(', ')}\n\n`;

    // Screaming Architecture Check
    analysis += `### Screaming Architecture Assessment
Ideally, top-level folders should reflect *intent* (features) or strict *layers*.
`;
    if (foundLayers.length >= 3) {
        analysis += `- **Observation:** The project seems to follow a **Layer-First** organization (\`domain\`, \`infrastructure\` etc.).\n`;
    } else {
        analysis += `- **Observation:** The project might be Feature-First or Hybrid.\n`;
    }

    return analysis;
}

function runAudit() {
    console.log(`Mapping structure of ${TARGET_DIR}...`);
    try {
        const root = mapFileStructure(TARGET_DIR);
        
        const treeMarkdown = `## Physical File Structure

` + generateMarkdownTree(root);
        const analysis = analyzeStructure(root);

        const report = `# Phase 1: Structure Audit

${analysis}
${treeMarkdown}`;

        fs.writeFileSync(OUTPUT_FILE, report);
        console.log(`Report written to ${OUTPUT_FILE}`);
    } catch (e) {
        console.error("Error during audit:", e);
        process.exit(1);
    }
}

runAudit();