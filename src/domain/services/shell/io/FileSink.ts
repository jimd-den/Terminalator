import { FileSystemService } from '../../FileSystemService';
import { OutputSink } from './OutputSink';

type User = { uid: number; gid: number; groups: number[] };

/**
 * A file opened for writing by a redirection. Opening with truncate creates
 * or empties the file immediately (so `> file` works with no output), and
 * every write appends, so interleaved writers keep their order.
 */
export class FileSink implements OutputSink {
    constructor(
        private fs: FileSystemService,
        private path: string,
        private user: User,
        append: boolean
    ) {
        this.fs.writeFile(path, '', append ? 'a' : 'w', user.uid, user.gid, '/', user);
    }

    writeBytes(data: Uint8Array): void {
        if (!data.length) return;
        this.fs.writeFile(this.path, data, 'a', this.user.uid, this.user.gid, '/', this.user);
    }

    write(data: string): void {
        if (!data) return;
        this.fs.writeFile(this.path, data, 'a', this.user.uid, this.user.gid, '/', this.user);
    }
}
