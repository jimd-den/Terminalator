
import os
import re

def fix_inputs(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    if 'execute(args: string[], context: ProcessContext, state: TerminalState' in content:
        # Check for 'input' usage
        # If 'const input = context.stdin;' is NOT present
        if "const input = context.stdin;" not in content:
            # Check if 'input' is used
            if re.search(r"\binput\b", content):
                 # Insert it
                 content = re.sub(r"(execute\(.*?\)\s*(?::\s*Promise<[^>]+>|:\s*\w+)?\s*\{)", r"\1\n        const input = context.stdin;", content, count=1)
                 print(f"Injected input in {filepath}")

        # Check for '_input' usage
        if "const _input = context.stdin;" not in content:
             if re.search(r"\b_input\b", content):
                 # Insert it
                 content = re.sub(r"(execute\(.*?\)\s*(?::\s*Promise<[^>]+>|:\s*\w+)?\s*\{)", r"\1\n        const _input = context.stdin;", content, count=1)
                 print(f"Injected _input in {filepath}")
        
    with open(filepath, 'w') as f:
        f.write(content)

def main():
    root_dir = '/home/dbslim/Terminalator/src'
    for root, dirs, files in os.walk(root_dir):
        for file in files:
            if file.endswith('.ts'):
                fix_inputs(os.path.join(root, file))

if __name__ == "__main__":
    main()
