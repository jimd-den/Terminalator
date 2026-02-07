import { getStdinAsString } from '../../entities/ProcessContext';
/**
 * ValCommand - SCCS File Validator (POSIX Compliant)
 *
 * Validates SCCS files meeting specified characteristics.
 * Part of SCCS (Source Code Control System) utilities.
 *
 * Pillar: The Four-Fold Shield (Clean Architecture)
 * Pillar: The Storyteller's Code (Literate Documentation)
 *
 * Reference: IEEE Std 1003.1-2024 (SUSv5) - val utility
 */
import { CommandBase } from '../CommandBase';
import { CommandResponse } from '../ICommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { CommandCapability } from '../IStructuredCommand';

/**
 * POSIX exit code bits for val.
 * Exit status is a disjunction (OR) of these values.
 */
const VAL_EXIT = {
     MISSING_FILE_ARG: 0x80,  // Missing file argument
     UNKNOWN_OPTION: 0x40,    // Unknown or duplicate option
     CORRUPTED_SCCS: 0x20,    // Corrupted SCCS file
     NOT_SCCS_FILE: 0x10,     // Cannot open file or file not SCCS
     SID_INVALID: 0x08,       // SID is invalid or ambiguous
     SID_NOT_EXIST: 0x04,     // SID does not exist
     TYPE_MISMATCH: 0x02,     // %Y%, -y mismatch
     NAME_MISMATCH: 0x01      // %M%, -m mismatch
};

/**
 * Options for val command.
 */
interface ValOptions {
     silent: boolean;         // -s: Suppress diagnostic messages
     moduleName?: string;     // -m: Module name to check against %M%
     sid?: string;            // -r: SID to validate
     type?: string;           // -y: Type to check against %Y%
}

export class ValCommand extends CommandBase {
     public readonly capabilities: CommandCapability[] = [CommandCapability.READ];
     public readonly utility: string = 'val';

     protected async executeInternal(
          args: string[],
          flags: Set<string>,
          operands: string[],
          context: ProcessContext,
          state: TerminalState
     ): Promise<CommandResponse> {
          // Re-parse with SCCS specific options
          this.parseArgs(args, ['m', 'r', 'y']);
          const input = getStdinAsString(context);

          const opts: ValOptions = {
               silent: this.hasFlag('s'),
               moduleName: this.options.get('m'),
               sid: this.options.get('r'),
               type: this.options.get('y')
          };

          const files = this.operands;

          // Special case: "val -" reads file arguments from stdin
          if (files.length === 1 && files[0] === '-') {
               return this.processStdin(input, opts, context, state);
          }

          // If no files and no stdin mode indicator
          if (files.length === 0) {
               // No file argument - exit 0x80
               return {
                    output: opts.silent ? '' : 'val: missing file operand',
                    newState: state,
                    exitCode: VAL_EXIT.MISSING_FILE_ARG
               };
          }

          // Process each file
          return this.processFiles(files, opts, context, state);
     }

     /**
      * Helper for inner parsing (stdin mode)
      */
     private parseArgsInner(args: string[]): { opts: ValOptions, files: string[] } {
          const parser = new (class extends CommandBase {
               public readonly capabilities: CommandCapability[] = [];
               public readonly utility: string = 'val-parser';
               public parse(a: string[]) { this.parseArgs(a, ['m', 'r', 'y']); }
               public get() {
                    return {
                         opts: {
                              silent: this.hasFlag('s'),
                              moduleName: this.options.get('m'),
                              sid: this.options.get('r'),
                              type: this.options.get('y')
                         },
                         files: this.operands
                    };
               }
               protected executeInternal(): any { return null; }
          })();

          parser.parse(args);
          return parser.get();
     }

     /**
      * Process files read from stdin (when file operand is '-').
      */
     private async processStdin(
          input: string | undefined,
          opts: ValOptions,
          context: ProcessContext,
          state: TerminalState
     ): Promise<CommandResponse> {
          if (!input || input.trim() === '') {
               return { output: '', newState: state, exitCode: 0 };
          }

          const lines = input.trim().split('\n');
          let aggregateExitCode = 0;
          const outputs: string[] = [];

          for (const line of lines) {
               // Each line is treated as a command line argument list
               const lineArgs = line.trim().split(/\s+/).filter(s => s.length > 0);
               if (lineArgs.length === 0) continue;

               // Parse this line's options and files
               const { opts: lineOpts, files: lineFiles } = this.parseArgsInner(lineArgs);

               // Merge with base opts (command line opts take precedence initially, then line opts)
               const mergedOpts = { ...opts, ...lineOpts };

               if (lineFiles.length === 0) {
                    continue;
               }

               // Process files for this line
               const result = await this.processFiles(lineFiles, mergedOpts, context, state, line);
               if (result.output) {
                    outputs.push(result.output);
               }
               aggregateExitCode |= result.exitCode;
          }

          return {
               output: outputs.join('\n'),
               newState: state,
               exitCode: aggregateExitCode
          };
     }

