import { KnuthianMissionFactory } from '../src/domain/factories/KnuthianMissionFactory';
import { OrganizationGenerator } from '../src/domain/services/generation/OrganizationGenerator';
import { NPC } from '../src/domain/entities/NPC';

async function testKnuthianMissions() {
    console.log("--- KNUTHIAN MISSION TEST ---");

    const orgGen = new OrganizationGenerator();
    const missionFactory = new KnuthianMissionFactory();

    // 1. Generate Context
    const seed = 'test-seed';
    const employer = orgGen.generateFaction(seed + '_EMP');
    const target = orgGen.generateFaction(seed + '_TGT');
    target.assets.push('remote-mainframe'); // Ensure target has assets

    const npc: NPC = {
        id: 'knuth-npc',
        name: 'Donald',
        origin: 'Stanford',
        career: 'Professor',
        loadout: [],
        goal: 'Teach',
        status: 'active',
        traits: []
    };

    console.log(`Employer: ${employer.name} (${employer.type})`);
    console.log(`Target: ${target.name} (${target.type})`);

    // 2. Generate Sorting Mission
    console.log("\n[1] Generating Sorting Mission...");
    const sortMission = missionFactory.createSortingMission(npc, employer, target);
    console.log(`Mission ID: ${sortMission.id}`);
    console.log(`Description: ${sortMission.description}`);
    console.log(`Complexity: ${sortMission.constraints?.requiredComplexity}`);
    
    if (sortMission.constraints?.requiredComplexity === 'O(log n)') { // Sort requires O(n log n), mapped to log n bucket for now
        console.log("PASSED: Constraint set correctly.");
    } else {
        console.error(`FAILED: Unexpected constraint ${sortMission.constraints?.requiredComplexity}`);
    }

    // 3. Generate Search Mission
    console.log("\n[2] Generating Search Mission...");
    const searchMission = missionFactory.createSearchMission(npc, employer, target);
    console.log(`Mission ID: ${searchMission.id}`);
    console.log(`Description: ${searchMission.description}`);
    console.log(`Complexity: ${searchMission.constraints?.requiredComplexity}`);

    if (searchMission.constraints?.requiredComplexity === 'O(log n)') {
        console.log("PASSED: Constraint set correctly.");
    } else {
        console.error(`FAILED: Unexpected constraint ${searchMission.constraints?.requiredComplexity}`);
    }

    console.log("\n--- TEST COMPLETED ---");
}

testKnuthianMissions().catch(console.error);
