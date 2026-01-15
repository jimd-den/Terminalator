/**
 * MailSystem Use Case - Application Logic Layer
 * 
 * Manages the "unix mail" simulation.
 * NPCs send mail to the operator to initiate tasks.
 */

import { NPC } from '../entities/NPC';
import { FileSystem } from '../entities/FileSystem';
import { Logger } from '../../infrastructure/telemetry/Logger';

export interface MailMessage {
    id: string;
    from: string;
    subject: string;
    body: string;
    timestamp: string;
    isRead: boolean;
}

export class MailSystem {
    constructor(private fs: FileSystem) { }

    sendMail(npc: NPC, subject: string, body: string): MailMessage {
        return Logger.trace('MailSystem.sendMail', () => {
            const id = Math.random().toString(36).substring(2, 6);
            const message: MailMessage = {
                id,
                from: npc.name,
                subject,
                body,
                timestamp: new Date().toISOString(),
                isRead: false,
            };

            // Create a virtual file for the mail in the mail directory
            // We use createNode to ensure parent linkage is correct
            // Assuming /home/operator/mail exists as per initial state
            try {
                const mailPath = `/home/operator/mail/${id}`;
                const fileNode = this.fs.createNode(mailPath, 'file');
                fileNode.content = `From: ${npc.name}\nSubject: ${subject}\nDate: ${message.timestamp}\n\n${body}`;
                fileNode.updatedAt = message.timestamp;
                fileNode.permissions = 'rw-------';
            } catch (e) {
                Logger.error('MailSystem: Failed to create mail file', e);
            }

            return message;
        }, { npc: npc.name, subject });
    }

    listMail(): string {
        const mailDir = this.fs.root.children?.home.children?.operator.children?.mail;
        if (mailDir && mailDir.children) {
            return Object.values(mailDir.children)
                .map(m => `${m.name} - ${m.updatedAt} - NPC Transmission`)
                .join('\n');
        }
        return 'No mail.';
    }
}
