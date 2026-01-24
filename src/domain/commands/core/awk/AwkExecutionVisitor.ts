/**
 * AwkExecutionVisitor.ts
 * 
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: Pragmatic Design Patterns (Visitor)
 * 
 * Intent:
 * Implements the execution logic of the AWK interpreter by visiting AST nodes.
 * Separated from the Interpreter orchestrator and State.
 */

import { IAwkVisitor } from './IAwkVisitor';
import { AwkRuntimeEnvironment } from './AwkRuntimeEnvironment';
import {
    ASTNode, ProgramNode, BlockNode, PatternActionNode,
    PrintStatementNode, ExprStatementNode, IfStatementNode,
    BinaryExpressionNode, UnaryExpressionNode, LiteralNode, VariableNode,
    FieldAccessNode, AssignExpressionNode
} from './AwkParser';

export class AwkExecutionVisitor implements IAwkVisitor {
    private env: AwkRuntimeEnvironment;
    private outputBuffer: string[] = [];

    constructor(env: AwkRuntimeEnvironment) {
        this.env = env;
    }

    public getOutput(): string {
        return this.outputBuffer.join('\n');
    }

    public clearOutput() {
        this.outputBuffer = [];
    }

    // --- Discriminator ---

    public visit(node: ASTNode): any {
        switch (node.type) {
            case 'Program': return this.visitProgram(node as ProgramNode);
            case 'Block': return this.visitBlock(node as BlockNode);
            case 'PatternAction': return this.visitPatternAction(node as PatternActionNode);
            case 'Print': return this.visitPrint(node as PrintStatementNode);
            case 'ExprStmt': return this.visitExprStmt(node as ExprStatementNode);
            case 'If': return this.visitIf(node as IfStatementNode);
            case 'Binary': return this.visitBinary(node as BinaryExpressionNode);
            case 'Unary': return this.visitUnary(node as UnaryExpressionNode);
            case 'Literal': return this.visitLiteral(node as LiteralNode);
            case 'Variable': return this.visitVariable(node as VariableNode);
            case 'FieldAccess': return this.visitFieldAccess(node as FieldAccessNode);
            case 'Assign': return this.visitAssign(node as AssignExpressionNode);
            default:
                throw new Error(`Unknown node type: ${node.type}`);
        }
    }

    // --- Nodes ---

    visitProgram(node: ProgramNode): void {
        throw new Error("Program node handled by Interpreter main loop generally, but if visited:");
        // Typically Interpreter iterates sections.
    }

    visitBlock(node: BlockNode): void {
        for (const stmt of node.statements) {
            this.visit(stmt);
        }
    }

    visitPatternAction(node: PatternActionNode): void {
        if (!node.pattern || this.toBoolean(this.visit(node.pattern))) {
            this.visit(node.action);
        }
    }

    visitPrint(node: PrintStatementNode): void {
        let line = '';
        if (node.args.length === 0) {
            line = this.env.getField(0);
        } else {
            line = node.args.map(arg => String(this.visit(arg))).join(this.env.OFS);
        }
        this.outputBuffer.push(line);
    }

    visitExprStmt(node: ExprStatementNode): void {
        this.visit(node.expr);
    }

    visitIf(node: IfStatementNode): void {
        if (this.toBoolean(this.visit(node.condition))) {
            this.visit(node.thenBranch);
        } else if (node.elseBranch) {
            this.visit(node.elseBranch);
        }
    }

    // --- Expressions ---

    visitBinary(node: BinaryExpressionNode): any {
        const left = this.visit(node.left);
        const right = this.visit(node.right);
        const op = node.op;

        switch (op) {
            case '+': return Number(left) + Number(right);
            case '-': return Number(left) - Number(right);
            case '*': return Number(left) * Number(right);
            case '/': return Number(left) / Number(right);
            case '%': return Number(left) % Number(right);
            case '==': return left == right ? 1 : 0;
            case '!=': return left != right ? 1 : 0;
            case '<': return Number(left) < Number(right) ? 1 : 0;
            case '>': return Number(left) > Number(right) ? 1 : 0;
            case '<=': return Number(left) <= Number(right) ? 1 : 0;
            case '>=': return Number(left) >= Number(right) ? 1 : 0;
            case '&&': return (this.toBoolean(left) && this.toBoolean(right)) ? 1 : 0;
            case '||': return (this.toBoolean(left) || this.toBoolean(right)) ? 1 : 0;
            case 'concat': return String(left) + String(right);
            case '~': {
                const pattern = right instanceof RegExp ? right : new RegExp(String(right));
                return pattern.test(String(left)) ? 1 : 0;
            }
            case '!~': {
                const pattern = right instanceof RegExp ? right : new RegExp(String(right));
                return !pattern.test(String(left)) ? 1 : 0;
            }
            default: return 0;
        }
    }

    visitUnary(node: UnaryExpressionNode): any {
        const val = this.visit(node.operand);
        switch (node.op) {
            case '-': return -Number(val);
            case '+': return Number(val);
            case '!': return this.toBoolean(val) ? 0 : 1;
            default: return 0;
        }
    }

    visitLiteral(node: LiteralNode): any {
        if (node.valueType === 'regex') {
            // Return the RegExp object. 
            // Logic requiring boolean (implicit match) will check instance via toBoolean.
            // Logic requiring binary op (explicit match) will use instance via visitBinary.
            return new RegExp(String(node.value));
        }
        return node.value;
    }

    visitVariable(node: VariableNode): any {
        return this.env.getVar(node.name);
    }

    visitFieldAccess(node: FieldAccessNode): any {
        const index = Number(this.visit(node.index));
        return this.env.getField(index);
    }

    visitAssign(node: AssignExpressionNode): any {
        const val = this.visit(node.right);
        if (node.left.type === 'Variable') {
            const vNode = node.left as VariableNode;
            this.env.setVar(vNode.name, val);
        } else if (node.left.type === 'FieldAccess') {
            const fNode = node.left as FieldAccessNode;
            const index = Number(this.visit(fNode.index));
            this.env.setField(index, val);
        }
        return val;
    }

    // --- Helpers ---

    private toBoolean(val: any): boolean {
        if (val instanceof RegExp) {
            // Implicit match against $0
            return val.test(this.env.getField(0));
        }
        if (typeof val === 'number') return val !== 0;
        if (typeof val === 'string') return val.length > 0;
        return !!val;
    }
}
