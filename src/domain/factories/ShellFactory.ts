import { FileSystem } from '../entities/FileSystem';
import { FileSystemService } from '../services/FileSystemService';
import { CommandRegistry } from '../commands/CommandRegistry';
import { CoreUtilsModule } from '../modules/CoreUtilsModule';
import { SystemUtilsModule } from '../modules/SystemUtilsModule';
import { ExecuteCommand } from '../usecases/ExecuteCommand';
import { TelemetryPort } from '../ports/TelemetryPort';
import { IdentityService } from '../services/IdentityService';

export class ShellFactory {
    static create(fs?: FileSystem, telemetry?: TelemetryPort): { executor: ExecuteCommand; fsService: FileSystemService; fs: FileSystem; identityService: IdentityService } {
        const fileSystem = fs || new FileSystem();
        const fsService = new FileSystemService(fileSystem);
        const registry = new CommandRegistry();
        const identityService = new IdentityService();

        // Register Modules
        new CoreUtilsModule(fileSystem, identityService).register(registry);
        new SystemUtilsModule().register(registry);

        const executor = new ExecuteCommand(fsService, telemetry, registry);

        return { executor, fsService, fs: fileSystem, identityService };
    }
}
