import { getStdinAsString } from '../../../entities/ProcessContext';

/**
 * AwkParser - Domain Layer
 *
 * Parses token stream into AST.
 */

import { AwkLexer, AwkToken, AwkTokenType } from './AwkLexer';

export interface ASTNode { type: string; }

export interface ProgramNode extends ASTNode {
    type: 'Program';
    beginBlocks: BlockNode[];
    endBlocks: BlockNode[];
    patternActions: PatternActionNode[];
}

export interface BlockNode extends ASTNode {
    type: 'Block';
    statements: StatementNode[];
}

export interface PatternActionNode extends ASTNode {
    type: 'PatternAction';
    pattern?: ExpressionNode;
    action: BlockNode;
}

export type StatementNode = PrintStatementNode | ExprStatementNode | IfStatementNode | BlockNode;

export interface PrintStatementNode extends ASTNode {
    type: 'Print';
    args: ExpressionNode[];
}

export interface ExprStatementNode extends ASTNode {
    type: 'ExprStmt';
    expr: ExpressionNode;
}

export interface IfStatementNode extends ASTNode {
    type: 'If';
    condition: ExpressionNode;
    thenBranch: StatementNode; // or Block
    elseBranch?: StatementNode;
}

export type ExpressionNode = BinaryExpressionNode | UnaryExpressionNode | LiteralNode | VariableNode | FieldAccessNode | AssignExpressionNode;

export interface BinaryExpressionNode extends ASTNode {
    type: 'Binary';
    left: ExpressionNode;
    op: string;
    right: ExpressionNode;
}

export interface UnaryExpressionNode extends ASTNode {
    type: 'Unary';
    op: string;
    operand: ExpressionNode;
}

export interface LiteralNode extends ASTNode {
    type: 'Literal';
    value: string | number;
    valueType: 'string' | 'number' | 'regex';
}

export interface VariableNode extends ASTNode {
    type: 'Variable';
    name: string;
}

export interface FieldAccessNode extends ASTNode {
    type: 'FieldAccess';
    index: ExpressionNode;
}

export interface AssignExpressionNode extends ASTNode {
    type: 'Assign';
    left: VariableNode | FieldAccessNode;
    op: string;
    right: ExpressionNode;
}

export class AwkParser {
    private tokens: AwkToken[];
    private pos = 0;

    constructor(tokens: AwkToken[]) {
        this.tokens = tokens;
    }

    parse(): ProgramNode {
        const program: ProgramNode = {
            type: 'Program',
            beginBlocks: [],
            endBlocks: [],
            patternActions: []
        };

        while (this.peek().type !== AwkTokenType.EOF) {
            // Optional newlines
            while (this.match(AwkTokenType.NEWLINE));
            if (this.peek().type === AwkTokenType.EOF) break;

            if (this.match(AwkTokenType.BEGIN)) {
                program.beginBlocks.push(this.parseBlock());
            } else if (this.match(AwkTokenType.END)) {
                program.endBlocks.push(this.parseBlock());
            } else if (this.peek().type === AwkTokenType.LBRACE) {
                // Action without pattern
                program.patternActions.push({
                    type: 'PatternAction',
                    action: this.parseBlock()
                });
            } else {
                // Pattern (or Pattern + Action)
                const pattern = this.parseExpression();
                // Check if followed by Action { ... }
                if (this.peek().type === AwkTokenType.LBRACE) {
                    program.patternActions.push({
                        type: 'PatternAction',
                        pattern: pattern,
                        action: this.parseBlock()
                    });
                } else {
                    // Implicit print action
                    // Wait, pattern might be just an expression on a line?
                    // "If no action is specified, the default action is to print the record."
                    program.patternActions.push({
                        type: 'PatternAction',
                        pattern: pattern,
                        action: { type: 'Block', statements: [{ type: 'Print', args: [] }] } // Empty print = print $0
                    });
                }
            }
        }

        return program;
    }

