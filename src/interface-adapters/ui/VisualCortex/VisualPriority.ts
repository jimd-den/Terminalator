/**
 * Defines the priority levels for visual elements in the Visual Cortex.
 * Higher values indicate higher priority.
 */
export enum VisualPriority {
  /** System errors, critical alerts that must be seen. overrides everything. */
  CRITICAL = 4,
  /** Modal interactions, Tutor feedback, things the user is directly interacting with. */
  FOCUS = 3,
  /** Core gameplay content like Glyph Sessions, Text typing. */
  CONTENT = 2,
  /** Background elements, particles, decoration. First to be sacrificed. */
  AMBIENT = 1,
}
