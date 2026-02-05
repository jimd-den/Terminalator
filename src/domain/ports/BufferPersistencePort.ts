/**
 * BufferPersistencePort - Domain Layer Port
 * 
 * Interface for saving and loading buffer content.
 * 
 * Pillar: THE FOUR-FOLD SHIELD (Dependency Inversion)
 */
export interface BufferPersistencePort {
    /**
     * Saves the content to the specified path.
     */
    save(path: string, content: string): void;
}
