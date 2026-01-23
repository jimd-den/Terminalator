import { describe, it, expect, beforeEach } from 'vitest';
import { ShellExpansionService } from '../../src/domain/services/ShellExpansionService';
import { FileSystemService } from '../../src/domain/services/FileSystemService';
import { FileSystem } from '../../src/domain/entities/FileSystem';

describe('ShellExpansionService', () => {
    let service: ShellExpansionService;
    let fs: FileSystem;
    let fsService: FileSystemService;

    beforeEach(() => {
        fs = new FileSystem();
        fsService = new FileSystemService(fs);
        service = new ShellExpansionService(fsService);
    });

    describe('Variable Expansion', () => {
        it('should expand variables', () => {
            const env = { 'USER': 'operator' };
            const input = 'Hello $USER';
            const result = service.expandVariables(input, env);
            expect(result).toBe('Hello operator');
        });

        it('should expand multiple variables', () => {
            const env = { 'A': '1', 'B': '2' };
            const input = '$A + $B';
            const result = service.expandVariables(input, env);
            expect(result).toBe('1 + 2');
        });

        it('should handle missing variables as empty string', () => {
            const env = {};
            const input = 'Hello $MISSING';
            const result = service.expandVariables(input, env);
            expect(result).toBe('Hello ');
        });
    });

    describe('Arithmetic Expansion', () => {
        it('should evaluate arithmetic expressions', () => {
            const input = 'Value: $(( 1 + 2 ))';
            const result = service.expandArithmetic(input);
            expect(result).toBe('Value: 3');
        });

        it('should handle complex expressions', () => {
            const input = '$(( 10 * 5 ))';
            const result = service.expandArithmetic(input);
            expect(result).toBe('50');
        });
    });

    describe('Full Token Expansion', () => {
        it('should handle variables then globbing', () => {
            // Setup FS for globbing
            fsService.createFile('/test1.txt');
            fsService.createFile('/test2.txt');

            // Logic: $PATTERN -> *.txt -> [test1.txt, test2.txt]
            const env = { 'PATTERN': '*.txt' };
            const input = '$PATTERN';

            const results = service.expandToken(input, env, '/');
            expect(results).toContain('/test1.txt');
            expect(results).toContain('/test2.txt');
            expect(results.length).toBe(2);
        });

        it('should handle arithmetic then expansion', () => {
            // $(( 1+1 )).txt -> 2.txt (if it existed? or just string)
            // If file doesn't exist, glob returns the pattern.
            const input = '$(( 1 + 1 )).txt';
            const results = service.expandToken(input, {}, '/');
            expect(results).toEqual(['2.txt']);
        });
    });
});
