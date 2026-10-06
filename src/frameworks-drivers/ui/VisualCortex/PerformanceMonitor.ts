export class PerformanceMonitor {
    private isRunning: boolean = false;
    private lastTime: number = 0;
    private rafId: number | null = null;
    private listeners: (() => void)[] = [];
    
    // Config
    private readonly LAG_THRESHOLD_MS = 33.3; // ~30 FPS
    private readonly DURATION_THRESHOLD_MS = 1000; // 1 second

    private lowFpsDuration: number = 0;

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.lowFpsDuration = 0;
        this.lastTime = performance.now();
        this.loop();
    }

    stop() {
        this.isRunning = false;
        if (this.rafId !== null) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
    }

    onLagDetected(callback: () => void) {
        this.listeners.push(callback);
    }

    private loop = () => {
        if (!this.isRunning) return;

        const now = performance.now();
        const delta = now - this.lastTime;
        
        // Skip excessively long frames (e.g. background tab resume) or first frame
        // But for lag detection, we might care? 
        // Let's just update lastTime and check delta.
        
        if (delta > 0) {
            if (delta > this.LAG_THRESHOLD_MS) {
                this.lowFpsDuration += delta;
                if (this.lowFpsDuration > this.DURATION_THRESHOLD_MS) {
                    this.notifyListeners();
                    // Reset to avoid spamming the event immediately again
                    this.lowFpsDuration = 0; 
                }
            } else {
                // Good frame reset the streak
                this.lowFpsDuration = 0;
            }
        }

        this.lastTime = now;
        this.rafId = requestAnimationFrame(this.loop);
    }

    private notifyListeners() {
        this.listeners.forEach(cb => cb());
    }
}
