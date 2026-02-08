import { ITutorMessagingService } from './ITutorMessagingService';
import { TutorMessage } from '../../entities/tutor/TutorMessage';

export class TutorMessagingService implements ITutorMessagingService {
    private queue: TutorMessage[] = [];
    private listeners: (() => void)[] = [];

    async sendMessage(text: string, type: TutorMessage['type'] = 'info', sender: string = 'TUTOR'): Promise<void> {
        this.queue.push({
            text,
            type,
            sender,
            timestamp: Date.now()
        });
        this.notify();
    }

    async getNextMessage(): Promise<TutorMessage | null> {
        return this.queue.shift() || null;
    }

    async getAllMessages(): Promise<TutorMessage[]> {
        return [...this.queue];
    }

    async clearQueue(): Promise<void> {
        this.queue = [];
    }

    public subscribe(listener: () => void): () => void {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private notify() {
        this.listeners.forEach(l => l());
    }
}