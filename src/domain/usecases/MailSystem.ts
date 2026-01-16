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
            // Assuming /home/operator/mail exists
            try {
                const mailPath = `/home/operator/mail/${id}`;
                const content = `From: ${npc.name}\nSubject: ${subject}\nDate: ${message.timestamp}\n\n${body}`;

                // Write file (this handles creation and content)
                this.fs.writeFile(mailPath, content, 'w', '/');
                // Set permissions to rw------- (600)
                this.fs.chmod(mailPath, 0o600, '/');

                // We assume ownership is handled by context usually, but here system is writing.
                // Could chown to operator (1000:1000)
                this.fs.chown(mailPath, 1000, 1000, '/');

            } catch (e) {
                Logger.error('MailSystem: Failed to create mail file', e);
            }

            return message;
        }, { npc: npc.name, subject });
    }

    listMail(): string {
        // Resolve mail directory
        const mailDirNode = this.fs.resolveNode('/home/operator/mail');
        if (mailDirNode && this.fs.isDirectory(mailDirNode)) {
            const messages: string[] = [];
            for (const [name, childNode] of mailDirNode.children) {
                const inode = this.fs.getInode(childNode.inodeId);
                // Format: ID - Date - From (extracted from content?) or just generic
                // For now, let's keep it simple as before
                const dateStr = inode ? new Date(inode.mtime).toISOString() : 'Unknown';
                messages.push(`${name} - ${dateStr} - NPC Transmission`);
            }
            if (messages.length > 0) return messages.join('\n');
        }
        return 'No mail.';
    }
}
