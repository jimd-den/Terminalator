/**
 * Devices - Domain Entity
 *
 * Character device drivers behind the /dev nodes (major/minor numbers as
 * on Linux). Reads produce data, writes consume it; nothing is stored.
 */

export const makedev = (major: number, minor: number) => (major << 8) | minor;
export const major = (rdev: number) => rdev >> 8;
export const minor = (rdev: number) => rdev & 0xff;

export interface CharDevice {
    name: string;
    read(): string;
    write(data: string | Uint8Array): void;
}

const randomBytes = (n: number) => {
    let s = '';
    for (let i = 0; i < n; i++) s += String.fromCharCode(Math.floor(Math.random() * 256));
    return s;
};

/** One read() returns a bounded chunk so that `cat /dev/zero` terminates. */
const CHUNK = 1024;

export const CHAR_DEVICES = new Map<number, CharDevice>([
    [makedev(1, 3), { name: 'null', read: () => '', write: () => { /* discard */ } }],
    [makedev(1, 5), { name: 'zero', read: () => '\0'.repeat(CHUNK), write: () => { /* discard */ } }],
    [makedev(1, 7), { name: 'full', read: () => '\0'.repeat(CHUNK), write: () => { throw new Error('No space left on device'); } }],
    [makedev(1, 8), { name: 'random', read: () => randomBytes(CHUNK), write: () => { /* entropy accepted */ } }],
    [makedev(1, 9), { name: 'urandom', read: () => randomBytes(CHUNK), write: () => { /* entropy accepted */ } }],
    [makedev(5, 0), { name: 'tty', read: () => '', write: () => { /* handled by the shell's tty fd */ } }],
    [makedev(5, 1), { name: 'console', read: () => '', write: () => { /* kernel console */ } }],
]);

export function deviceFor(rdev: number | undefined): CharDevice | undefined {
    return rdev === undefined ? undefined : CHAR_DEVICES.get(rdev);
}
