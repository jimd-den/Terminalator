
// Mock RAF and Performance
let now = 0;
let rafId = 0;
const callbacks: FrameRequestCallback[] = [];

// @ts-ignore
if (!global.performance) {
    // @ts-ignore
    global.performance = { now: () => now };
} else {
    // @ts-ignore
    global.performance.now = () => now;
}

// @ts-ignore
global.requestAnimationFrame = (cb) => {
    const id = ++rafId;
    callbacks.push(cb);
    return id;
};

// @ts-ignore
global.cancelAnimationFrame = (id) => {
    // simplified
};

// Helper to advance time and flush frame
function advanceFrame(ms: number) {
    now += ms;
    const pending = [...callbacks];
    callbacks.length = 0;
    pending.forEach(cb => cb(now));
}

// @ts-ignore - Module will be created
import { PerformanceMonitor } from '../src/frameworks-drivers/ui/VisualCortex/PerformanceMonitor';

async function testPerformanceMonitor() {
    console.log("Testing PerformanceMonitor...");

    const monitor = new PerformanceMonitor();
    let lagReported = false;
    monitor.onLagDetected(() => {
        lagReported = true;
        console.log("Lag detected event received.");
    });

    // Start
    monitor.start();

    // Simulate good FPS (16ms = ~60fps)
    // Need to pump a few frames to initialize
    advanceFrame(0);
    
    for (let i = 0; i < 60; i++) {
        advanceFrame(16.6);
    }

    if (lagReported) throw new Error("Lag reported incorrectly during good FPS");

    // Simulate bad FPS (40ms = 25fps) for 1 second
    // Threshold is 30fps. 30fps = 33.3ms per frame.
    // If we do 40ms, it's < 30fps.
    
    console.log("Simulating Lag...");
    // 35 frames at 40ms = 1400ms
    for (let i = 0; i < 35; i++) {
        advanceFrame(40);
        // Maybe the monitor checks every second?
    }

    if (!lagReported) throw new Error("Lag NOT reported after sustained low FPS");

    monitor.stop();
    console.log("PASS");
}

testPerformanceMonitor().catch(e => {
    console.error(`FAIL: ${e.message}`);
    process.exit(1);
});
