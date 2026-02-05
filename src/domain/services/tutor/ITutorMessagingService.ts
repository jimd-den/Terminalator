import { TutorMessage } from '../../entities/tutor/TutorMessage';

export interface ITutorMessagingService {
    sendMessage(text: string, type?: TutorMessage['type'], sender?: string): Promise<void>;
    getNextMessage(): Promise<TutorMessage | null>;
    getAllMessages(): Promise<TutorMessage[]>;
    clearQueue(): Promise<void>;
}