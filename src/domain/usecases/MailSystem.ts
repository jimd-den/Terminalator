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

            // Create a virtual file for the mail in /home/operator/mail
            const mailDir = this.fs.root.children?.home.children?.operator.children?.mail;
            if (mailDir && mailDir.children) {
                mailDir.children[id] = {
                    name: id,
                    type: 'file',
                    content: `From: ${npc.name}\nSubject: ${subject}\nDate: ${message.timestamp}\n\n${body}`,
                    owner: 'operator',
                    permissions: 'rw-------',
                    updatedAt: message.timestamp,
                };
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
