/**
 * VariableTemplateEngine.ts - Domain Service
 * 
 * Logic for rendering dynamic dialogue by replacing placeholders with
 * context variables (e.g., {utility}, {path}, {motive}).
 * 
 * Pillar: THE STORYTELLER'S CODE (Dynamic Dialogue)
 */

export class VariableTemplateEngine {
    /**
     * Renders a template string using the provided variables.
     * e.g. "I see you failed {utility}." -> "I see you failed grep."
     */
    public static render(template: string, variables: Record<string, string>): string {
        return template.replace(/\{(\w+)\}/g, (match, key) => {
            return variables[key] ?? match;
        });
    }
}
