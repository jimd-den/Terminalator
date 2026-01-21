
import os
import re

def refactor_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # Skip files that don't look like commands or are already refactored (check for ProcessContext import + usage)
    if 'ProcessContext' in content and 'context: ProcessContext' in content:
        # print(f"Skipping {filepath} (already refactored)")
        return

    # 1. Add Import if missing
    # We want to add it near the TerminalState import or ICommand import
    if 'ProcessContext' not in content:
        # Try finding TerminalState import
        if "import { TerminalState }" in content:
            content = content.replace("import { TerminalState }", "import { ProcessContext } from '../../../domain/entities/ProcessContext';\nimport { TerminalState }")
        elif "import { TerminalState" in content:
             # Multiline import or other variation
             pass # Logic might be brittle, let's just append it after the last import if not found
    
    # Actually, simpler regex for import addition:
    if 'from \'../../../domain/entities/ProcessContext\'' not in content and 'from "../../../domain/entities/ProcessContext"' not in content:
        # Look for the last import and add it there, or specifically next to Command/TerminalState
        # Let's try to add it after strict imports
        content = re.sub(r"(import .*?from .*?TerminalState.*?;)", r"\1\nimport { ProcessContext } from '../../../domain/entities/ProcessContext';", content)

    # 2. Update Execute Signature
    # Pattern: execute(args: string[], state: TerminalState ...): ...
    # Replacement: execute(args: string[], context: ProcessContext, state: TerminalState): ...
    
    # Regex covers async and non-async, and optional input
    # Group 1: async? execute
    # Group 2: return type part
    pattern = r"(async\s+)?execute\s*\(\s*args:\s*string\[\],\s*state:\s*TerminalState(?:\s*,\s*(?:input|_input)\??:\s*string)?\s*\)"
    
    match = re.search(pattern, content)
    if match:
        prefix = match.group(1) or ""
        # We drop the input arg since we're standardizing context handling, OR we keep it? 
        # The new signature is (args, context, state). 
        # Wait, ICommand interface: execute(args: string[], context: ProcessContext, state: TerminalState)
        # Does it support input?
        # My ICommand definition: execute(args: string[], context: ProcessContext, state: TerminalState): ...
        # So 'input' is GONE from the interface?
        # In ExecuteCommand: `command.execute(args, context, currentState)` -> 3 args.
        # `context.stdin` holds the input.
        # So I should REMOVE the input argument from the signature implementation.
        
        replacement = f"{prefix}execute(args: string[], context: ProcessContext, state: TerminalState)"
        content = re.sub(pattern, replacement, content)
        
        # 3. Update usages of 'input' in the body to 'context.stdin'
        # This is risky doing blindly.
        # But if the argument variable was named 'input', now it's gone.
        # Code using 'input' will break. 
        # I can rename usage: `input` -> `context.stdin`.
        # But I need to be careful not to replace other 'input' variables.
        # Only if 'input' was separate.
        # I'll rely on TS compiler to identify broken 'input' usages, OR I can try to map it.
        # Let's just update the signature. The missing 'input' arg will cause "Cannot find name 'input'" errors, which is easy to fix (change to context.stdin).
        
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"Refactored {filepath}")
    else:
        # print(f"No match in {filepath}")
        pass

def main():
    root_dir = '/home/dbslim/Terminalator/src'
    for root, dirs, files in os.walk(root_dir):
        for file in files:
            if file.endswith('.ts'):
                refactor_file(os.path.join(root, file))

if __name__ == "__main__":
    main()
