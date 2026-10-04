import { ProcessContext } from '../../entities/ProcessContext';
import { statPath } from './FileInfo';

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
