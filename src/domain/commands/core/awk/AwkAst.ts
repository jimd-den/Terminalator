/**
 * AwkAst - syntax tree of an awk program (XCU awk, "Grammar").
 */

/** A variable or array name; `local` is the parameter slot inside a function, or -1 for a global. */
export interface NameRef {
    name: string;
    local: number;
}

export type LValue = VarExpr | IndexExpr | FieldExpr;

export interface VarExpr { kind: 'var'; ref: NameRef }
export interface IndexExpr { kind: 'index'; ref: NameRef; subs: Expr[] }
export interface FieldExpr { kind: 'field'; index: Expr }

export type Expr =
    | { kind: 'num'; value: number }
    | { kind: 'str'; value: string }
    | { kind: 'regex'; source: string }
    | VarExpr
    | IndexExpr
    | FieldExpr
    /** A parenthesized expression list: `(a, b) in arr` or `print (a, b)`. */
    | { kind: 'group'; exprs: Expr[] }
    | { kind: 'unary'; op: '-' | '+' | '!'; expr: Expr }
    | { kind: 'binary'; op: '+' | '-' | '*' | '/' | '%' | '^'; left: Expr; right: Expr }
    | { kind: 'concat'; left: Expr; right: Expr }
    | { kind: 'compare'; op: '<' | '<=' | '==' | '!=' | '>' | '>='; left: Expr; right: Expr }
    | { kind: 'match'; negate: boolean; left: Expr; right: Expr }
    | { kind: 'and'; left: Expr; right: Expr }
    | { kind: 'or'; left: Expr; right: Expr }
    | { kind: 'in'; subs: Expr[]; array: NameRef }
    | { kind: 'cond'; cond: Expr; then: Expr; else: Expr }
    | { kind: 'assign'; op: string; target: LValue; value: Expr }
    | { kind: 'incdec'; op: '++' | '--'; prefix: boolean; target: LValue }
    | { kind: 'call'; name: string; args: Expr[]; line: number }
    | { kind: 'builtin'; name: string; args: Expr[] }
    /** getline [var] | getline [var] < file | cmd | getline [var] */
    | { kind: 'getline'; source: 'main' | 'file' | 'cmd'; target?: LValue; src?: Expr };

export interface Redirect {
    mode: '>' | '>>' | '|';
    target: Expr;
}

export type Stmt =
    | { kind: 'block'; body: Stmt[] }
    | { kind: 'expr'; expr: Expr }
    | { kind: 'print'; printf: boolean; args: Expr[]; redirect?: Redirect }
    | { kind: 'if'; cond: Expr; then: Stmt; else?: Stmt }
    | { kind: 'while'; cond: Expr; body: Stmt }
    | { kind: 'do'; body: Stmt; cond: Expr }
    | { kind: 'for'; init?: Expr; cond?: Expr; update?: Expr; body: Stmt }
    | { kind: 'forin'; variable: LValue; array: NameRef; body: Stmt }
    | { kind: 'break' }
    | { kind: 'continue' }
    | { kind: 'next' }
    | { kind: 'nextfile' }
    | { kind: 'exit'; value?: Expr }
    | { kind: 'return'; value?: Expr }
    | { kind: 'delete'; array: NameRef; subs?: Expr[] };

export interface Rule {
    /** No pattern: every record. */
    pattern?: Expr;
    /** Range pattern end (`pattern, pattern2`). */
    pattern2?: Expr;
    /** No action: print the record. */
    action?: Stmt;
}

export interface FunctionDef {
    name: string;
    params: string[];
    body: Stmt;
}

export interface Program {
    begin: Stmt[];
    rules: Rule[];
    end: Stmt[];
    functions: Map<string, FunctionDef>;
}
