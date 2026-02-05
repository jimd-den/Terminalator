export interface IVimBuffer {
    getLine(index: number): string;
    updateLine(index: number, content: string): void;
    insertLine(index: number, content: string): void;
    deleteLine(index: number): void;
    splitLine(lineIndex: number, colIndex: number): void;
    joinLines(index: number): void;
    readonly length: number;
    toString(): string;
}
