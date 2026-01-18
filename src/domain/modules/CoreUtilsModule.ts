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