     /**
      * Process a list of files.
      */
     private async processFiles(
          files: string[],
          opts: ValOptions,
          context: ProcessContext,
          state: TerminalState,
          inputLine?: string
     ): Promise<CommandResponse> {
          let aggregateExitCode = 0;
          const outputs: string[] = [];
          const fs = context.fileSystemService;

          for (const file of files) {
               let fileExitCode = 0;
               const messages: string[] = [];

               // Check if file exists
               const node = fs.resolve(file, state.currentDirectory);
               if (!node) {
                    fileExitCode |= VAL_EXIT.NOT_SCCS_FILE;
                    messages.push(`${file}: cannot open file or file not SCCS`);
               } else if (fs.isDirectory(node)) {
                    fileExitCode |= VAL_EXIT.NOT_SCCS_FILE;
                    messages.push(`${file}: is a directory`);
               } else {
                    // Read file content
                    try {
                         const content = fs.readFile(fs.getAbsolutePath(node));

                         // Validate SCCS file format
                         const validateResult = this.validateSccsFile(file, content, opts);
                         fileExitCode |= validateResult.exitCode;
                         messages.push(...validateResult.messages);
                    } catch (e) {
                         fileExitCode |= VAL_EXIT.NOT_SCCS_FILE;
                         messages.push(`${file}: cannot read file`);
                    }
               }

               // Output handling
               if (messages.length > 0 && !opts.silent) {
                    if (inputLine) {
                         // Stdin mode output format
                         outputs.push(`${inputLine}\n\n    ${file}: ${messages.join(', ')}`);
                    } else {
                         // Normal output format
                         outputs.push(`${file}: ${messages.join(', ')}`);
                    }
               }

               aggregateExitCode |= fileExitCode;
          }

          return {
               output: outputs.join('\n'),
               newState: state,
               exitCode: aggregateExitCode
          };
     }

     /**
      * Validate SCCS file content and check options.
      */
     private validateSccsFile(
          filename: string,
          content: string,
          opts: ValOptions
     ): { exitCode: number, messages: string[] } {
          let exitCode = 0;
          const messages: string[] = [];

          // SCCS files typically start with ^Ah (control-A h) header
          // For our simulation, we check for reasonable SCCS markers

          // Check if it's a valid SCCS file format
          // Real SCCS files have specific structure; we simulate this
          const isSccsFile = filename.startsWith('s.') ||
               content.includes('@(#)') ||
               content.includes('%M%') ||
               content.includes('%Y%') ||
               content.includes('%I%');

          if (!isSccsFile && !content.includes('\x01h')) {
               // Check for corruption markers
               if (content.includes('bad') || content.includes('corrupt')) {
                    exitCode |= VAL_EXIT.CORRUPTED_SCCS;
                    messages.push('corrupted SCCS file');
               } else {
                    // Accept as valid SCCS (simulated) for files that start with s.
                    if (!filename.startsWith('s.')) {
                         exitCode |= VAL_EXIT.NOT_SCCS_FILE;
                         messages.push('not an SCCS file');
                    }
               }
          }

          // -r SID validation
          if (opts.sid) {
               const sidValid = this.validateSid(opts.sid);
               if (!sidValid.valid) {
                    exitCode |= VAL_EXIT.SID_INVALID;
                    messages.push(`SID ${opts.sid} is ${sidValid.reason}`);
               } else {
                    // Check if SID exists in file (simulated - always exists for s. files)
                    const sidExists = filename.startsWith('s.') || content.includes(opts.sid);
                    if (!sidExists) {
                         exitCode |= VAL_EXIT.SID_NOT_EXIST;
                         messages.push(`SID ${opts.sid} does not exist`);
                    }
               }
          }

          // -y type validation (check %Y% keyword)
          if (opts.type) {
               // Extract %Y% value from content
               const typeMatch = content.match(/%Y%\s*=?\s*(\w+)/);
               const fileType = typeMatch ? typeMatch[1] : undefined;

               if (fileType && fileType !== opts.type) {
                    exitCode |= VAL_EXIT.TYPE_MISMATCH;
                    messages.push(`%Y%, -y mismatch`);
               }
          }

          // -m name validation (check %M% keyword)
          if (opts.moduleName) {
               // Extract %M% value from content  
               const nameMatch = content.match(/%M%\s*=?\s*(\w+)/);
               const fileModule = nameMatch ? nameMatch[1] : undefined;

               if (fileModule && fileModule !== opts.moduleName) {
                    exitCode |= VAL_EXIT.NAME_MISMATCH;
                    messages.push(`%M%, -m mismatch`);
               }
          }

          return { exitCode, messages };
     }

     /**
      * Validate SID format per SCCS rules.
      * Valid formats: R.L or R.L.B.S where R=release, L=level, B=branch, S=sequence
      */
     private validateSid(sid: string): { valid: boolean, reason?: string } {
          // SID format: release.level[.branch.sequence]
          const parts = sid.split('.');

          if (parts.length < 2 || parts.length > 4) {
               return { valid: false, reason: 'invalid format' };
          }

          // All parts must be positive integers
          for (const part of parts) {
               const num = parseInt(part, 10);
               if (isNaN(num) || num < 0 || part !== num.toString()) {
                    return { valid: false, reason: 'invalid format' };
               }
          }

          // Check for ambiguous SID (single number like "1")
          if (parts.length === 1) {
               return { valid: false, reason: 'ambiguous' };
          }

          // Level 0 is invalid (e.g., 1.0)
          if (parts.length >= 2 && parseInt(parts[1], 10) === 0) {
               return { valid: false, reason: 'invalid' };
          }

          // Branch 0 with sequence is invalid (e.g., 1.1.0.1)
          if (parts.length === 4 && parseInt(parts[2], 10) === 0) {
               return { valid: false, reason: 'invalid' };
          }

          return { valid: true };
     }
}