/**
 * ModeParser - Domain Service
 *
 * Provides pure functions for parsing POSIX file modes (octal and symbolic).
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 * Pillar: The Storyteller’s Code (Literate Documentation)
 */

export class ModeParser {
    /**
     * Parses a mode string and returns the resulting bitmask.
     * 
     * @param modeStr The mode string (e.g., '755', 'u+rwx,go=rx').
     * @param initialMode The initial mode to apply relative changes to (default is 0 if not provided).
     * @returns The parsed octal mode.
     */
    static parse(modeStr: string, initialMode: number = 0): number {
        // Handle octal mode
        if (/^[0-7]+$/.test(modeStr)) {
            return parseInt(modeStr, 8);
        }

        // Handle symbolic mode
        return this.parseSymbolic(modeStr, initialMode);
    }

    /**
     * Parses POSIX symbolic mode strings.
     * 
     * @param modeStr The symbolic mode string.
     * @param initialMode The mode to start from.
     * @returns The resulting octal mode.
     */
    private static parseSymbolic(modeStr: string, initialMode: number): number {
        let currentMode = initialMode;
        const clauses = modeStr.split(',');

        for (const clause of clauses) {
            const match = clause.match(/^([ugoa]*)([-+=])([rwxXstugo]*)$/);
            if (!match) {
                throw new Error(`Invalid symbolic mode clause: ${clause}`);
            }

            const whoStr = match[1] || 'a';
            const op = match[2];
            const permStr = match[3];

            const whoBits = this.getWhoBits(whoStr);
            const permBits = this.getPermBits(permStr, currentMode, whoBits);

            switch (op) {
                case '+':
                    currentMode |= (permBits & whoBits);
                    break;
                case '-':
                    currentMode &= ~(permBits & whoBits);
                    break;
                case '=':
                    // Reset bits for 'who' then set them
                    currentMode &= ~whoBits;
                    currentMode |= (permBits & whoBits);
                    break;
            }
        }

        return currentMode & 0o7777; // Keep only standard permission bits
    }

    private static getWhoBits(whoStr: string): number {
        if (whoStr === 'a') return 0o777;
        let bits = 0;
        if (whoStr.includes('u')) bits |= 0o700;
        if (whoStr.includes('g')) bits |= 0o070;
        if (whoStr.includes('o')) bits |= 0o007;
        return bits;
    }

    private static getPermBits(permStr: string, currentMode: number, whoBits: number): number {
        let bits = 0;

        // If perm is u, g, or o, copy from those
        if (permStr === 'u') {
            const u = (currentMode & 0o700) >> 6;
            return (u << 6) | (u << 3) | u;
        }
        if (permStr === 'g') {
            const g = (currentMode & 0o070) >> 3;
            return (g << 6) | (g << 3) | g;
        }
        if (permStr === 'o') {
            const o = (currentMode & 0o007);
            return (o << 6) | (o << 3) | o;
        }

        // Otherwise parse individual flags
        if (permStr.includes('r')) bits |= 0o444;
        if (permStr.includes('w')) bits |= 0o222;
        if (permStr.includes('x')) bits |= 0o111;
        if (permStr.includes('X')) {
            // X only applies if the file is a directory or already has execute permission for someone
            // For mkdir, it's always a directory (or will be), so X acts like x.
            bits |= 0o111;
        }
        if (permStr.includes('s')) {
            // setuid/setgid
            if (whoBits & 0o700) bits |= 0o4000;
            if (whoBits & 0o070) bits |= 0o2000;
        }
        if (permStr.includes('t')) bits |= 0o1000; // sticky bit

        return bits;
    }
}
