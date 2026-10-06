/**
 * GnuUtilsModule - Domain Layer
 *
 * Widely used utilities outside POSIX (GNU coreutils / util-linux style)
 * that real systems ship and scripts rely on.
 */
import { CommandModule } from './CommandModule';
import { CommandRegistry } from '../commands/CommandRegistry';
import { SeqCommand } from '../commands/gnu/SeqCommand';

export class GnuUtilsModule implements CommandModule {
    register(registry: CommandRegistry): void {
        registry.register('seq', new SeqCommand());
    }
}
