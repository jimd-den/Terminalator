import { create } from 'zustand';
import { VisualPriority } from './VisualPriority';

interface VisualDirectorState {
  focusOwner: string | null;
  currentPriority: VisualPriority;
  reducedMotion: boolean;
  
  // Actions
  requestFocus: (id: string, priority: VisualPriority) => boolean;
  releaseFocus: (id: string) => void;
  setReducedMotion: (enabled: boolean) => void;
  reportLag: () => void;
}

export const useVisualDirector = create<VisualDirectorState>((set, get) => ({
  focusOwner: null,
  currentPriority: VisualPriority.NONE,
  reducedMotion: false,

  requestFocus: (id: string, priority: VisualPriority) => {
    const { focusOwner, currentPriority, reducedMotion } = get();

    // Circuit Breaker: Reduced Motion Rule
    // "suppressing all AMBIENT"
    if (reducedMotion && priority === VisualPriority.AMBIENT) {
        return false;
    }

    // If no owner, take it
    if (focusOwner === null) {
      set({ focusOwner: id, currentPriority: priority });
      return true;
    }

    // If already owner, keep it (and optionally upgrade priority)
    if (focusOwner === id) {
       if (priority > currentPriority) {
         set({ currentPriority: priority });
       }
       return true;
    }

    // Co-existence Strategy:
    // "FOCUS (Tutor) and CONTENT (Glyph Sessions) can animate simultaneously 
    // only if the performance budget allows (e.g., FPS > 55)."
    // For now, if current is CONTENT and new is FOCUS, we allow it.
    // If current is FOCUS and new is CONTENT, we allow it.
    const isCoexistent = (
        (priority === VisualPriority.FOCUS && currentPriority === VisualPriority.CONTENT) ||
        (priority === VisualPriority.CONTENT && currentPriority === VisualPriority.FOCUS)
    );

    if (isCoexistent && !reducedMotion) {
        // We don't change the owner, but we allow the animation.
        // Or we should support multiple owners? 
        // Spec says "The Director grants or denies permission based on current focusOwner and priority."
        // Let's allow it but keep the highest priority as current.
        if (priority > currentPriority) {
            set({ currentPriority: priority, focusOwner: id });
        }
        return true;
    }

    // Priority Battle: Higher priority takes over
    if (priority > currentPriority) {
      set({ focusOwner: id, currentPriority: priority });
      return true;
    }

    // Access Denied
    return false;
  },

  releaseFocus: (id: string) => {
    const { focusOwner } = get();
    if (focusOwner === id) {
      set({ focusOwner: null, currentPriority: VisualPriority.NONE });
    }
  },

  setReducedMotion: (enabled: boolean) => set({ reducedMotion: enabled }),

  reportLag: () => {
      // "The Director enters a reducedMotion state"
      set({ reducedMotion: true });
      
      // Immediately kill current low priority focus if active
      const { currentPriority } = get();
      if (currentPriority <= VisualPriority.AMBIENT) {
          set({ focusOwner: null, currentPriority: VisualPriority.NONE });
      }
  }
}));
