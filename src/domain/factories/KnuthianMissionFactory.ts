/**
 * KnuthianMissionFactory.ts - Domain Factory
 * 
 * Generates missions based on "The Art of Computer Programming".
 * Challenges specifically target algorithmic concepts.
 * 
 * Volume 1: Fundamental Algorithms (Information structures)
 * Volume 2: Seminumerical Algorithms (Random numbers, Arithmetic)
 * Volume 3: Sorting and Searching
 * 
 * Pillar: The Master's Tool
 */

import { Mission, MissionStep } from '../entities/Mission';
import { NPC } from '../entities/NPC';
import { Organization } from '../entities/world/Organization';
import { JobTemplate } from '../entities/world/JobTemplate';

export class KnuthianMissionFactory {
    
    public createSortingMission(npc: NPC, employer: Organization, target: Organization): Mission {
        const id = `K-SORT-${Date.now().toString(36)}`;
        const problemSize = 1000 + Math.floor(Math.random() * 9000); // 1k - 10k records

        return {
            id,
            type: 'log-analysis', // Reusing archetype for now, but context implies sorting
            targetSystem: target.assets[0] || 'archive-server-01',
            targetUser: 'admin',
            objectiveTarget: 'employee_records.db',
            description: `CONTRACT: ${employer.name} has acquired unorganized personnel files from ${target.name}. 
            The data is unsorted. We need to merge it with our master file.
            OBJECTIVE: Sort the remote record file (${problemSize} entries) by ID. 
            CONSTRAINT: Efficiency is paramount. O(n^2) bubble sorts will timeout. Use O(n log n).`,
            reward: `${employer.wealth / 1000} Credits`,
            status: 'pending',
            currentStep: MissionStep.PENDING,
            assignedBy: npc.id,
            assignerName: npc.name,
            chatHistory: [],
            problemSize: problemSize,
            constraints: {
                requiredComplexity: 'O(log n)', // Actually O(n log n) for sort, but let's map it roughly
                maxTimeMs: 5000
            },
            metadata: {
                searchTerm: "SORT_REQUIRED"
            }
        };
    }

    public createSearchMission(npc: NPC, employer: Organization, target: Organization): Mission {
        const id = `K-SEARCH-${Date.now().toString(36)}`;
        const problemSize = 100000; // 100k records

        return {
            id,
            type: 'log-analysis',
            targetSystem: target.assets[0] || 'mainframe-01',
            targetUser: 'root',
            objectiveTarget: 'transaction_log.dat',
            description: `CONTRACT: Find the single fraudulent transaction in ${target.name}'s ledger.
            The ledger contains ${problemSize} sorted entries.
            OBJECTIVE: Locate Transaction ID #BAD-BEEF.
            CONSTRAINT: Linear search will take too long. You must use Binary Search.`,
            reward: '5000 Credits',
            status: 'pending',
            currentStep: MissionStep.PENDING,
            assignedBy: npc.id,
            assignerName: npc.name,
            chatHistory: [],
            problemSize: problemSize,
            constraints: {
                requiredComplexity: 'O(log n)',
                maxTimeMs: 2000
            },
            metadata: {
                searchTerm: "BAD-BEEF"
            }
        };
    }
}
