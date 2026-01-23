import { describe, it, expect, beforeEach } from 'vitest';
import { FileSystem } from '../../src/domain/entities/FileSystem';
import { FileSystemService } from '../../src/domain/services/FileSystemService';

/**
 * Test Suite: FileSystemService Resolution Logic
 * 
 * Validates the pure function logic for resolving path strings 
 * to absolute paths, adhering to POSIX conventions.
 */
describe('FileSystemService.resolveAbsolutePath', () => {
    let fs: FileSystem;
    let service: FileSystemService;

    beforeEach(() => {
        fs = new FileSystem();
        service = new FileSystemService(fs);
    });

    it('should return the path as-is if it is already absolute', () => {
        const result = service.resolveAbsolutePath('/home/user', '/');
        expect(result).toBe('/home/user');
    });

    it('should prepend cwd if path is relative', () => {
        const result = service.resolveAbsolutePath('docs', '/home/user');
        expect(result).toBe('/home/user/docs');
    });

    it('should handle root cwd properly when resolving relative paths', () => {
        const result = service.resolveAbsolutePath('bin', '/');
        expect(result).toBe('/bin');
    });

    it('should normalize double slashes', () => {
        // Our current simple implementation might not normalize, but the requirement 
        // implies we should at least handle the join correctly. 
        // Standard Behavior: // -> /
        const result = service.resolveAbsolutePath('//bin//sh', '/');
        // If we strictly implement normalizing, it should be /bin/sh
        // Let's expect the implementation to produce clean paths.
        expect(result).toBe('/bin/sh');
    });

    it('should handle . and .. segments', () => {
        // Advanced resolution (Canonicalization)
        // If we implement simple string concatenation, this test fails.
        // POSIX path resolution usually canonicalizes.
        // Let's demand canonicalization for "Robust Arch".

        expect(service.resolveAbsolutePath('./foo', '/home')).toBe('/home/foo');
        expect(service.resolveAbsolutePath('../Start', '/home/user')).toBe('/home/Start');
        expect(service.resolveAbsolutePath('foo/../../bar', '/home/user/src')).toBe('/home/user/bar');
    });
});
