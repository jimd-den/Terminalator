import { FileSystem } from '../entities/FileSystem';
import { FileSystemService } from '../services/FileSystemService';
import { CommandRegistry } from '../commands/CommandRegistry';
import { CoreUtilsModule } from '../modules/CoreUtilsModule';
import { GnuUtilsModule } from '../modules/GnuUtilsModule';
import { SystemUtilsModule } from '../modules/SystemUtilsModule';
import { ExecuteCommand } from '../usecases/ExecuteCommand';
import { TelemetryPort } from '../ports/TelemetryPort';
import { IdentityService } from '../services/IdentityService';
import { HostProfile, SystemInstaller } from '../services/os/SystemInstaller';

export class ShellFactory {
    static create(fs?: FileSystem, telemetry?: TelemetryPort): { executor: ExecuteCommand; fsService: FileSystemService; fs: FileSystem; identityService: IdentityService } {
        const fileSystem = fs || new FileSystem();
        const fsService = new FileSystemService(fileSystem);
        const registry = new CommandRegistry();
        const identityService = new IdentityService();

        // Register Modules
        new CoreUtilsModule(fileSystem, identityService).register(registry);
        new SystemUtilsModule(fsService).register(registry);
        new GnuUtilsModule().register(registry);

        const executor = new ExecuteCommand(fsService, telemetry, registry);

        return { executor, fsService, fs: fileSystem, identityService };
    }

    /** A shell on a fully installed machine (FHS layout, /etc databases, /dev, /proc). */
    static createSystem(profile: Partial<HostProfile> = {}, telemetry?: TelemetryPort) {
        const shell = ShellFactory.create(undefined, telemetry);
        new SystemInstaller().install(shell.fsService, {
            hostname: 'terminalator',
            users: [{ name: 'operator', uid: 1000, gid: 1000, gecos: 'Terminal Operator', password: 'operator', groups: ['sudo', 'staff', 'users'] }],
            ...profile,
        });
        return shell;
    }
}
