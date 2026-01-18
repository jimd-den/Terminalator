/**
 * CoreUtilsModule - Domain Layer
 *
 * Registers the standard POSIX core utilities.
 *
 * Pillar: The Master’s Tool (Module Pattern)
 */

import { CommandModule } from './CommandModule';
import { CommandRegistry } from '../commands/CommandRegistry';
import { FileSystem } from '../entities/FileSystem';

import { LsCommand } from '../commands/core/LsCommand';
import { CdCommand } from '../commands/core/CdCommand';
import { PwdCommand } from '../commands/core/PwdCommand';
import { CatCommand } from '../commands/core/CatCommand';
import { GrepCommand } from '../commands/core/GrepCommand';
import { MkdirCommand } from '../commands/core/MkdirCommand';
import { TouchCommand } from '../commands/core/TouchCommand';
import { RmCommand } from '../commands/core/RmCommand';
import { CpCommand } from '../commands/core/CpCommand';
import { MvCommand } from '../commands/core/MvCommand';
import { EchoCommand } from '../commands/core/EchoCommand';
import { HeadCommand } from '../commands/core/HeadCommand';
import { TailCommand } from '../commands/core/TailCommand';
import { WcCommand } from '../commands/core/WcCommand';
import { ChmodCommand } from '../commands/core/ChmodCommand';
import { ChownCommand } from '../commands/core/ChownCommand';
import { DuCommand } from '../commands/core/DuCommand';
import { LnCommand } from '../commands/core/LnCommand';
import { DfCommand } from '../commands/core/DfCommand';
import { FindCommand } from '../commands/core/FindCommand';
import { SedCommand } from '../commands/core/SedCommand';
import { AwkCommand } from '../commands/core/AwkCommand';
import { XargsCommand } from '../commands/core/XargsCommand';
import { CutCommand } from '../commands/core/CutCommand';
import { TrCommand } from '../commands/core/TrCommand';
import { UniqCommand } from '../commands/core/UniqCommand';
import { SortCommand } from '../commands/core/SortCommand';
import { EdCommand } from '../commands/core/EdCommand';
import { CmpCommand } from '../commands/core/CmpCommand';
import { CommCommand } from '../commands/core/CommCommand';
import { DiffCommand } from '../commands/core/DiffCommand';
import { PasteCommand } from '../commands/core/PasteCommand';
import { TeeCommand } from '../commands/core/TeeCommand';
import { CksumCommand } from '../commands/core/CksumCommand';
import { FoldCommand } from '../commands/core/FoldCommand';
import { JoinCommand } from '../commands/core/JoinCommand';
import { NlCommand } from '../commands/core/NlCommand';
import { PrintfCommand } from '../commands/core/PrintfCommand';
import { SplitCommand } from '../commands/core/SplitCommand';
import { StringsCommand } from '../commands/core/StringsCommand';
import { ExpandCommand } from '../commands/core/ExpandCommand';
import { UnexpandCommand } from '../commands/core/UnexpandCommand';
import { TsortCommand } from '../commands/core/TsortCommand';
import { RmdirCommand } from '../commands/core/RmdirCommand';
import { LinkCommand } from '../commands/core/LinkCommand';
import { UnlinkCommand } from '../commands/core/UnlinkCommand';
import { ReadlinkCommand } from '../commands/core/ReadlinkCommand';
import { RealpathCommand } from '../commands/core/RealpathCommand';
import { SleepCommand } from '../commands/core/SleepCommand';
import { UnameCommand } from '../commands/core/UnameCommand';
import { LognameCommand } from '../commands/core/LognameCommand';
import { EnvCommand } from '../commands/core/EnvCommand';
import { CalCommand } from '../commands/core/CalCommand';
import { ExprCommand } from '../commands/core/ExprCommand';
import { TestCommand } from '../commands/core/TestCommand';
import { OdCommand } from '../commands/core/OdCommand';
import { UuencodeCommand } from '../commands/core/UuencodeCommand';
import { UudecodeCommand } from '../commands/core/UudecodeCommand';

export class CoreUtilsModule implements CommandModule {
    constructor(private fs: FileSystem) {}

    register(registry: CommandRegistry): void {
        const fs = this.fs;

        registry.register('ls', new LsCommand(fs));
        registry.register('cd', new CdCommand(fs));
        registry.register('pwd', new PwdCommand(fs));
        registry.register('cat', new CatCommand(fs));
        registry.register('grep', new GrepCommand(fs));
        registry.register('mkdir', new MkdirCommand(fs));
        registry.register('touch', new TouchCommand(fs));
        registry.register('rm', new RmCommand(fs));
        registry.register('cp', new CpCommand(fs));
        registry.register('mv', new MvCommand(fs));
        registry.register('echo', new EchoCommand(fs));
        registry.register('head', new HeadCommand(fs));
        registry.register('tail', new TailCommand(fs));
        registry.register('wc', new WcCommand(fs));
        registry.register('chmod', new ChmodCommand(fs));
        registry.register('chown', new ChownCommand(fs));
        registry.register('du', new DuCommand(fs));
        registry.register('ln', new LnCommand(fs));
        registry.register('df', new DfCommand(fs));
        registry.register('find', new FindCommand(fs));
        registry.register('sed', new SedCommand(fs));
        registry.register('awk', new AwkCommand(fs));
        registry.register('cut', new CutCommand(fs));
        registry.register('tr', new TrCommand(fs));
        registry.register('uniq', new UniqCommand(fs));
        registry.register('sort', new SortCommand(fs));
        registry.register('ed', new EdCommand(fs));
        registry.register('cmp', new CmpCommand(fs));
        registry.register('comm', new CommCommand(fs));
        registry.register('diff', new DiffCommand(fs));
        registry.register('paste', new PasteCommand(fs));
        registry.register('tee', new TeeCommand(fs));
        registry.register('cksum', new CksumCommand(fs));
        registry.register('fold', new FoldCommand(fs));
        registry.register('join', new JoinCommand(fs));
        registry.register('nl', new NlCommand(fs));
        registry.register('printf', new PrintfCommand(fs));
        registry.register('split', new SplitCommand(fs));
        registry.register('strings', new StringsCommand(fs));
        registry.register('expand', new ExpandCommand(fs));
        registry.register('unexpand', new UnexpandCommand(fs));
        registry.register('tsort', new TsortCommand(fs));
        registry.register('rmdir', new RmdirCommand(fs));
        registry.register('link', new LinkCommand(fs));
        registry.register('unlink', new UnlinkCommand(fs));
        registry.register('readlink', new ReadlinkCommand(fs));
        registry.register('realpath', new RealpathCommand(fs));
        registry.register('sleep', new SleepCommand(fs));
        registry.register('uname', new UnameCommand(fs));
        registry.register('logname', new LognameCommand(fs));
        registry.register('env', new EnvCommand(fs));
        registry.register('cal', new CalCommand(fs));
        registry.register('expr', new ExprCommand(fs));
        registry.register('test', new TestCommand(fs)); // Often aliased as [
        registry.register('[', new TestCommand(fs));
        registry.register('od', new OdCommand(fs));
        registry.register('uuencode', new UuencodeCommand(fs));
        registry.register('uudecode', new UudecodeCommand(fs));

        // Factory-like registration for Xargs to avoid circular dependency in constructor
        registry.register('xargs', new XargsCommand(fs, (name) => registry.get(name)));

        // Clear (Simple inline)
        registry.register('clear', {
            execute: (_args, state, _input) => ({
                output: '',
                newState: state,
                exitCode: 0,
                uiAction: 'CLEAR'
            })
        });
    }
}
