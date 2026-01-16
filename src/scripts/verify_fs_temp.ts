
import { FileSystem } from '../domain/entities/FileSystem';

const assert = (condition: boolean, message: string) => {
    if (!condition) {
        console.error(`❌ FAIL: ${message}`);
        process.exit(1);
    } else {
        console.log(`✅ PASS: ${message}`);
    }
};

const runTests = () => {
    console.log('Starting FileSystem (Inode/Dentry) Verification...');

    const fs = new FileSystem();

    // Test 1: Root directory
    const root = fs.resolve('/');
    assert(root !== null, 'Root / should exist');
    assert(fs.isDirectory(root!), 'Root should be a directory');

    // Test 2: Create Directory
    const dir = fs.mkdir('/home/testuser');
    assert(dir !== null, 'mkdir should return dentry');
    assert(fs.resolve('/home/testuser') !== null, 'Resolved path should exist');
    assert(fs.isDirectory(dir), 'Created object should be directory');

    // Test 3: Create File
    fs.writeFile('/home/testuser/hello.txt', 'Hello World');
    const file = fs.resolve('/home/testuser/hello.txt');
    assert(file !== null, 'Created file should exist');

    const content = fs.readFile('/home/testuser/hello.txt');
    assert(content === 'Hello World', 'File content should match');

    // Test 4: Traversal
    const resolved = fs.resolve('hello.txt', '/home/testuser');
    assert(resolved !== null, 'Relative path resolution should work');
    assert(fs.getAbsolutePath(resolved!) === '/home/testuser/hello.txt', 'Absolute path reconstruction');

    // Test 5: Verify default structure
    assert(fs.resolve('/etc/passwd') !== null, 'Default /etc/passwd should exist');

    console.log('All Inode/Dentry verifications passed.');
};

runTests();
