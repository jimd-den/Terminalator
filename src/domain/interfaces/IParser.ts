/**
 * IParser.ts - Domain Interface
 * 
 * Defines the contract for an AST parser.
 * Used to break circular dependencies between the main ShellParser and its sub-parsers.
 * 
 * Pillar: THE FOUR-FOLD SHIELD (Dependency Inversion)
 */

import { ASTNode } from './ShellAST';

export interface IParser {
    parse(tokens: string[]): ASTNode;
}
