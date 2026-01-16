/**
 * GameCommandExecutor - Application Logic / Interface Adapter
 * 
 * Composition Root for all Terminal Commands.
 * Extends ExecuteCommand to register both Standard, POSIX, and Game-specific commands.
 */

import { ExecuteCommand } from '../domain/usecases/ExecuteCommand';
import { MailSystem } from '../domain/usecases/MailSystem';
import { FileSystem } from '../domain/entities/FileSystem';
import { CodeCompiler } from '../domain/usecases/CodeCompiler';
import { GameManager } from './GameManager';
import { ICommand } from '../domain/entities/Command';

// Standard Commands
// Standard / POSIX (Moved)
import { LsCommand } from './commands/posix/LsCommand';
import { CdCommand } from './commands/posix/CdCommand';
import { MkdirCommand } from './commands/posix/MkdirCommand';
import { CatCommand } from './commands/posix/CatCommand';
import { PwdCommand } from './commands/posix/PwdCommand';
import { WhoamiCommand } from './commands/posix/WhoamiCommand';
import { ClearCommand } from './commands/posix/ClearCommand';
import { GrepCommand } from './commands/posix/GrepCommand';

// POSIX Commands
import { TouchCommand } from './commands/posix/TouchCommand';
import { RmCommand } from './commands/posix/RmCommand';
import { RmdirCommand } from './commands/posix/RmdirCommand';
import { CpCommand } from './commands/posix/CpCommand';
import { MvCommand } from './commands/posix/MvCommand';
import { EchoCommand } from './commands/posix/EchoCommand';
import { HeadCommand } from './commands/posix/HeadCommand';
import { TailCommand } from './commands/posix/TailCommand';
import { ChmodCommand } from './commands/posix/ChmodCommand';
import { ChownCommand } from './commands/posix/ChownCommand';
import { WcCommand } from './commands/posix/WcCommand';
import { SortCommand } from './commands/posix/SortCommand';
import { UniqCommand } from './commands/posix/UniqCommand';
import { FindCommand } from './commands/posix/FindCommand';
import { DateCommand } from './commands/posix/DateCommand';
import { HistoryCommand } from './commands/posix/HistoryCommand';
import { ExportCommand } from './commands/posix/ExportCommand';
import { EnvCommand } from './commands/posix/EnvCommand';
import { SleepCommand } from './commands/posix/SleepCommand';
import { TeeCommand } from './commands/posix/TeeCommand';
import { CutCommand } from './commands/posix/CutCommand';
import { TrCommand } from './commands/posix/TrCommand';

// Game Commands
import { MailCommand } from './commands/game/MailCommand';
import { CheckCommsCommand } from './commands/game/CheckCommsCommand';
import { CompileCommand } from './commands/game/CompileCommand';
import { VimCommand } from './commands/game/VimCommand';

export class GameCommandExecutor extends ExecuteCommand {
    private mailSystem: MailSystem;
    private compiler: CodeCompiler;
    private gameManager: GameManager;

    constructor(fs: FileSystem, gameManager: GameManager) {
        // Initialize dependencies
        const mailSystem = new MailSystem(fs);
        const compiler = new CodeCompiler(fs);

        // Instantiate all commands
        const commands: ICommand[] = [
            // Standard
            // Standard
            new LsCommand(fs),
            new CdCommand(fs),
            new MkdirCommand(fs),
            new CatCommand(fs),
            new PwdCommand(),
            new WhoamiCommand(),
            new ClearCommand(),
            new GrepCommand(fs),

            // POSIX
            new TouchCommand(fs),
            new RmCommand(fs),
            new RmdirCommand(fs),
            new CpCommand(fs),
            new MvCommand(fs),
            new EchoCommand(),
            new TeeCommand(fs),
            new HeadCommand(fs),
            new TailCommand(fs),
            new CutCommand(fs),
            new TrCommand(),
            new ChmodCommand(fs),
            new ChownCommand(fs),
            new WcCommand(fs),
            new SortCommand(fs),
            new UniqCommand(fs),
            new FindCommand(fs),
            new DateCommand(),
            new HistoryCommand(),
            new ExportCommand(),
            new EnvCommand(),
            new SleepCommand(),

            // Game
            new MailCommand(mailSystem),
            new CheckCommsCommand(gameManager),
            new CompileCommand(compiler),
            new VimCommand()
        ];

        super(fs, commands);

        this.mailSystem = mailSystem;
        this.compiler = compiler;
        this.gameManager = gameManager;
    }
}
