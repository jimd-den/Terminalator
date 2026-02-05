import { IVimState, VimMode, VimCursor, SyntaxError } from './IVimState';

export class VimStateEntity implements IVimState {
    public mode: VimMode;
    public cursor: VimCursor;
    public pendingAction: string | null;
    public statusMessage: string;
    public lintErrors: SyntaxError[];

    constructor(
        mode: VimMode = 'NORMAL',
        cursor: VimCursor = { line: 0, col: 0 },
        pendingAction: string | null = null,
        statusMessage: string = '',
        lintErrors: SyntaxError[] = []
    ) {
        this.mode = mode;
        this.cursor = cursor;
        this.pendingAction = pendingAction;
        this.statusMessage = statusMessage;
        this.lintErrors = lintErrors;
    }

    public clone(): VimStateEntity {
        return new VimStateEntity(
            this.mode,
            { ...this.cursor },
            this.pendingAction,
            this.statusMessage,
            [...this.lintErrors]
        );
    }
}
