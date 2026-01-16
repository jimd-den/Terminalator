
/**
 * IProcess Entity - Domain Layer
 * 
 * Represents a running process in the simulated operating system.
 */
export interface IProcess {
    pid: number;
    ppid: number;
    uid: number;
    user: string;
    command: string;
    args: string[];
    startTime: Date;
    state: 'RUNNING' | 'SLEEPING' | 'STOPPED' | 'ZOMBIE';
    tty: string;
}
