/**
 * FileSystem Entity - Domain Layer
 * 
 * A simulated POSIX-compliant file system.
 * Supports a tree structure of files and directories with parent references for traversal.
 */

export type FileType = 'file' | 'directory';

export interface FSNode {
    name: string;
    type: FileType;
    parent: FSNode | null; // Added for '..' support
    content?: string;
    children?: Record<string, FSNode>;
    owner: string;
    permissions: string; // e.g., 'rwxr-xr-x'
    updatedAt: string;
}

export class FileSystem {
    root: FSNode;

    constructor() {
        this.root = this.createInitialState();
        this.linkParents(this.root, null);
    }

    /**
     * Resolves a path string to a FSNode.
     * Handles absolute paths ('/etc'), relative paths ('bin'),
     * parent references ('..'), and current directory references ('.').
     */
    resolveNode(path: string, cwd: string = '/'): FSNode | null {
        if (!path) return null;

        // 1. Determine starting point
        let current: FSNode | null = path.startsWith('/') ? this.root : this.resolveNode(cwd, '/');

        if (!current) return null; // Should not happen if cwd is valid, but safety check

        // 2. Normalize path parts
        const parts = path.split('/').filter(p => p.length > 0 && p !== '.');

        // 3. Traverse
        for (const part of parts) {
            if (part === '..') {
                if (current.parent) {
                    current = current.parent;
                }
                // if no parent (root), stay at root
            } else {
                if (current.type !== 'directory' || !current.children || !current.children[part]) {
                    return null;
                }
                current = current.children[part];
            }
        }

        return current;
    }

    /**
     * Legacy support wrapper for getNode
     */
    getNode(path: string): FSNode | null {
        return this.resolveNode(path);
    }

    /**
     * Helper to get absolute path of a node
     */
    getAbsolutePath(node: FSNode): string {
        const parts: string[] = [];
        let current: FSNode | null = node;
        while (current && current.parent) {
            parts.unshift(current.name);
            current = current.parent;
        }
        return parts.length === 0 ? '/' : '/' + parts.join('/');
    }

    private createInitialState(): FSNode {
        const now = new Date().toISOString();
        const root: FSNode = {
            name: '/',
            type: 'directory',
            parent: null,
            children: {
                'bin': {
                    name: 'bin', type: 'directory', parent: null, owner: 'root', permissions: 'rwxr-xr-x', updatedAt: now, children: {
                        'help': { name: 'help', type: 'file', parent: null, content: 'AVAILABLE COMMANDS:\nls - List files\ncd <dir> - Change directory\ncat <file> - Read file\nmail - Check mail\nvim <file> - Edit file\ncompile <file> - Process 24XX scripts\n', owner: 'root', permissions: 'r-xr-xr-x', updatedAt: now },
                    }
                },
                'dev': {
                    name: 'dev', type: 'directory', parent: null, owner: 'root', permissions: 'rwxr-xr-x', updatedAt: now, children: {
                        'null': { name: 'null', type: 'file', parent: null, content: '', owner: 'root', permissions: 'rw-rw-rw-', updatedAt: now },
                        'zero': { name: 'zero', type: 'file', parent: null, content: '', owner: 'root', permissions: 'rw-rw-rw-', updatedAt: now },
                        'tty': { name: 'tty', type: 'file', parent: null, content: '', owner: 'root', permissions: 'rw-rw-rw-', updatedAt: now },
                    }
                },
                'etc': {
                    name: 'etc', type: 'directory', parent: null, owner: 'root', permissions: 'rwxr-xr-x', updatedAt: now, children: {
                        'config': { name: 'config', type: 'file', parent: null, content: 'SYSTEM CONFIGURATION\n--------------------\nMAX_THREADS=4\nTARGET_IP=UNRESOLVED\n\n[HINT]: NPCs will send encrypted coordinates. Use "vim" to write protocols and "compile" to decrypt.', owner: 'root', permissions: 'r--r--r--', updatedAt: now },
                        'passwd': { name: 'passwd', type: 'file', parent: null, content: 'root:x:0:0:root:/root:/bin/bash\noperator:x:1000:1000:operator:/home/operator:/bin/bash', owner: 'root', permissions: 'r--r--r--', updatedAt: now },
                    }
                },
                'home': {
                    name: 'home', type: 'directory', parent: null, owner: 'root', permissions: 'rwxr-xr-x', updatedAt: now, children: {
                        'operator': {
                            name: 'operator', type: 'directory', parent: null, owner: 'operator', permissions: 'rwx------', updatedAt: now, children: {
                                'mail': { name: 'mail', type: 'directory', parent: null, owner: 'operator', permissions: 'rwx------', updatedAt: now, children: {} },
                                'notes.txt': { name: 'notes.txt', type: 'file', parent: null, content: 'System initialized. Awaiting NPCs.', owner: 'operator', permissions: 'rw-------', updatedAt: now },
                            }
                        },
                    }
                },
                'lib': { name: 'lib', type: 'directory', parent: null, owner: 'root', permissions: 'rwxr-xr-x', updatedAt: now, children: {} },
                'proc': { name: 'proc', type: 'directory', parent: null, owner: 'root', permissions: 'r-xr-xr-x', updatedAt: now, children: {} },
                'root': { name: 'root', type: 'directory', parent: null, owner: 'root', permissions: 'rwx------', updatedAt: now, children: {} },
                'tmp': { name: 'tmp', type: 'directory', parent: null, owner: 'root', permissions: 'rwxrwxrwt', updatedAt: now, children: {} },
                'usr': {
                    name: 'usr', type: 'directory', parent: null, owner: 'root', permissions: 'rwxr-xr-x', updatedAt: now, children: {
                        'bin': { name: 'bin', type: 'directory', parent: null, owner: 'root', permissions: 'rwxr-xr-x', updatedAt: now, children: {} },
                        'lib': { name: 'lib', type: 'directory', parent: null, owner: 'root', permissions: 'rwxr-xr-x', updatedAt: now, children: {} },
                        'share': { name: 'share', type: 'directory', parent: null, owner: 'root', permissions: 'rwxr-xr-x', updatedAt: now, children: {} },
                    }
                },
                'var': {
                    name: 'var', type: 'directory', parent: null, owner: 'root', permissions: 'rwxr-xr-x', updatedAt: now, children: {
                        'log': { name: 'log', type: 'directory', parent: null, owner: 'root', permissions: 'rwxr-xr-x', updatedAt: now, children: {} },
                        'tmp': { name: 'tmp', type: 'directory', parent: null, owner: 'root', permissions: 'rwxrwxrwt', updatedAt: now, children: {} },
                    }
                },
            },
            owner: 'root',
            permissions: 'rwxr-xr-x',
            updatedAt: now,
        };
        return root;
    }

