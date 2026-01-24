import { getStdinAsString } from '../../../entities/ProcessContext';

/**
 * AwkInterpreter - Domain Layer
 *
 * Executes the Awk AST securely.
 */

import { ASTNode, BlockNode, ExpressionNode, PatternActionNode, ProgramNode, StatementNode } from './AwkParser';

export class AwkInterpreter {
    private fs = ' ';
    private nr = 0;
    private nf = 0;
    private vars: Map<string, any> = new Map();
    private fields: string[] = [];
    private record = '';

    // Output buffer
    private output = '';

    constructor() {
        this.vars.set('FS', ' ');
    }

    execute(program: ProgramNode, input: string): string {
        this.output = '';
        this.nr = 0;

        // Execute BEGIN
        for (const block of program.beginBlocks) {
            this.executeBlock(block);
        }

        // Process Input
        if (input) {
            const lines = input.split('\n');
            for (const line of lines) {
                // if (line === '') continue; // Awk typically processes empty lines too?
                // Yes, empty line is a record.

                this.record = line;
                this.nr++;
                this.updateFields(line);
                this.vars.set('NR', this.nr);
                this.vars.set('NF', this.nf);

                for (const pa of program.patternActions) {
                    if (this.evaluatePattern(pa.pattern)) {
                        this.executeBlock(pa.action);
                    }
                }
            }
        }

        // Execute END
        for (const block of program.endBlocks) {
            this.executeBlock(block);
        }

        return this.output;
    }

    private updateFields(line: string) {
        this.fs = this.vars.get('FS');

        if (this.fs === ' ') {
            this.fields = line.trim().split(/\s+/);
            if (this.fields.length === 1 && this.fields[0] === '') this.fields = [];
        } else {
            this.fields = line.split(this.fs);
        }
        this.nf = this.fields.length;
    }

    private executeBlock(block: BlockNode) {
        for (const stmt of block.statements) {
            this.executeStatement(stmt);
        }
    }

    private executeStatement(stmt: StatementNode) {
        if (stmt.type === 'Print') {
            const args = stmt.args.map(arg => this.evaluate(arg));
            // Default to $0 if no args
            if (args.length === 0) {
                this.output += this.record + '\n';
            } else {
                // Join with OFS (default space)
                const ofs = this.vars.has('OFS') ? this.vars.get('OFS') : ' ';
                this.output += args.join(ofs) + '\n';
            }
        } else if (stmt.type === 'ExprStmt') {
            this.evaluate(stmt.expr);
        } else if (stmt.type === 'If') {
            if (this.toBoolean(this.evaluate(stmt.condition))) {
                this.executeOrStatement(stmt.thenBranch);
            } else if (stmt.elseBranch) {
                this.executeOrStatement(stmt.elseBranch);
            }
        }
    }

    // Execute a statement which may be a Block or another StatementNode
    private executeOrStatement(stmt: StatementNode) {
        if (stmt.type === 'Block') {
            this.executeBlock(stmt);
        } else {
            this.executeStatement(stmt);
        }
    }

    private evaluatePattern(pattern?: ExpressionNode): boolean {
        if (!pattern) return true; // Empty pattern matches all
        return this.toBoolean(this.evaluate(pattern));
    }

    private evaluate(expr: ExpressionNode): any {
        switch (expr.type) {
            case 'Literal': return expr.value;
            case 'Variable': return this.getVar(expr.name);
            case 'FieldAccess': {
                const index = this.evaluate(expr.index);
                // $0 is record
                const i = Number(index);
                if (i === 0) return this.record;
                // $1..$NF
                return this.fields[i - 1] || '';
            }
            case 'Binary': return this.evaluateBinary(expr.left, expr.op, expr.right);
            case 'Unary': return this.evaluateUnary(expr.op, expr.operand);
            case 'Assign': return this.evaluateAssign(expr.left, expr.op, expr.right);
            default: return '';
        }
    }

    private evaluateBinary(left: ExpressionNode, op: string, right: ExpressionNode): any {
        const l = this.evaluate(left);
        const r = this.evaluate(right);

        if (op === 'concat') return String(l) + String(r);

        // Numeric ops
        const ln = Number(l);
        const rn = Number(r);

        // String comparison if both are strings and not forced numeric?
        // Awk rules: if one is number, compare as numbers?
        // Actually: "If both operands are numeric, numeric comparison... otherwise string"
        // Determining "numeric" is tricky in JS.
        // Simplification: if both parsing triggers isNaN, use string.
        const lisN = !isNaN(Number(l)) && String(l).trim() !== '';
        const risN = !isNaN(Number(r)) && String(r).trim() !== '';

        if (lisN && risN) {
            switch (op) {
                case '+': return ln + rn;
                case '-': return ln - rn;
                case '*': return ln * rn;
                case '/': return ln / rn;
                case '%': return ln % rn;
                case '^': return Math.pow(ln, rn);
                case '<': return ln < rn;
                case '>': return ln > rn;
                case '<=': return ln <= rn;
                case '>=': return ln >= rn;
                case '==': return ln === rn;
                case '!=': return ln !== rn;
            }
        }

        // String comparison / ops
        switch (op) {
            case '==': return String(l) === String(r);
            case '!=': return String(l) !== String(r);
            case '~': return new RegExp(String(r)).test(String(l));
            case '!~': return !new RegExp(String(r)).test(String(l));
        }

        // Awk semantics: non-numeric strings convert to 0 for arithmetic
        const lNum = isNaN(ln) ? 0 : ln;
        const rNum = isNaN(rn) ? 0 : rn;
        switch (op) {
            case '+': return lNum + rNum;
            case '-': return lNum - rNum;
            case '*': return lNum * rNum;
            case '/': return rNum === 0 ? 0 : lNum / rNum; // Avoid Infinity
            case '%': return rNum === 0 ? 0 : lNum % rNum;
        }

        return 0; // Fallback
    }

    private evaluateUnary(op: string, operand: ExpressionNode): any {
        const val = this.evaluate(operand);
        if (op === '!') return !this.toBoolean(val);
        if (op === '-') return -Number(val);
        return val;
    }

    private evaluateAssign(left: any, op: string, rightExpr: ExpressionNode): any {
        const val = this.evaluate(rightExpr);
        if (left.type === 'Variable') {
            this.vars.set(left.name, val);
            return val;
        }
        // Field assignment not supported yet
        return val;
    }

    private getVar(name: string): any {
        if (name === 'NR') return this.nr;
        if (name === 'NF') return this.nf;
        if (name === 'FS') return this.fs;
        return this.vars.get(name) || ''; // Initialize empty
    }

    private toBoolean(val: any): boolean {
        if (typeof val === 'number') return val !== 0;
        if (typeof val === 'string') return val.length > 0; // "0"? Awk says "0" is true?
        // POSIX: "numeric value... is non-zero", "string value... is non-null"
        // Wait, "0" string is numeric value 0?
        // YES. String "0" is false in awk.
        if (typeof val === 'string') {
            if (!isNaN(Number(val))) return Number(val) !== 0;
            return val.length > 0;
        }
        return !!val;
    }
}
