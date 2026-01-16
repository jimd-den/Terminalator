/**
 * FileSystem Entity - Domain Layer
 * 
 * A simulated POSIX-compliant file system.
 * Supports a tree structure of files and directories.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture) - Entities
 * Pillar: The Balanced Scale (SOLID / KISS) - Simple Tree Structure
 *
 * Intent:
 * Provides the persistent state of the virtual world.
 * Allows commands to manipulate files and directories.
 */

export type FileType = 'file' | 'directory';

export interface FSNode {
    name: string;
    type: FileType;
    content?: string;
    children?: Record<string, FSNode>;
    owner: string;
    permissions: string; // e.g., 'rwxr-xr-x'
    updatedAt: string;
}

export class FileSystem {
    root: FSNode;

    constructor() {
        this.root = {
            name: '/',
            type: 'directory',
            children: {
                'bin': {
                    name: 'bin', type: 'directory', owner: 'root', permissions: 'rwxr-xr-x', updatedAt: new Date().toISOString(), children: {
                        'help': { name: 'help', type: 'file', content: 'AVAILABLE COMMANDS:\nls - List files\ncd <dir> - Change directory\ncat <file> - Read file\nmail - Check mail\nvim <file> - Edit file\ncompile <file> - Process 24XX scripts\n', owner: 'root', permissions: 'r-xr-xr-x', updatedAt: new Date().toISOString() },
                    }
                },
                'home': {
                    name: 'home', type: 'directory', owner: 'root', permissions: 'rwxr-xr-x', updatedAt: new Date().toISOString(), children: {
                        'operator': {
                            name: 'operator', type: 'directory', owner: 'operator', permissions: 'rwx------', updatedAt: new Date().toISOString(), children: {
                                'mail': { name: 'mail', type: 'directory', owner: 'operator', permissions: 'rwx------', updatedAt: new Date().toISOString(), children: {} },
                                'notes.txt': { name: 'notes.txt', type: 'file', content: 'System initialized. Awaiting NPCs.', owner: 'operator', permissions: 'rw-------', updatedAt: new Date().toISOString() },
                            }
                        },
                    }
                },
                'etc': {
                    name: 'etc', type: 'directory', owner: 'root', permissions: 'rwxr-xr-x', updatedAt: new Date().toISOString(), children: {
                        'config': { name: 'config', type: 'file', content: 'SYSTEM CONFIGURATION\n--------------------\nMAX_THREADS=4\nTARGET_IP=UNRESOLVED\n\n[HINT]: NPCs will send encrypted coordinates. Use "vim" to write protocols and "compile" to decrypt.', owner: 'root', permissions: 'r--r--r--', updatedAt: new Date().toISOString() },
                    }
                },
            },
            owner: 'root',
            permissions: 'rwxr-xr-x',
            updatedAt: new Date().toISOString(),
        };
    }

    /**
     * Traverses the file system to find a node by path.
     *
     * @param path - The absolute or relative path to the node.
     * @returns The FSNode if found, otherwise null.
     */
    getNode(path: string): FSNode | null {
        if (path === '/') return this.root;
        const parts = path.split('/').filter(p => p.length > 0);
        let current = this.root;

        for (const part of parts) {
            if (current.children && current.children[part]) {
                current = current.children[part];
            } else {
                return null;
            }
        }
        return current;
    }
}
