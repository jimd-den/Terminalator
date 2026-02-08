/**
 * FileSystemProvider - Presentation Layer
 * 
 * Provides global access to the simulated POSIX FileSystem.
 * Humble Delivery: Wraps the framework-agnostic CoreEngine instance.
 * 
 * Pillar: THE FOUR-FOLD SHIELD (Clean Architecture)
 * Pillar: THE HUMBLE OBJECT (React Context as Delivery Mechanism)
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { FileSystem } from '../../../domain/entities/FileSystem';
import { CoreEngine } from '../../../core/CoreEngine';

interface FileSystemContextType {
    fs: FileSystem;
}

const FileSystemContext = createContext<FileSystemContextType | undefined>(undefined);

export const FileSystemProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // Get the pre-instantiated FileSystem from CoreEngine
    const fs = CoreEngine.getInstance().getFileSystem();

    return (
        <FileSystemContext.Provider value={{ fs }}>
            {children}
        </FileSystemContext.Provider>
    );
};

export const useFileSystem = () => {
    const context = useContext(FileSystemContext);
    if (!context) {
        throw new Error('useFileSystem must be used within a FileSystemProvider');
    }
    return context;
};
