import { ProcessContext } from '../../entities/ProcessContext';
import { statPath } from './FileInfo';
import { gzipDecode, isGzip } from '../../utils/Gzip';
import { isCompressed, lzwDecompress } from '../../utils/Lzw';

/**
 * Replaces `from` by `to` holding `data`, preserving mode and ownership
 * (what compress/uncompress do with the original file).
 */
export function replaceFile(context: ProcessContext, from: string, to: string, data: Uint8Array): void {
    const fs = context.fileSystemService;
    const src = statPath(context, from);
    const abs = fs.resolveAbsolutePath(to, context.cwd);
    fs.writeFile(abs, data, 'w', undefined, undefined, '/');
    if (src) {
        fs.chmod(abs, src.inode.mode & 0o7777, '/');
        try { fs.chown(abs, src.inode.uid, src.inode.gid, '/'); } catch { /* only root may give files away */ }
        const dst = statPath(context, abs);
        if (dst) dst.inode.mtime = src.inode.mtime;
    }
    fs.deleteNode(fs.resolveAbsolutePath(from, context.cwd), '/');
}

export function exists(context: ProcessContext, path: string): boolean {
    return statPath(context, path, false) !== null;
}

export type Decompressed = { ok: true; data: Uint8Array; method: 'gzip' | 'compress' | null } | { ok: false; error: string };

/**
 * Transparently expands gzip (.gz) or compress (.Z) data, as GNU tar does
 * when reading an archive; anything else is returned unchanged.
 */
export function autoDecompress(data: Uint8Array): Decompressed {
    try {
        if (isGzip(data)) return { ok: true, data: gzipDecode(data).data, method: 'gzip' };
        if (isCompressed(data)) return { ok: true, data: lzwDecompress(data), method: 'compress' };
    } catch (e: any) {
        return { ok: false, error: String(e?.message ?? e) };
    }
    return { ok: true, data, method: null };
}
