/**
 * ICompilerService - Domain Interface
 *
 * Defines the contract for a C compilation service.
 * Adapters can be:
 * - HostCompilerService (uses local gcc/clang for tests)
 * - WasmCompilerService (uses TCC/Clang WASM for App)
 * - StubCompilerService (simulates success for prototypes)
 */

export interface CompilerOptions {
    outputFile: string;
    includePaths?: string[];
    defines?: Record<string, string>;
    linkLibraries?: string[];
    compileOnly?: boolean; // -c flag
    preprocessOnly?: boolean; // -E flag
    debug?: boolean; // -g flag
    strip?: boolean; // -s flag
    librarySearchPaths?: string[]; // -L flag
    undefines?: string[]; // -U flag
    optimizationLevel?: string; // -O level
    sharedLibrary?: boolean; // -G flag
}

export interface ICompilerService {
    compile(sourceFiles: string[], options: CompilerOptions): Promise<Uint8Array>;
}
