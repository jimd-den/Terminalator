/**
 * SystemUtilsModule - Domain Layer
 *
 * Registers system-related POSIX utilities.
 */

import { CommandModule } from './CommandModule';
import { CommandRegistry } from '../commands/CommandRegistry';

import { TrueCommand } from '../commands/system/TrueCommand';
import { FalseCommand } from '../commands/system/FalseCommand';
import { DateCommand } from '../commands/system/DateCommand';
import { WhoCommand } from '../commands/system/WhoCommand';
import { TtyCommand } from '../commands/system/TtyCommand';
import { IdCommand } from '../commands/system/IdCommand';
import { BasenameCommand } from '../commands/system/BasenameCommand';
import { DirnameCommand } from '../commands/system/DirnameCommand';
import { SchemeCommand } from '../../interface-adapters/commands/game/SchemeCommand';

export class SystemUtilsModule implements CommandModule {
    constructor(private fs: import('../services/FileSystemService').FileSystemService) { }

    register(registry: CommandRegistry): void {
        registry.register('scheme', new SchemeCommand(this.fs));

        // These are now handled by CoreUtilsModule with more POSIX compliance.
        // registry.register('true', new TrueCommand());
        // registry.register('false', new FalseCommand());
        // registry.register('who', new WhoCommand());
        // registry.register('tty', new TtyCommand());
        // registry.register('id', new IdCommand());
        // registry.register('basename', new BasenameCommand());
        // registry.register('dirname', new DirnameCommand());
    }
}
