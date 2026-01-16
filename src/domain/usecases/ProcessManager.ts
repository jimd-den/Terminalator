
import { IProcess } from '../entities/Process';

/**
 * ProcessManager Use Case - Application Logic Layer
 * 
 * Manages the lifecycle of simulated processes (PIDs, states, etc.).
 * Acts as the "kernel" scheduler for tracking purposes.
 */
export class ProcessManager {
    private processes: Map<number, IProcess>;
    private nextPid: number;

    constructor() {
        this.processes = new Map();
        this.nextPid = 1;
        this.initializeSystemProcesses();
    }

    private initializeSystemProcesses() {
        // PID 1: init
        this.spawnInternal('init', [], 0, 'root', 0);
        // PID 2: kthreadd (mock kernel thread)
        this.spawnInternal('kthreadd', [], 0, 'root', 0);
    }

    /**
     * Spawns a new process entry.
     * Non-blocking in this sim (just a record), but returns the fresh PID.
     */
    public spawn(command: string, args: string[], user: string, ppid: number = 1): IProcess {
        // UID lookup stub: root=0, operator=1000
        const uid = user === 'root' ? 0 : 1000;
        return this.spawnInternal(command, args, uid, user, ppid);
    }

    private spawnInternal(command: string, args: string[], uid: number, user: string, ppid: number): IProcess {
        const pid = this.nextPid++;
        const process: IProcess = {
            pid,
            ppid,
            uid,
            user,
            command,
            args,
            startTime: new Date(),
            state: 'RUNNING',
            tty: 'pts/0' // simplified
        };
        this.processes.set(pid, process);
        return process;
    }

    /**
     * Terminates a process by PID.
     * Returns true if found and removed/marked.
     */
    public kill(pid: number, signal: string = 'SIGTERM'): boolean {
        const proc = this.processes.get(pid);
        if (!proc) return false;

        // In a real system, init (1) needs special handling
        if (pid === 1) return false; // Cannot kill init easily

        // For now, simple removal. 
        // Future: Mark as ZOMBIE until waited? keeping it simple: remove.
        this.processes.delete(pid);
        return true;
    }

    public getProcess(pid: number): IProcess | undefined {
        return this.processes.get(pid);
    }

    public list(): IProcess[] {
        return Array.from(this.processes.values());
    }
}
