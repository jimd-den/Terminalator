#!/bin/sh

# Check for POSIX compatibility issues in the codebase

# 1. Check for CRLF line endings (common Windows vs POSIX issue)
# using grep -U (binary) -q (quiet) -I (ignore binary files)
# Using printf to generate \r for portability instead of $'\r' (bashism)
# We want to ensure NO files have CRLF.

echo "Checking for CRLF line endings..."
if grep -rUI $(printf '\r') src/ scripts/; then
    echo "ERROR: CRLF line endings found in the following files:"
    grep -rUIl $(printf '\r') src/ scripts/
    exit 1
else
    echo "SUCCESS: No CRLF line endings found."
fi

# 2. Check package.json scripts for known non-POSIX patterns
# This is a basic check and might need expansion.
echo "Checking package.json scripts for portability..."
# Check for use of 'set ' (Windows env var setting) instead of cross-env or standard export
if grep -q '"set ' package.json; then
    echo "WARNING: Potential Windows-specific 'set' command found in package.json."
    # grep '"set ' package.json
fi

# 3. Check shell scripts for shebang
echo "Checking shell scripts for shebang..."
for file in scripts/*.sh; do
    if [ -f "$file" ]; then
        if ! head -n 1 "$file" | grep -q "^#!/bin/sh"; then
            echo "WARNING: $file does not start with #!/bin/sh. It might not be strictly POSIX compliant."
        fi
    fi
done

echo "POSIX compatibility check passed."
exit 0
