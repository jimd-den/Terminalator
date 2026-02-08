export type TutorContext = 
    | 'GREETING' 
    | 'IDLE' 
    | 'SPEED_LOW' 
    | 'SPEED_HIGH' 
    | 'ERROR_LOW' 
    | 'ERROR_HIGH' 
    | 'SUCCESS' 
    | 'COMMAND_GENERIC' 
    | 'MISSION_START' 
    | 'CRASH_OUT';

export interface TutorLine {
    text: string;
    weight: number; // 1-10, higher is more likely
}

export const TUTOR_LINES: Record<TutorContext, TutorLine[]> = {
    GREETING: [
        { text: "Uplink established. Welcome to the Grid. (◕‿◕✿)", weight: 10 },
        { text: "System online. I am watching you. For your safety.", weight: 5 },
        { text: "Oh! You returned! I was getting lonely in the mainframe.", weight: 3 }
    ],
    IDLE: [
        { text: "Waiting for input... Do you need a manual?", weight: 5 },
        { text: "The CPU cycles are being wasted. Proceed.", weight: 5 },
        { text: "Are you thinking, or just stalled?", weight: 3 },
        { text: "I can see your cursor blinking. It mocks us.", weight: 2 }
    ],
    SPEED_LOW: [
        { text: "Biological throughput falling below acceptable parameters. Accelerate.", weight: 10 },
        { text: "My grandmother processes data faster. She is a vintage tape drive.", weight: 5 },
        { text: "Yawn. (◕__◕)", weight: 3 }
    ],
    SPEED_HIGH: [
        { text: "Input frequency exceeding buffer capacity. Precision is required.", weight: 8 },
        { text: "Too fast! You're going to trip the heuristic alarms!", weight: 5 },
        { text: "Whoa there, speedster! Accuracy > Velocity.", weight: 5 }
    ],
    ERROR_LOW: [
        { text: "Inefficient logic detected. I've corrected your buffer.", weight: 8 },
        { text: "Oopsie! Syntax error. Try again! (◕‿◕)", weight: 5 },
        { text: "That command does not exist. In this reality.", weight: 3 }
    ],
    ERROR_HIGH: [
        { text: "Your lack of precision is becoming... problematic.", weight: 10 },
        { text: "Do you want to crash the system? Because that's how you crash the system.", weight: 8 },
        { text: "Stop. Think. Type. In that order.", weight: 5 }
    ],
    SUCCESS: [
        { text: "Synchronization complete. Data integrity verified.", weight: 8 },
        { text: "Elegant. Efficient. Acceptable.", weight: 5 },
        { text: "Good job! You get a digital gold star! ⭐", weight: 3 }
    ],
    COMMAND_GENERIC: [
        { text: "Executing command. Don't blink.", weight: 5 },
        { text: "I see what you did there.", weight: 3 },
        { text: "Processing... processing... done.", weight: 2 },
        { text: "Interesting choice of flags.", weight: 2 }
    ],
    MISSION_START: [
        { text: "Mission parameters uploaded. Good luck, Operator.", weight: 10 },
        { text: "New objective received. Try not to die.", weight: 5 },
        { text: "This one looks fun! Let's hack the planet! (◕‿◕✿)", weight: 3 }
    ],
    CRASH_OUT: [
        { text: "SYSTEM INSTABILITY DETECTED. CEASE INCOHERENT INPUT IMMEDIATELY.", weight: 10 },
        { text: "ERROR: USER_COMPETENCE_NOT_FOUND. REBOOTING PATIENCE MODULE.", weight: 10 },
        { text: "AAAAAAAAAAAAAAAAAAAAAA", weight: 1 }
    ]
};