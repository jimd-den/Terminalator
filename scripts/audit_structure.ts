
import * as fs from 'fs';
import * as path from 'path';

export interface FileNode {
    name: string;
    type: 'file' | 'directory';
    path: string;
    children?: FileNode[];
}

export function mapFileStructure(dirPath: string): FileNode {
    const stats = fs.statSync(dirPath);
    const name = path.basename(dirPath);
    
    if (stats.isDirectory()) {
        const children = fs.readdirSync(dirPath).map(childName => {
            return mapFileStructure(path.join(dirPath, childName));
        });
        // Sort children: directories first, then files, alphabetically
        children.sort((a, b) => {
            if (a.type === b.type) return a.name.localeCompare(b.name);
            return a.type === 'directory' ? -1 : 1;
        });
        
        return {
            name,
            type: 'directory',
            path: dirPath,
            children
        };
    } else {
        return {
            name,
            type: 'file',
            path: dirPath
        };
    }
}
