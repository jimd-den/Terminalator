# Phase 1: Global Utilities & Macros Audit

## Global Utility Directories (Potential Leakage)
Found 1 'utils' directories:
- domain/utils

## Global Constants Directories
No 'constants' directories found.

## Analysis
- **Utils:** Frequent use of 'utils' folders can indicate a lack of proper abstraction or "God Classes" split into functions.
- **Constants:** Global constants are generally acceptable but should be scoped to their domain layer if specific.
