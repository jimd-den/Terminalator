/**
 * MailSystem Use Case - Application Logic Layer
 * 
 * Manages the "unix mail" simulation.
 * NPCs send mail to the operator to initiate tasks.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Watchman’s Log (Telemetry)
 * Pillar: The Storyteller’s Code (Literate Documentation)
 */

import { NPC } from '../entities/NPC';
import { FileSystem } from '../entities/FileSystem';
import { TelemetryPort } from '../ports/TelemetryPort';

export interface MailMessage {
    id: string;
    from: string;
    subject: string;
    body: string;
    timestamp: string;
    isRead: boolean;
}

export class MailSystem {
    constructor(private fs: FileSystem, private telemetry?: TelemetryPort) { }

    /**
     * Sends a mail message from an NPC to the operator.
     * Creates a file in the simulated filesystem.
     *
     * @param npc - The NPC sending the message.
     * @param subject - The subject line of the email.
     * @param body - The body content of the email.
     * @returns The created MailMessage object.
     */
    sendMail(npc: NPC, subject: string, body: string): MailMessage {
        const sendLogic = () => {
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
                const targetFS = fs || this.fs;
                const mailDir = '/home/operator/mail';
                if (!targetFS.resolveNode(mailDir)) {
                    targetFS.mkdir(mailDir, 0o700, 1000, 1000, '/');
                }

                const mailPath = `${mailDir}/${id}`;
                const content = `From: ${npc.name}\nSubject: ${subject}\nDate: ${message.timestamp}\n\n${body}`;

                // Write file (this handles creation and content)
                targetFS.writeFile(mailPath, content, 'w', '/');
                // Set permissions to rw------- (600)
                targetFS.chmod(mailPath, 0o600, '/');

                // We assume ownership is handled by context usually, but here system is writing.
                // Could chown to operator (1000:1000)
                targetFS.chown(mailPath, 1000, 1000, '/');

            } catch (e) {
                Logger.error('MailSystem: Failed to create mail file', e);
            }

            return message;
        };

        if (this.telemetry) {
            // Passing context arguments clearly to trace
            return this.telemetry.trace('MailSystem.sendMail', sendLogic, { npc: npc.name, subject });
        }

        return sendLogic();
    }

    /**
     * Lists all mail messages available in the operator's mail directory.
     *
     * @returns A string representation of the mail list.
     */
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
