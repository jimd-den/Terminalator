import { MissionManager } from '../src/domain/usecases/mission/MissionManager';

// Mock UI/Navigation handler
class MockNavigator {
    public currentView: string = 'DASHBOARD';
    public currentParams: any = null;
    public navigate(view: string, params?: any) { 
        this.currentView = view; 
        this.currentParams = params;
    }
}

// Mock GameManager
class MockGameManager {
    public startMission(id: string) {}
}

async function testMissionLifecycle() {
    console.log("Testing MissionManager lifecycle...");
    const navigator = new MockNavigator();
    const gameManager = new MockGameManager();
    const manager = new MissionManager(gameManager as any, navigator as any);

    // 1. Start Mission
    manager.startMission("tutorial_01");
    if (navigator.currentView !== 'Terminal' || navigator.currentParams.missionId !== 'tutorial_01') {
        throw new Error("Failed to navigate to Terminal with missionId");
    }

    // 2. Exit Mission
    manager.exitMission();
    if (navigator.currentView !== 'Terminal' || navigator.currentParams.missionId !== null) {
        throw new Error("Failed to clear missionId on exit");
    }

    console.log("PASS");
}

testMissionLifecycle()
    .then(() => console.log("\nALL MISSION CONTROL TESTS PASSED"))
    .catch((e) => {
        console.error(`\nTEST FAILED: ${e}`);
        process.exit(1);
    });