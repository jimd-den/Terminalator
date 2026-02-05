import { ITutorMessagingService } from './ITutorMessagingService';
import { TutorMessage } from '../../entities/tutor/TutorMessage';

export class TutorMessagingService implements ITutorMessagingService {
    private queue: TutorMessage[] = [];

    async sendMessage(text: string, type: TutorMessage['type'] = 'info', sender: string = 'TUTOR'): Promise<void> {
        this.queue.push({
            text,
            type,
            sender,
            timestamp: Date.now()
        });
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
}