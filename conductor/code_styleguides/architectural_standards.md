# Architectural & Development Standards

## Core Mandates
- **Clean Architecture:** All code must adhere to Clean Architecture principles (Entities, Use Cases, Interface Adapters, Frameworks/Drivers). Layers must be strictly decoupled.
- **SOLID Principles:** Every modification and new feature must respect SOLID design principles.
- **KISS & DRY:** Keep it Simple, Stupid. Don't Repeat Yourself. Always look for simplification and refactoring opportunities to reduce duplication without over-engineering.

## Development Workflow
- **Test-First TDD:** We ALWAYS write tests before implementation. No feature code should be written without a failing test first.
- **Test-Driven Refactoring:** Use the Red-Green-Refactor cycle to ensure code quality and architectural integrity.
