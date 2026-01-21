
import os
import re

def fix_suite(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
    
    # 1. Fix main executor (Line 2899 approx)
    # const fs = new FileSystem();
    # const executor = new ExecuteCommand(fs);
    # ->
    # const fs = new FileSystem();
    # const service = new FileSystemService(fs);
    # const executor = new ExecuteCommand(service);
    
    if "const executor = new ExecuteCommand(fs);" in content:
        content = content.replace(
            "const executor = new ExecuteCommand(fs);",
            "const service = new FileSystemService(fs);\n    const executor = new ExecuteCommand(service);"
        )
        print("Fixed main executor")

    # 2. Fix test loop executor (Line 2934 approx)
    # const testFs = new FileSystem();
    # const service = new FileSystemService(testFs);
    # ...
    # testExecutor = new ExecuteCommand(testFs);
    # -> testExecutor = new ExecuteCommand(service);
    
    # Also line 2932: testExecutor = new ExecuteCommand(testFs, undefined, registry, runner);
    
    content = content.replace("new ExecuteCommand(testFs)", "new ExecuteCommand(service)")
    content = content.replace("new ExecuteCommand(testFs, ", "new ExecuteCommand(service, ")
    
    # 3. Fix C17 registry (Line 2930)
    # const registry = new ExecuteCommand(testFs).getRegistry();
    # -> const registry = new ExecuteCommand(service).getRegistry();
    
    # This is covered by replace above?
    # "new ExecuteCommand(testFs)" string match covers it.
    
    with open(filepath, 'w') as f:
        f.write(content)
    print(f"Fixed {filepath}")

def main():
    filepath = '/home/dbslim/Terminalator/scripts/posix_comprehensive_suite.ts'
    if os.path.exists(filepath):
        fix_suite(filepath)

if __name__ == "__main__":
    main()
