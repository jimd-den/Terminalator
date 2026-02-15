import React, { createContext, useContext, useState, useRef, useCallback, useEffect, ReactNode } from 'react';
import { TextInput, AppState, AppStateStatus } from 'react-native';
import { useTheme } from './ThemeContext';

/**
 * InputContext - Presentation Layer
 * 
 * Provides a global mechanism to capture and route keyboard input.
 * Allows components (Shell, Vim) to consume input without managing their own TextInputs.
 */

export interface InputContextType {
    // The current value of the hidden input (useful for debug or specialized use)
    inputValue: string;
    // Force the hidden input to regain focus
    refocus: () => void;
    // Register a handler for text input (characters)
    setOnInput: (handler: (text: string) => void) => void;
    // Register a handler for special keys (Backspace, Enter, arrows if captured)
    setOnKeyPress: (handler: (key: string) => void) => void;
    // Global input lock state
    isLocked: boolean;
    // Set global input lock state
    setInputLocked: (locked: boolean) => void;
}

const InputContext = createContext<InputContextType | undefined>(undefined);

export const InputProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { settings } = useTheme();
    const inputRef = useRef<TextInput>(null);
    // Initialize with a space to detect backspace
    const [inputValue, setInputValue] = useState(' ');
    const lastValue = useRef(' ');
    const [isLocked, setInputLocked] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

    // Handlers
    const onInputRef = useRef<((text: string) => void) | null>(null);
    const onKeyPressRef = useRef<((key: string) => void) | null>(null);

    const refocus = useCallback(() => {
        // Increased delay ensures layout transitions (Comms/Settings/Shell) 
        // are complete before focusing to prevent keyboard dismissal.
        setTimeout(() => {
            inputRef.current?.focus();
        }, 150);
    }, []);

    // Keep focus alive
    useEffect(() => {
        const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
            if (nextAppState === 'active') {
                refocus();
            }
        });

        // Dynamic heartbeat: Safety net for focus loss
        // We use a much slower interval to avoid fighting with OS keyboard state
        const intervalTime = settings.forceKeyboardOpen ? 2000 : 5000;
        const interval = setInterval(() => {
            // Only refocus if we think we are not focused and it's forced
            if (settings.forceKeyboardOpen && !isFocused) {
                refocus();
            }
        }, intervalTime);

        refocus();

        return () => {
            subscription.remove();
            clearInterval(interval);
        };
    }, [refocus, settings.forceKeyboardOpen, isFocused]);

    const handleFocus = () => setIsFocused(true);

    const handleBlur = () => {
        setIsFocused(false);
        if (settings.forceKeyboardOpen) {
            refocus();
        }
    };

    const handleTextChange = (text: string) => {
        if (isLocked) {
            // Keep buffer stable if locked
            lastValue.current = ' ';
            setInputValue(' ');
            return;
        }

        const prev = lastValue.current;

        // 1. Handle Sentinel Deletion (Backspace on empty buffer)
        if (text.length === 0) {
            if (onKeyPressRef.current) onKeyPressRef.current('BACKSPACE');
            lastValue.current = ' ';
            setInputValue(' ');
            return;
        }

        // 2. Handle Append (Normal Typing)
        if (text.startsWith(prev)) {
            const added = text.slice(prev.length);
            if (added.length > 0) {
                if (onInputRef.current) onInputRef.current(added);
            }
            lastValue.current = text;
            setInputValue(text);

            // Clean up buffer if it gets too long (prevent lag)
            if (text.length > 100) {
                lastValue.current = ' ';
                setInputValue(' ');
            }
            return;
        }

        // 3. Handle Deletion (Backspace on existing buffer)
        if (prev.startsWith(text)) {
            const deletedCount = prev.length - text.length;
            for (let i = 0; i < deletedCount; i++) {
                if (onKeyPressRef.current) onKeyPressRef.current('BACKSPACE');
            }
            lastValue.current = text;
            setInputValue(text);
            return;
        }

        // 4. Content Replacement/Mismatch (Cursor move, paste, or weird sync)
        // Fallback: Clear buffer to safe state to avoid garbage
        lastValue.current = ' ';
        setInputValue(' ');
    };


    // Debounce Enter to avoid double-firing (onKeyPress + onSubmitEditing)
    const lastEnterTime = useRef(0);
    const fireEnter = () => {
        if (isLocked) return;

        const now = Date.now();
        if (now - lastEnterTime.current < 50) return;
        lastEnterTime.current = now;

        if (onKeyPressRef.current) onKeyPressRef.current('ENTER');
        // Check if we should clear buffer on Enter
        lastValue.current = ' ';
        setInputValue(' ');
    };

    const handleKeyPressEvent = (e: any) => {
        if (isLocked) return;

        const key = e.nativeEvent.key;

        // On Android, soft keyboard Backspace often only triggers onChangeText (deletion).
        // Using the sentinel strategy (space) allows capturing usage of backspace even when empty.
        // We ignore 'Backspace' here to avoid duplicate events, relying on onChangeText handling.

        if (key === 'Enter') {
            fireEnter();
            return;
        }

        // Capture other navigation/special keys
        if (key.length > 1 && key !== 'Backspace') {
            if (onKeyPressRef.current) onKeyPressRef.current(key.toUpperCase());
        }
    };

    const setOnInput = useCallback((handler: (text: string) => void) => {
        onInputRef.current = handler;
    }, []);

    const handleSubmitEditing = () => {
        // Capture soft-keyboard submit as Enter
        fireEnter();
    };

    const setOnKeyPress = useCallback((handler: (key: string) => void) => {
        onKeyPressRef.current = handler;
    }, []);

    return (
        <InputContext.Provider value={{ inputValue, refocus, setOnInput, setOnKeyPress, isLocked, setInputLocked }}>
            {/* The Hidden Global Input */}
            <TextInput
                ref={inputRef}
                style={{ 
                    position: 'absolute', 
                    bottom: 0, // Position at bottom so OS knows to clear keyboard
                    left: 0, 
                    right: 0,
                    height: 80, // Approximate height of the command area
                    opacity: 0.01,
                    zIndex: -1 
                }}
                value={inputValue}
                onChangeText={handleTextChange}
                onKeyPress={handleKeyPressEvent}
                onSubmitEditing={handleSubmitEditing}
                onFocus={handleFocus}
                onBlur={handleBlur}
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus={true}
                blurOnSubmit={false}
                multiline={false}
                caretHidden={true}
                returnKeyType="done"
                // Force cursor to end to properly append text
                selection={{ start: inputValue.length, end: inputValue.length }}
            />
            {children}
        </InputContext.Provider>
    );
};

export const useInput = () => {
    const context = useContext(InputContext);
    if (!context) {
        throw new Error('useInput must be used within an InputProvider');
    }
    return context;
};