    private linkParents(node: FSNode, parent: FSNode | null) {
        node.parent = parent;
        if (node.children) {
            for (const key in node.children) {
                this.linkParents(node.children[key], node);
            }
        }
    }

    /**
     * Creates a new node (file or directory) at the specified path.
     * Returns the created node or throws an error.
     */
    createNode(path: string, type: FileType, cwd: string = '/'): FSNode {
        // 1. Split path into parent and new name
        const parts = path.split('/');
        const name = parts.pop();
        if (!name) throw new Error('Invalid path');

        // 2. Resolve parent
        const parentPath = parts.length === 0 ? cwd : (path.startsWith('/') ? '/' + parts.join('/') : parts.join('/'));
        // Special case: if path was just "filename", parent is cwd.
        // If path was "/filename", parent is "/".

        // Let's rely on resolveNode for the parent directory
        // Re-evaluating split logic for edge cases like "mkdir /foo" -> parent "/", name "foo"

        let parentNode: FSNode | null;

        if (path.startsWith('/')) {
            const lastSlashIndex = path.lastIndexOf('/');
            const parentStr = path.substring(0, lastSlashIndex) || '/';
            parentNode = this.resolveNode(parentStr);
        } else {
            // Relative path
            if (parts.length === 0) {
                parentNode = this.resolveNode(cwd);
            } else {
                parentNode = this.resolveNode(parts.join('/'), cwd);
            }
        }

        if (!parentNode) {
            throw new Error(`cannot create '${path}': No such file or directory`);
        }

        if (parentNode.type !== 'directory') {
            throw new Error(`cannot create '${path}': Not a directory`);
        }

        if (parentNode.children && parentNode.children[name]) {
            throw new Error(`cannot create '${path}': File exists`);
        }

        // 3. Create Node
        if (!parentNode.children) parentNode.children = {};

        const newNode: FSNode = {
            name: name,
            type: type,
            parent: parentNode,
            owner: 'operator', // Default owner
            permissions: type === 'directory' ? 'rwxr-xr-x' : 'rw-r--r--',
            updatedAt: new Date().toISOString(),
            children: type === 'directory' ? {} : undefined
        };

        parentNode.children[name] = newNode;
        return newNode;
    }

    /**
     * Writes content to a file. Creates it if it doesn't exist.
     * Mode: 'w' (overwrite) or 'a' (append)
     */
    writeFile(path: string, content: string, mode: 'w' | 'a' = 'w', cwd: string = '/'): FSNode {
        // Check if file exists
        const node = this.resolveNode(path, cwd);

        if (node) {
            if (node.type === 'directory') {
                throw new Error(`cannot write to '${path}': Is a directory`);
            }
            if (mode === 'w') {
                node.content = content;
            } else {
                node.content = (node.content || '') + content;
            }
            node.updatedAt = new Date().toISOString();
            return node;
        } else {
            // Create new file
            // createNode throws if parent doesn't exist, which is correct
            const newNode = this.createNode(path, 'file', cwd);
            newNode.content = content;
            return newNode;
        }
    }

    /**
     * Change file mode (permissions)
     */
    chmod(path: string, mode: string, cwd: string = '/'): void {
        const node = this.resolveNode(path, cwd);
        if (!node) throw new Error(`chmod: cannot access '${path}': No such file or directory`);
        node.permissions = mode;
        node.updatedAt = new Date().toISOString();
    }

    /**
     * Change file owner
     */
    chown(path: string, owner: string, cwd: string = '/'): void {
        const node = this.resolveNode(path, cwd);
        if (!node) throw new Error(`chown: cannot access '${path}': No such file or directory`);
        node.owner = owner;
        node.updatedAt = new Date().toISOString();
    }
    /**
     * Deletes a node (file or directory)
     */
    deleteNode(path: string, cwd: string = '/'): void {
        const node = this.resolveNode(path, cwd);
        if (!node) throw new Error(`cannot remove '${path}': No such file or directory`);
        if (!node.parent || !node.parent.children) throw new Error(`cannot remove root directory`);

        delete node.parent.children[node.name];
    }
}
