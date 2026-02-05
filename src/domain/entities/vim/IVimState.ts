export type VimMode = 'NORMAL' | 'INSERT' | 'VISUAL' | 'COMMAND';

export interface VimCursor {
    line: number;
    col: number;
}

export interface SyntaxError {
    readonly line: number;
    readonly column: number;
    readonly message: string;
    readonly severity: 'error' | 'warning';
}

export interface IVimState {
    mode: VimMode;
    cursor: VimCursor;
    pendingAction: string | null;
    statusMessage: string;
    lintErrors: SyntaxError[];
}
