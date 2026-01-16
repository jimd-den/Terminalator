/**
 * CommandModule Interface - Domain Layer
 *
 * Represents a cohesive group of commands that can be registered together.
 *
 * Pillar: The Master’s Tool (Module Pattern)
 * Pillar: The Balanced Scale (OCP)
 *
 * Intent:
 * Allows the application to scale by adding new modules (e.g., NetworkModule, GameModule)
 * without modifying the core executor.
 */

import { CommandRegistry } from '../commands/CommandRegistry';

export interface CommandModule {
    /**
     * Registers all commands in this module to the provided registry.
     */
    register(registry: CommandRegistry): void;
}
