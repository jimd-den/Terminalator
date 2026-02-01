/**
 * TerminalStateDTO - Data Transfer Object
 * 
 * Represents the Terminal State as seen by the Presentation Layer (UI).
 * Decouples the View from the Domain Entity.
 * 
 * Excludes behavioral logic or complex types (Maps) not needed for rendering.
 */
export interface TerminalStateDTO {
    currentDirectory: string;
    environment: Record<string, string>; // Essential for Prompt (USER, HOSTNAME)
    user: { uid: number, gid: number };
    fsContext?: string; // For Remote status
    lastExitCode: number;
    // History is managed by OutputController, but preserving here if needed
}
