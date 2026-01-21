
import os
import re

def fix_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # Check if this is a command with execute method and ProcessContext
    if 'execute(args: string[], context: ProcessContext, state: TerminalState)' in content:
        # Check if 'input' is used in the body but not defined
        # Simple heuristic: 'input' appears in text (excluding the import or comments roughly)
        # We can just insert it.
        
        # Regex to find the start of execute body
        # Matches: execute(...) {
        # capture the brace
        pattern = r"(execute\(args: string\[\], context: ProcessContext, state: TerminalState[^)]*\)\s*(?::\s*Promise<[^>]+>|:\s*\w+)?\s*\{)"
        
        match = re.search(pattern, content)
        if match:
            start_brace = match.group(0)
            # Check if we already inserted it
            if "const input = context.stdin;" in content:
                # print(f"Skipping {filepath} (already fixed)")
                return

            # Insert it
            replacement = f"{start_brace}\n        const input = context.stdin;"
            new_content = content.replace(start_brace, replacement)
            
            with open(filepath, 'w') as f:
                f.write(new_content)
            print(f"Fixed input usage in {filepath}")

def main():
    root_dir = '/home/dbslim/Terminalator/src'
    for root, dirs, files in os.walk(root_dir):
        for file in files:
            if file.endswith('.ts'):
                fix_file(os.path.join(root, file))

if __name__ == "__main__":
    main()
