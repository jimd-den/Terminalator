# DRY Violations Report

This report identifies significant violations of the "Don't Repeat Yourself" (DRY) principle within the codebase.

## 1. Duplicated Recursive Traversal Logic

**Files:**
- `src/domain/commands/core/ChownCommand.ts`
- `src/domain/commands/core/ChgrpCommand.ts`

**Description:**
Both commands implement nearly identical logic for recursively traversing directories and applying changes to file nodes. The `chownRecursive` and `applyChownRecursive` methods in `ChownCommand` are duplicated as `chgrpRecursive` and `applyChgrpRecursive` in `ChgrpCommand` with only minor variable name changes (passing `uid` vs ignoring it).

**Locations:**
- `src/domain/commands/core/ChownCommand.ts`: Lines 84-100 (Methods: `chownRecursive`, `applyChownRecursive`)
- `src/domain/commands/core/ChgrpCommand.ts`: Lines 64-80 (Methods: `chgrpRecursive`, `applyChgrpRecursive`)

## 2. Duplicated Destination Resolution Logic

**Files:**
- `src/domain/commands/core/CpCommand.ts`
- `src/domain/commands/core/MvCommand.ts`

**Description:**
Both commands share identical logic for resolving the destination path, checking if it is a directory, and validating that multiple source files cannot be moved/copied to a non-directory destination.

**Locations:**
- `src/domain/commands/core/CpCommand.ts`: Lines 36-47
- `src/domain/commands/core/MvCommand.ts`: Lines 36-47

## 3. Duplicated Path Resolution and Execution Loops

**Files:**
- `src/domain/commands/core/HeadCommand.ts`
- `src/domain/commands/core/TailCommand.ts`
- `src/domain/commands/core/CatCommand.ts`

**Description:**
Multiple commands implement their own ad-hoc path resolution logic to handle relative vs. absolute paths, instead of using the centralized `FileSystemService` or a shared utility. This block is copy-pasted across these files. Additionally, `HeadCommand` and `TailCommand` share nearly identical execution loops for processing multiple files and printing headers.

**Locations:**
- `src/domain/commands/core/HeadCommand.ts`:
  - Path Resolution: Lines 73-77
  - Execution Loop: Lines 66-86
- `src/domain/commands/core/TailCommand.ts`:
  - Path Resolution: Lines 99-103
  - Execution Loop: Lines 92-112
- `src/domain/commands/core/CatCommand.ts`:
  - Path Resolution: Lines 45-50

## 4. Redundant Path Utility Implementations

**Files:**
- `src/domain/commands/core/MkdirCommand.ts`
- `src/domain/commands/core/RmdirCommand.ts`
- `src/domain/services/FileSystemService.ts`

**Description:**
`MkdirCommand` implements private helper methods (`resolvePath`, `normalizePath`, `getParentPath`) that duplicate logic already present in `FileSystemService` (specifically `resolveAbsolutePath`). `RmdirCommand` also implements a standalone `resolveAbsolutePath` function that duplicates the service method.

**Locations:**
- `src/domain/commands/core/MkdirCommand.ts`: Lines 192-219 (Methods: `resolvePath`, `normalizePath`, `getParentPath`)
- `src/domain/commands/core/RmdirCommand.ts`: Lines 28-33 (Function: `resolveAbsolutePath`)
- `src/domain/services/FileSystemService.ts`: Lines 77-89 (Method: `resolveAbsolutePath`)
