import { HighlighterRegistry } from '../src/interface-adapters/vim/HighlighterRegistry';
import { CheckerRegistry } from '../src/interface-adapters/vim/CheckerRegistry';

function testHighlighterRegistry() {
    console.log("Testing HighlighterRegistry...");
    const registry = new HighlighterRegistry();

    const scheme = registry.getHighlighterForFile('script.scm');
    if (scheme.language !== 'scheme') throw new Error("Expected scheme highlighter for .scm");

    const asm = registry.getHighlighterForFile('program.s');
    if (asm.language !== 'asm') throw new Error("Expected asm highlighter for .s");

    console.log("Highlighter Registry PASS");
}

function testCheckerRegistry() {
    console.log("Testing CheckerRegistry...");
    const registry = new CheckerRegistry();

    const scheme = registry.getCheckerForExtension('scm');
    if (!scheme || scheme.language !== 'scheme') throw new Error("Expected scheme checker for .scm");

    const asm = registry.getCheckerForExtension('s');
    if (!asm || asm.language !== 'asm') throw new Error("Expected asm checker for .s");

    console.log("Checker Registry PASS");
}

function testSchemeHighlighting() {
    console.log("Testing Scheme Highlighting...");
    const registry = new HighlighterRegistry();
    const highlighter = registry.getHighlighterForFile('test.scm');
    
    const tokens = highlighter.highlight('(define x 10)');
    if (tokens[0].text !== '(' || tokens[0].type !== 'operator') throw new Error("Failed to highlight (");
    if (tokens[1].text !== 'define' || tokens[1].type !== 'keyword') throw new Error("Failed to highlight define");
    
    console.log("Scheme Highlighting PASS");
}

try {
    testHighlighterRegistry();
    testCheckerRegistry();
    testSchemeHighlighting();
    console.log("\nALL LANGUAGE SUPPORT TESTS PASSED");
} catch (e) {
    console.error(`\nTEST FAILED: ${e}`);
    process.exit(1);
}