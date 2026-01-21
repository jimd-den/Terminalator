
import os

def fix_types(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
    
    original = content
    # Replace the corrupted names. Order matters (longest first to avoid partials)
    
    # Fix triple
    content = content.replace('FileSystemServiceServiceService', 'FileSystemService')
    # Fix double
    content = content.replace('FileSystemServiceService', 'FileSystemService')
    
    if content != original:
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"Fixed types in {filepath}")

def main():
    root_dir = '/home/dbslim/Terminalator/src'
    for root, dirs, files in os.walk(root_dir):
        for file in files:
            if file.endswith('.ts'):
                fix_types(os.path.join(root, file))

if __name__ == "__main__":
    main()
