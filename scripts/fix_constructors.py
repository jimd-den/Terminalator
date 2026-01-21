
import os
import re

def fix_constructor(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # Add import if missing
    if 'FileSystemService' not in content:
         # Try finding TerminalState import
        if "import { TerminalState }" in content:
            content = content.replace("import { TerminalState }", "import { FileSystemService } from '../../../domain/services/FileSystemService';\nimport { TerminalState }")
        else:
             content = re.sub(r"(import .*?from .*?TerminalState.*?;)", r"\1\nimport { FileSystemService } from '../../../domain/services/FileSystemService';", content)

    # Replace constructor arg type
    # constructor(private fs: FileSystem)
    content = content.replace('private fs: FileSystem', 'private fs: FileSystemService')
    content = content.replace('public fs: FileSystem', 'public fs: FileSystemService')
    content = content.replace('fs: FileSystem', 'fs: FileSystemService') 
    
    # Replace property definitions
    # private fs: FileSystem;
    content = content.replace('private fs: FileSystem;', 'private fs: FileSystemService;')
    
    # Check for mis-imports (FileSystemEntity vs Service) 
    # Logic in fix_fs_usage.py handled usage, this handles definition.

    # Also, some commands might have `context.fileSystemService` usage but still have `private fs: FileSystemService`.
    # That is fine. 

    with open(filepath, 'w') as f:
        f.write(content)
        
    print(f"Fixed constructor in {filepath}")

def main():
    root_dir = '/home/dbslim/Terminalator/src'
    for root, dirs, files in os.walk(root_dir):
        for file in files:
            if file.endswith('.ts'):
                if 'FileSystem' in file or 'Service' in file: # skip some?
                    pass 
                fix_constructor(os.path.join(root, file))

if __name__ == "__main__":
    main()
