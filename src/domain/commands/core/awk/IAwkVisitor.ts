/**
 * IAwkVisitor.ts
 * 
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: Pragmatic Design Patterns (Visitor)
 * 
 * Intent:
 * Defines the contract for visiting AST nodes in the Awk language.
 * Allows separation of Execution logic, Pretty Printing, or Analysis from the data structure.
 */

import {
    ProgramNode, BlockNode, PatternActionNode,
    PrintStatementNode, ExprStatementNode, IfStatementNode,
    BinaryExpressionNode, UnaryExpressionNode, LiteralNode, VariableNode, FieldAccessNode, AssignExpressionNode, ASTNode
} from './AwkParser';

export interface IAwkVisitor {
    visit(node: ASTNode): any;

    visitProgram(node: ProgramNode): void;
    visitBlock(node: BlockNode): void;
    visitPatternAction(node: PatternActionNode): void;

    // Statements
    visitPrint(node: PrintStatementNode): void;
    visitExprStmt(node: ExprStatementNode): void;
    visitIf(node: IfStatementNode): void;

    // Expressions (return values)
    visitBinary(node: BinaryExpressionNode): any;
    visitUnary(node: UnaryExpressionNode): any;
    visitLiteral(node: LiteralNode): any;
    visitVariable(node: VariableNode): any;
    visitFieldAccess(node: FieldAccessNode): any;
    visitAssign(node: AssignExpressionNode): any;
}
