function getAnimationForType(type: string) {
    if (type === 'critical') return { transform: [{ translateX: 5 }] }; // Shake
    if (type === 'warn') return { opacity: 0.5 }; // Pulse
    return {};
}

function testAnimationLogic() {
    console.log("Testing Animation Logic...");
    
    const crit = getAnimationForType('critical');
    if (!crit.transform) throw new Error("Critical should trigger transform (shake)");
    
    const warn = getAnimationForType('warn');
    if (!warn.opacity) throw new Error("Warn should trigger opacity (pulse)");
    
    const info = getAnimationForType('info');
    if (Object.keys(info).length > 0) throw new Error("Info should be stable");
    
    console.log("PASS");
}

try {
    testAnimationLogic();
    console.log("\\nALL ANIMATION LOGIC TESTS PASSED");
} catch (e) {
    console.error(`\\nTEST FAILED: ${e}`);
    process.exit(1);
}