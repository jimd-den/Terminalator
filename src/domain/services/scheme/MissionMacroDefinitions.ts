/**
 * MissionMacroDefinitions.ts
 * 
 * Pillar: The Master's Tool (Metaprogramming)
 * Pillar: The Storyteller’s Code (Literate Documentation)
 * 
 * Intent:
 * Provides the Scheme macro definitions for the Composable Mission DSL.
 * These macros expand high-level mission descriptions into the 
 * MissionGrammar data structure.
 */

export const MISSION_MACROS = `
(define-syntax matcher
  (syntax-rules ()
    ((matcher type target value)
     (list 'matcher type target value))
    ((matcher type target value rule)
     (list 'matcher type target value rule))))

(define-syntax transition
  (syntax-rules ()
    ((transition next-id)
     (list 'transition next-id 'NIL 'NIL 'NIL))
    ((transition next-id lesson intent)
     (list 'transition next-id lesson intent 'NIL))))

(define-syntax step
  (syntax-rules ()
    ((step id type desc lesson matcher-spec trans-spec)
     (list 'step id type desc lesson matcher-spec trans-spec))))

(define-syntax define-mission
  (syntax-rules ()
    ((define-mission archetype initial-id steps)
     (list 'mission archetype initial-id steps))))

;; Higher-level abstractions
(define-syntax expect-command
  (syntax-rules ()
    ((expect-command cmd output next)
     (step "cmd-step" 'MODIFY (string-append "Run " cmd)
           (matcher 'COMMAND_EXECUTED cmd output)
           (transition next)))))
`;
