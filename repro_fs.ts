import { FileSystem } from './src/domain/entities/FileSystem';
import { FileSystemService } from './src/domain/services/FileSystemService';

const fs = new FileSystem();
const service = new FileSystemService(fs);

try {
    console.log('--- Initial State ---');
    console.log('Root children:', Array.from(fs.root.children.keys()));

    // Try creating home/operator manually as SystemGenerator would
    console.log('\n--- Creating /home/operator ---');
    try {
        service.mkdir('/home');
        service.mkdir('/home/operator');
        console.log('Created /home/operator');
    } catch (e: any) {
        console.error('Failed to create /home/operator:', e.message);
    }

    // Verify existence
    const homeOp = service.resolve('/home/operator');
    console.log('/home/operator exists:', !!homeOp);

    // Try relative mkdir
    console.log('\n--- MKDIR relative_dir (in /home/operator) ---');
    try {
        service.mkdir('relative_dir', 0o755, 0, 0, '/home/operator');
        console.log('Success: mkdir relative_dir');
    } catch (e: any) {
        console.error('Fail: mkdir relative_dir:', e.message);
    }

    const rel = service.resolve('/home/operator/relative_dir');
    console.log('/home/operator/relative_dir exists:', !!rel);

    // Try createFile with relative path
    console.log('\n--- CREATE file relative (in /home/operator) ---');
    try {
        service.createFile('rel_file', 0o644, 0, 0, '/home/operator');
        console.log('Success: create rel_file');
    } catch (e: any) {
        console.error('Fail: create rel_file:', e.message);
    }

} catch (err) {
    console.error('Global Error:', err);
}