    private parseBlock(): BlockNode {
        this.consume(AwkTokenType.LBRACE, "Expected '{'");
        const stmts: StatementNode[] = [];
        while (this.peek().type !== AwkTokenType.RBRACE && this.peek().type !== AwkTokenType.EOF) {
            while (this.match(AwkTokenType.NEWLINE) || this.match(AwkTokenType.SEMI)); // skip separators
            if (this.peek().type === AwkTokenType.RBRACE) break;

            stmts.push(this.parseStatement());

            // Optional semi/newline after stmt
            while (this.match(AwkTokenType.SEMI));
        }
        this.consume(AwkTokenType.RBRACE, "Expected '}'");
        return { type: 'Block', statements: stmts };
    }

    private parseStatement(): StatementNode {
        const token = this.peek();
        if (token.type === AwkTokenType.PRINT) {
            this.advance();
            const args: ExpressionNode[] = [];
            // Access args until newline, semi or }
            // Comma separated?
            // "print item1, item2"
            // "print" with usually no parens.
            if (!this.isStmtEnd()) {
                do {
                    args.push(this.parseExpression());
                } while (this.match(AwkTokenType.COMMA));
            }
            return { type: 'Print', args };
        } else if (token.type === AwkTokenType.IF) {
            this.advance();
            this.consume(AwkTokenType.LPAREN, "Expected '(' after if");
            const cond = this.parseExpression();
            this.consume(AwkTokenType.RPAREN, "Expected ')'");
            const thenB = this.parseStatement(); // Could be Block
            let elseB: StatementNode | undefined;
            // Handle else
            // Consume newlines before else? Awk parsing is tricky with newlines.
            // Simplified: if next token is ELSE, consume.
            if (this.match(AwkTokenType.ELSE)) {
                elseB = this.parseStatement();
            }
            return { type: 'If', condition: cond, thenBranch: thenB, elseBranch: elseB };
        } else if (token.type === AwkTokenType.LBRACE) {
            // Nested block as statement
            return this.parseBlock();
        }

        return this.parseExprStatement();
    }

    private parseExprStatement(): ExprStatementNode {
        const expr = this.parseExpression();
        return { type: 'ExprStmt', expr };
    }

    private parseExpression(): ExpressionNode {
        return this.parseAssignment();
    }

    private parseAssignment(): ExpressionNode {
        let left = this.parseLogicalOr(); // Precedence
        if (this.match(AwkTokenType.ASSIGN)) {
            const right = this.parseAssignment();
            if (left.type !== 'Variable' && left.type !== 'FieldAccess') throw new Error("Invalid assignment target");
            return { type: 'Assign', left: left as VariableNode | FieldAccessNode, op: '=', right };
        }
        return left;
    }

    private parseLogicalOr(): ExpressionNode {
        let left = this.parseLogicalAnd();
        while (this.match(AwkTokenType.OR)) {
            const right = this.parseLogicalAnd();
            left = { type: 'Binary', left, op: '||', right };
        }
        return left;
    }

    private parseLogicalAnd(): ExpressionNode {
        let left = this.parseEquality();
        while (this.match(AwkTokenType.AND)) {
            const right = this.parseEquality();
            left = { type: 'Binary', left, op: '&&', right };
        }
        return left;
    }

    private parseEquality(): ExpressionNode {
        let left = this.parseComparison();
        while (true) {
            if (this.match(AwkTokenType.EQ)) left = { type: 'Binary', left, op: '==', right: this.parseComparison() };
            else if (this.match(AwkTokenType.NEQ)) left = { type: 'Binary', left, op: '!=', right: this.parseComparison() };
            else break;
        }
        return left;
    }

    private parseComparison(): ExpressionNode {
        let left = this.parseConcat(); // Concatenation is high precedence? 
        // Awk precedence: concatenation is higher than ==, <.
        // Wait, concatenation is space.
        // 5 5 == "55"

        while (true) {
            if (this.match(AwkTokenType.LT)) left = { type: 'Binary', left, op: '<', right: this.parseConcat() };
            else if (this.match(AwkTokenType.GT)) left = { type: 'Binary', left, op: '>', right: this.parseConcat() };
            else if (this.match(AwkTokenType.MATCH)) left = { type: 'Binary', left, op: '~', right: this.parseConcat() };
            else break;
        }
        return left;
    }

