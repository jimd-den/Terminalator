/**
 * ArtifactSynthesizer.ts - Domain Service
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * The Artifact Generator (The Web)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Generates text content for files (emails, logs, readmes) that contain
 * "Hyperlinks" (IP addresses, hostnames, credentials) to other nodes.
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { WorldSeed } from './WorldSeed';
import { LatticeNode } from '../../../entities/world/Lattice';

export class ArtifactSynthesizer {
    /**
     * Generates an email (mbox format) containing a link to another node.
     */
    public generateEmail(seed: WorldSeed, sender: string, targetNode: LatticeNode): string {
        const subjects = [
            "Project Update",
            "URGENT: Server migration",
            "FW: Re: Meeting notes",
            "Access credentials for the new cluster",
            "Don't forget the backup"
        ];

        const bodies = [
            `Hey, I've moved the files to the new server at ${targetNode.ip}. The hostname is ${targetNode.hostname}. Let me know if you can't get in.`,
            `The security audit is starting soon. Make sure the firewall on ${targetNode.hostname} (${targetNode.ip}) is configured correctly.`,
            `I'm sick of this legacy hardware. I've set up a mirror at ${targetNode.ip}. Use it for the next sprint.`,
            `The credentials for ${targetNode.hostname} are stored in the usual place. Remember, IP is ${targetNode.ip}.`,
            `If the main site goes down, switch to the failover node: ${targetNode.ip}.`
        ];

        return `From: ${sender.toLowerCase()}@internal.net
Subject: ${seed.pick(subjects)}
Date: ${new Date().toUTCString()}

${seed.pick(bodies)}

-- 
Sent from my Terminalator`;
    }

    /**
     * Generates a log file entry referencing another node.
     */
    public generateLogEntry(seed: WorldSeed, targetNode: LatticeNode): string {
        const events = [
            `Connection accepted from ${targetNode.ip}`,
            `Failed login attempt from ${targetNode.ip} (user: admin)`,
            `Syncing data with remote host ${targetNode.hostname} [${targetNode.ip}]`,
            `Backup complete to ${targetNode.ip}`,
            `Service heartbeat received from ${targetNode.hostname}`
        ];

        return `[${new Date().toISOString()}] INFO: ${seed.pick(events)}`;
    }

    /**
     * Generates a simple README file.
     */
    public generateReadme(seed: WorldSeed, node: LatticeNode): string {
        return `SYSTEM: ${node.hostname}
ROLE: ${node.type}
OWNER: ${node.factionId}

This system is part of the internal lattice.
Authorized access only. Unauthorized attempts will be logged.

Admin Note: If this node fails, contact the sysadmin or try connecting to the gateway.`;
    }
}
