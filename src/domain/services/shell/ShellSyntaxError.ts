/**
 * Shell syntax errors.
 *
 * `IncompleteInputError` signals that the input ended while a construct was
 * still open (unterminated quote, `if` without `fi`, pending here-doc, ...).
 * Interactive front-ends use it to show the PS2 continuation prompt instead
 * of reporting an error.
 */
export class ShellSyntaxError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ShellSyntaxError';
    }
}

export class IncompleteInputError extends ShellSyntaxError {
    constructor(message: string) {
        super(message);
        this.name = 'IncompleteInputError';
    }
}
