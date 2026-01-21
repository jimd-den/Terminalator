
import os
import re

def fix_signature(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # Check for ICommand implementation or execute method
    if 'execute(' in content and 'ProcessContext' not in content:
        # Needs ProcessContext import
        if "import { ProcessContext }" not in content:
             content = re.sub(r"(import .*?from .*?TerminalState.*?;)", r"\1\nimport { ProcessContext } from '../../../domain/entities/ProcessContext';", content)
        
        # Replace execute signature
        # Match execute(...) with various args variants
        # Common pattern: execute(_args: string[], state: TerminalState, ...)
        
        # We replace the whole signature line
        pattern = r"execute\s*\(\s*(\w+)\s*:\s*string\[\]\s*,\s*(\w+)\s*:\s*TerminalState.*?\)\s*:"
        # This matches `execute(args: string[], state: TerminalState...):`
        # We need to change it to `execute(args: string[], context: ProcessContext, state: TerminalState):`
        
        # Use a function for replacement to capture var names
        def repl(match):
            arg_name = match.group(1)
            state_name = match.group(2) # state variable name
            return f"execute({arg_name}: string[], context: ProcessContext, {state_name}: TerminalState):"

        new_content = re.sub(pattern, repl, content)
        
        if new_content == content:
             # Try variant with _args
             pattern2 = r"execute\s*\((_?\w+)\s*:\s*string\[\]\s*,\s*(\w+)\s*:\s*TerminalState.*?\)\s*:"
             new_content = re.sub(pattern2, repl, content)

        if new_content != content:
             # Check if input was used/supported
             # If original had 3rd arg input?
             # The regex above consumes until `):`. If there was a 3rd arg, it's gone from signature.
             # We should inject `const input = context.stdin;` or `const _input = context.stdin;` if needed.
             
             # But 'fix_input_usage.py' will handle `const input = ...` if I run it again?
             # No, fix_input_usage checks for `execute(...ProcessContext...)`.
             # So after I update signature here, I should run fix_input_usage again!
             
             content = new_content
             with open(filepath, 'w') as f:
                 f.write(content)
             print(f"Fixed signature in {filepath}")

def main():
    root_dir = '/home/dbslim/Terminalator/src/domain/commands/core'
    # Focused on core commands first as they are the noisy ones
    for root, dirs, files in os.walk(root_dir):
        for file in files:
            if file.endswith('.ts'):
                fix_signature(os.path.join(root, file))

if __name__ == "__main__":
    main()
