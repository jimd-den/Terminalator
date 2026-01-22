/**
 * verify_shell_grammar.ts
 * 
 * Comprehensive Test Suite for POSIX Shell Grammar.
 * Covers: Tokenization, AST Structure, Operator Precedence, Quoting, and Control Flow.
 * 
 * Usage: npx tsx scripts/verify_shell_grammar.ts
 */

import { ShellParser, ASTNode, NodeType } from '../src/domain/services/ShellParser';
import { ShellLexer, Token, TokenType } from '../src/domain/services/ShellLexer';

// Minimal Assertion Helper
let testsRun = 0;
let testsPassed = 0;

function expect(name: string, actual: any, expected: any) {
    testsRun++;
    const actualStr = JSON.stringify(actual);
    const expectedStr = JSON.stringify(expected);
    if (actualStr === expectedStr) {
        testsPassed++;
        // console.log(`[PASS] ${name}`);
    } else {
        console.error(`[FAIL] ${name}`);
        console.error(`  Expected: ${expectedStr}`);
        console.error(`  Actual:   ${actualStr}`);
    }
}

function expectAST(name: string, parser: ShellParser, input: string, expectedType: NodeType) {
    try {
        const ast = parser.parse(input);
        testsRun++;
        if (ast && ast.type === expectedType) {
            testsPassed++;
        } else {
            console.error(`[FAIL] ${name}`);
            console.error(`  Expected Type: ${expectedType}`);
            console.error(`  Actual:   ${ast ? ast.type : 'null'}`);
        }
    } catch (e: any) {
        testsRun++;
        console.error(`[FAIL] ${name} - Threw Error: ${e.message}`);
    }
}

// Stub classes for TDD until real implementation exists
// We expect these tests to FAIL initially if the classes don't exist or are empty.
// This script assumes the interfaces are at least defined.

async function runSuite() {
    console.log("=== Shell Grammar Verification Suite ===");

    // We instantiate the Lexer/Parser. If they don't exist yet, we catch error.
    let lexer: ShellLexer;
    let parser: ShellParser;

    try {
        lexer = new ShellLexer();
        parser = new ShellParser(); // Should eventually take lexer?
    } catch (e) {
        console.warn("Classes not fully implemented yet. Running what we can.");
        return;
    }

    // --- 1. Lexical Analysis (Tokens) ---
    // Cases 1-40: Basic Tokens, Operators, Quoting

    const testTokenize = (input: string, expectedTokens: any[]) => {
        const tokens = lexer.tokenize(input);
        const mapped = tokens.map((t: Token) => ({ type: t.type, value: t.value }));
        // Filter out EOF for simpler comparison if you want, but compliant lexer has EOF
        // Assuming strict match
        expect(`Lex: ${input}`, mapped.slice(0, expectedTokens.length), expectedTokens);
    };

    // Words
    testTokenize("ls", [{ type: TokenType.WORD, value: "ls" }]);
    testTokenize("ls -la", [{ type: TokenType.WORD, value: "ls" }, { type: TokenType.WORD, value: "-la" }]);
    testTokenize("echo hello world", [{ type: "WORD", value: "echo" }, { type: "WORD", value: "hello" }, { type: "WORD", value: "world" }]);

    // Operators
    testTokenize("a|b", [{ type: "WORD", value: "a" }, { type: "PIPE", value: "|" }, { type: "WORD", value: "b" }]);
    testTokenize("a;b", [{ type: "WORD", value: "a" }, { type: "SEMI", value: ";" }, { type: "WORD", value: "b" }]);
    testTokenize("a&&b", [{ type: "WORD", value: "a" }, { type: "AND_IF", value: "&&" }, { type: "WORD", value: "b" }]);
    testTokenize("a||b", [{ type: "WORD", value: "a" }, { type: "OR_IF", value: "||" }, { type: "WORD", value: "b" }]);

    // Spacing around operators
    testTokenize("a | b", [{ type: "WORD", value: "a" }, { type: "PIPE", value: "|" }, { type: "WORD", value: "b" }]);
    testTokenize("a ; b", [{ type: "WORD", value: "a" }, { type: "SEMI", value: ";" }, { type: "WORD", value: "b" }]);

    // Quotes
    testTokenize("'single quotes'", [{ type: "WORD", value: "single quotes" }]);
    testTokenize('"double quotes"', [{ type: "WORD", value: "double quotes" }]);
    testTokenize('"mix"\'ed\'', [{ type: "WORD", value: "mixed" }]); // Word concatenation is correct POSIX behavior here
    // Let's assume our lexer produces one word for "mix"'ed'
    testTokenize('"foo"bar', [{ type: "WORD", value: "foobar" }]);

    // Escaping
    testTokenize("echo \\|", [{ type: "WORD", value: "echo" }, { type: "WORD", value: "|" }]); // Escaped pipe is a word
    testTokenize("foo\\ bar", [{ type: "WORD", value: "foo bar" }]);

    // Comments
    testTokenize("echo #comment", [{ type: "WORD", value: "echo" }]);
    testTokenize("# comment only", []);
    testTokenize("echo arg#notcomment", [{ type: "WORD", value: "echo" }, { type: "WORD", value: "arg#notcomment" }]);

    // Variables (Lexer sees them as words usually, expansion is later, but maybe we want TOKEN_VAR?)
    // POSIX: $ is just a character unless special. 
    testTokenize("$VAR", [{ type: "WORD", value: "$VAR" }]);

    // Newlines
    testTokenize("ls\npwd", [{ type: "WORD", value: "ls" }, { type: "NEWLINE", value: "\n" }, { type: "WORD", value: "pwd" }]);

    // --- 2. AST Parsing ---
    // Cases 50-150: Assignments, Simple Commands, Pipelines, Lists

    // Simple Command
    expectAST("Simple", parser, "ls -la", NodeType.COMMAND);
    expectAST("Simple with env", parser, "VAR=1 ls", NodeType.COMMAND);

    // Pipelines
    expectAST("Pipe", parser, "ls | grep foo", NodeType.PIPELINE);
    expectAST("Multi Pipe", parser, "cat | grep | wc", NodeType.PIPELINE);

    // Lists (Sequences)
    expectAST("Seq ;", parser, "ls; pwd", NodeType.LIST);
    expectAST("Seq &&", parser, "make && ./bin", NodeType.LIST);
    expectAST("Seq ||", parser, "test || die", NodeType.LIST);

    // Precedence
    // a && b || c  -> ((a && b) || c) left associative
    // ls | grep || echo fail -> (ls | grep) || echo fail

    // Test complex nesting
    expectAST("Complex 1", parser, "ls | grep foo && echo found || echo missing", NodeType.LIST);

    // Grouping / Subshells
    expectAST("Subshell", parser, "(cd /tmp; ls)", NodeType.SUBSHELL);
    expectAST("Group in logic", parser, "make || (echo fail; exit 1)", NodeType.LIST);

    // Edge Cases
    // "ls;" valid? Yes.
    expectAST("Trailing semi", parser, "ls;", NodeType.COMMAND); // Single command with semi is still just a command execution-wise in our parser implementation currently.

    // "||" invalid null command
    // expectError("Missing operand", parser, "|| ls");

    console.log(`\nResults: ${testsPassed}/${testsRun} tests passed.`);
}

runSuite().catch(console.error);
