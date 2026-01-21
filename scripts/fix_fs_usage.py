
import os
import re

def refactor_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
    
    original_content = content
    
    # Replace property access first
    # context.fs.resolveNode -> context.fileSystemService.resolve
    content = content.replace('context.fs.resolveNode', 'context.fileSystemService.resolve')
    content = content.replace('state.fs.resolveNode', 'context.fileSystemService.resolve')
    
    # context.fs.getInode -> context.fileSystemService.getInode
    content = content.replace('context.fs.getInode', 'context.fileSystemService.getInode')
    content = content.replace('state.fs.getInode', 'context.fileSystemService.getInode')
    
    # context.fs.isDirectory -> context.fileSystemService.isDirectory
    content = content.replace('context.fs.isDirectory', 'context.fileSystemService.isDirectory')
    content = content.replace('state.fs.isDirectory', 'context.fileSystemService.isDirectory')
    
    # context.fs.createFile -> context.fileSystemService.createFile
    content = content.replace('context.fs.createFile', 'context.fileSystemService.createFile')
    content = content.replace('state.fs.createFile', 'context.fileSystemService.createFile')

    # context.fs.mkdir -> context.fileSystemService.mkdir
    content = content.replace('context.fs.mkdir', 'context.fileSystemService.mkdir')
    content = content.replace('state.fs.mkdir', 'context.fileSystemService.mkdir')

    # context.fs.deleteNode -> context.fileSystemService.deleteNode
    content = content.replace('context.fs.deleteNode', 'context.fileSystemService.deleteNode')
    content = content.replace('state.fs.deleteNode', 'context.fileSystemService.deleteNode')
    
    # this.fs -> this.service (if applicable, but risky if property not renamed. 
    # Better to rely on manual fixes for class properties if they are not standard context usage)
    
    if content != original_content:
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"Refactored usages in {filepath}")

def main():
    root_dir = '/home/dbslim/Terminalator/src'
    # Also check tests
    dirs_to_check = ['/home/dbslim/Terminalator/src', '/home/dbslim/Terminalator/tests']
    
    for root_dir in dirs_to_check:
        for root, dirs, files in os.walk(root_dir):
            for file in files:
                if file.endswith('.ts'):
                    refactor_file(os.path.join(root, file))

if __name__ == "__main__":
    main()
