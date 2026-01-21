
import os
import re

def fix_this_fs(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
    
    original_content = content
    
    # this.fs.resolveNode -> this.fs.resolve
    content = content.replace('this.fs.resolveNode', 'this.fs.resolve')
    
    # this.fs.getInode -> this.fs.getInode (Same)
    
    # this.fs.isDirectory -> this.fs.isDirectory (Same)
    
    # this.fs.createFile -> this.fs.createFile (Same)

    # this.fs.mkdir -> this.fs.mkdir (Same)

    # this.fs.deleteNode -> this.fs.deleteNode (Same)
    
    # Also handle 'fs.resolveNode' if 'fs' variable is used (e.g. in collectSources(fs: FileSystemService...))
    content = content.replace('fs.resolveNode', 'fs.resolve')
    
    # context.fs.resolveNode -> context.fileSystemService.resolve (Catching stragglers or missed state.fs replacements if context.fs was used)
    content = content.replace('context.fs.resolveNode', 'context.fileSystemService.resolve')
    
    if content != original_content:
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"Fixed fs methods in {filepath}")

def main():
    root_dir = '/home/dbslim/Terminalator/src'
    for root, dirs, files in os.walk(root_dir):
        for file in files:
            if file.endswith('.ts'):
                fix_this_fs(os.path.join(root, file))

if __name__ == "__main__":
    main()