    private parseConcat(): ExpressionNode {
        let left = this.parseAdditive();
        // Concatenation: explicit space or implicit adjacency.
        // If next token implies start of expression (ID, Num, String, $, etc), it's concat.
        while (this.isStartOfExpression()) {
            const right = this.parseAdditive();
            left = { type: 'Binary', left, op: 'concat', right };
        }
        return left;
    }

    private parseAdditive(): ExpressionNode {
        let left = this.parseMultiplicative();
        while (true) {
            if (this.match(AwkTokenType.PLUS)) left = { type: 'Binary', left, op: '+', right: this.parseMultiplicative() };
            else if (this.match(AwkTokenType.MINUS)) left = { type: 'Binary', left, op: '-', right: this.parseMultiplicative() };
            else break;
        }
        return left;
    }

    private parseMultiplicative(): ExpressionNode {
        let left = this.parseUnary();
        while (true) {
            if (this.match(AwkTokenType.STAR)) left = { type: 'Binary', left, op: '*', right: this.parseUnary() };
            else if (this.match(AwkTokenType.SLASH)) left = { type: 'Binary', left, op: '/', right: this.parseUnary() };
            else break;
        }
        return left;
    }

    private parseUnary(): ExpressionNode {
        if (this.match(AwkTokenType.FIELD_REF)) { // $
            const expr = this.parseUnary(); // $ is unary high precedence, usually binds right
            return { type: 'FieldAccess', index: expr };
        }
        if (this.match(AwkTokenType.NOT)) {
            return { type: 'Unary', op: '!', operand: this.parseUnary() };
        }
        if (this.match(AwkTokenType.MINUS)) {
            return { type: 'Unary', op: '-', operand: this.parseUnary() };
        }
        return this.parsePrimary();
    }

    private parsePrimary(): ExpressionNode {
        const token = this.peek();
        if (this.match(AwkTokenType.NUMBER)) return { type: 'Literal', value: parseFloat(token.value), valueType: 'number' };
        if (this.match(AwkTokenType.STRING)) return { type: 'Literal', value: token.value, valueType: 'string' };
        if (this.match(AwkTokenType.REGEX)) return { type: 'Literal', value: token.value, valueType: 'regex' };
        if (this.match(AwkTokenType.IDENTIFIER)) return { type: 'Variable', name: token.value };
        if (this.match(AwkTokenType.LPAREN)) {
            const expr = this.parseExpression();
            this.consume(AwkTokenType.RPAREN, "Expected ')'");
            return expr;
        }
        throw new Error(`Unexpected token: ${token.type} (${token.value})`);
    }

    private isStartOfExpression(): boolean {
        const t = this.peek().type;
        return t === AwkTokenType.IDENTIFIER || t === AwkTokenType.NUMBER || t === AwkTokenType.STRING || t === AwkTokenType.FIELD_REF || t === AwkTokenType.LPAREN || t === AwkTokenType.NOT || t === AwkTokenType.MINUS || t === AwkTokenType.REGEX;
    }

    private isStmtEnd(): boolean {
        const t = this.peek().type;
        return t === AwkTokenType.SEMI || t === AwkTokenType.NEWLINE || t === AwkTokenType.RBRACE || t === AwkTokenType.EOF;
    }

    private peek(offset = 0): AwkToken {
        return this.tokens[this.pos + offset] || { type: AwkTokenType.EOF, value: '' };
    }

    private advance(): AwkToken {
        return this.tokens[this.pos++] || { type: AwkTokenType.EOF, value: '' };
    }

    private match(type: AwkTokenType): boolean {
        if (this.peek().type === type) {
            this.advance();
            return true;
        }
        return false;
    }

    private consume(type: AwkTokenType, err: string) {
        if (!this.match(type)) throw new Error(err);
    }
}
