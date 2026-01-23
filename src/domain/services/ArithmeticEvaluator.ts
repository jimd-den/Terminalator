/**
 * ArithmeticEvaluator Service - Domain Layer
 *
 * Evaluates shell arithmetic expressions.
 * Supports integer arithmetic: +, -, *, /, %, and parentheses.
 * Used for $((...)) expansion.
 */

export class ArithmeticEvaluator {

    evaluate(expression: string): number {
        // Remove whitespace
        const expr = expression.replace(/\s+/g, '');
        if (!expr) return 0;

        try {
            return this.parseExpression(expr);
        } catch (e: any) {
            throw new Error(`Arithmetic error: ${e.message}`);
        }
    }

    // Recursive Descent Parser for Math
    // Expr -> Term {(+,-) Term}*
    // Term -> Factor {(*,/,%) Factor}*
    // Factor -> Number | (Expr)

    private pos = 0;
    private input = '';

    private parseExpression(str: string): number {
        this.input = str;
        this.pos = 0;
        return this.parseAddSub();
    }

    private peek(): string {
        return this.input[this.pos] || '';
    }

    private consume(): string {
        return this.input[this.pos++] || '';
    }

    private parseAddSub(): number {
        let left = this.parseTerm();

        while (this.peek() === '+' || this.peek() === '-') {
            const op = this.consume();
            const right = this.parseTerm();
            if (op === '+') left += right;
            else left -= right;
        }
        return left;
    }

    private parseTerm(): number {
        let left = this.parseFactor();

        while (this.peek() === '*' || this.peek() === '/' || this.peek() === '%') {
            const op = this.consume();
            const right = this.parseFactor();
            if (op === '*') left *= right;
            else if (op === '/') {
                if (right === 0) throw new Error('Division by zero');
                left = Math.floor(left / right); // Integer division
            }
            else if (op === '%') {
                if (right === 0) throw new Error('Modulo by zero');
                left = left % right;
            }
        }
        return left;
    }

    private parseFactor(): number {
        const char = this.peek();

        if (char === '(') {
            this.consume();
            const val = this.parseAddSub();
            if (this.consume() !== ')') throw new Error('Mismatched parentheses');
            return val;
        }

        if (/[0-9]/.test(char)) {
            return this.parseNumber();
        }

        if (char === '-') {
            this.consume();
            return -this.parseFactor();
        }

        if (char === '') throw new Error('Unexpected end of expression');

        throw new Error(`Unexpected character: ${char}`);
    }

    private parseNumber(): number {
        let res = '';
        while (/[0-9]/.test(this.peek())) {
            res += this.consume();
        }
        return parseInt(res, 10);
    }
}
