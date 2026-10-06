/**
 * PasswordHash - crypt(3)-style hashes for /etc/shadow.
 *
 * Format: $6$<salt>$<hash>. The digest is a deterministic, non-cryptographic
 * mix (it only has to be stable and look right): equal passwords with equal
 * salts hash identically, so dictionary attacks work as they would in reality.
 */
const ALPHABET = './0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

function mix(input: string, rounds: number): string {
    let h1 = 0x811c9dc5 | 0, h2 = 0x01000193 | 0;
    let out = '';
    for (let r = 0; r < rounds; r++) {
        for (let i = 0; i < input.length; i++) {
            const c = input.charCodeAt(i);
            h1 = Math.imul(h1 ^ c, 0x01000193);
            h2 = Math.imul(h2 ^ (c + r), 0x5bd1e995);
            h2 ^= h2 >>> 15;
        }
        const v = (h1 ^ h2) >>> 0;
        for (let k = 0; k < 4; k++) out += ALPHABET[(v >>> (k * 6)) & 63];
    }
    return out;
}

export function makeSalt(seed: string): string {
    return mix(`salt:${seed}`, 4);
}

export function passwordHash(password: string, saltSeed: string): string {
    const salt = makeSalt(saltSeed);
    return `$6$${salt}$${mix(`${salt}$${password}`, 22)}`;
}

/** Checks `password` against a stored $6$salt$hash entry. */
export function verifyPassword(password: string, stored: string): boolean {
    const m = /^\$6\$([^$]+)\$/.exec(stored);
    if (!m) return false;
    return `$6$${m[1]}$${mix(`${m[1]}$${password}`, 22)}` === stored;
}
