import { describe, it, expect, beforeEach } from 'vitest';
import { FileSystem } from '../../src/domain/entities/FileSystem';
import { FileSystemService } from '../../src/domain/services/FileSystemService';
import { GlobService } from '../../src/domain/services/GlobService';

describe('POSIX Globbing Verification', () => {
    let fs: FileSystem;
    let service: FileSystemService;
    let globber: GlobService;

    beforeEach(() => {
        fs = new FileSystem();
        service = new FileSystemService(fs);
        // Setup initial structure
        // /foo
        // /foo/bar
        // /foo/baz
        // /foo/bax
        // /foo/.hidden
        // /apple
        service.mkdir('/foo');
        service.createFile('/foo/bar');
        service.createFile('/foo/baz');
        service.createFile('/foo/bax');
        service.createFile('/foo/.hidden');
        service.createFile('/apple');

        globber = new GlobService(service);
    });

    it('should match exact files', () => {
        const result = globber.expand('/foo/bar', '/');
        expect(result).toEqual(['/foo/bar']);
    });

    it('should match * wildcard', () => {
        const result = globber.expand('/foo/*', '/');
        expect(result.sort()).toEqual(['/foo/bar', '/foo/bax', '/foo/baz']);
        // Should not match .hidden unless explicitly requested with .*
    });

    it('should match ? wildcard', () => {
        const result = globber.expand('/foo/ba?', '/');
        expect(result.sort()).toEqual(['/foo/bar', '/foo/bax', '/foo/baz']);
    });

    it('should match bracket expressions', () => {
        const result = globber.expand('/foo/ba[rz]', '/');
        expect(result.sort()).toEqual(['/foo/bar', '/foo/baz']);
    });

    it('should match ranges', () => {
        const result = globber.expand('/foo/ba[r-z]', '/'); // r, s, t... z
        expect(result.sort()).toEqual(['/foo/bar', '/foo/bax', '/foo/baz']);
    });

    it('should return pattern if no matches found (default shell behavior)', () => {
        const result = globber.expand('/foo/nomatch*', '/');
        expect(result).toEqual(['/foo/nomatch*']);
    });

    it('should handle relative paths', () => {
        const result = globber.expand('ba*', '/foo');
        expect(result.sort()).toEqual(['bar', 'bax', 'baz']);
    });
});
