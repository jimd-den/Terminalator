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
  currentPriority: 0,
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
      set({ focusOwner: null, currentPriority: 0 });
    }
  },

  setReducedMotion: (enabled: boolean) => set({ reducedMotion: enabled }),

  reportLag: () => {
      // "The Director enters a reducedMotion state"
      set({ reducedMotion: true });
      
      // Immediately kill current low priority focus if active
      const { currentPriority } = get();
      if (currentPriority <= VisualPriority.AMBIENT) {
          set({ focusOwner: null, currentPriority: 0 });
      }
  }
}));
