/**
 * Strategies.test.ts
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * Unit Tests for Command Generation Strategies
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// @ts-ignore
import { expect, test, describe } from "bun:test";
import { TutorKnowledgeBase } from "../src/domain/entities/knowledge/TutorKnowledgeBase";
import { KnowledgeType } from "../src/domain/entities/knowledge/KnowledgeEntity";
import { NetworkScanStrategy, FindFileStrategy } from "../src/domain/services/tutor/planner/strategies/ReconStrategies";
import { ReadFileStrategy, GrepContentStrategy } from "../src/domain/services/tutor/planner/strategies/ExfilStrategies";

describe("Tutor Strategies", () => {
    test("NetworkScanStrategy should generate valid nmap command", () => {
        const kb = new TutorKnowledgeBase();
        const strategy = new NetworkScanStrategy();
        const cmd = strategy.generateCommand(kb);
        expect(cmd).toContain("nmap");
        expect(cmd).toContain("-sn");
    });

    test("ReadFileStrategy should use known path if available", () => {
        const kb = new TutorKnowledgeBase();
        const strategy = new ReadFileStrategy();
        
        kb.learn({
            type: KnowledgeType.PATH,
            value: "/secret/key.txt",
            discoveredAt: Date.now(),
            source: "manual",
            isBelief: false
        });
        
        const cmd = strategy.generateCommand(kb);
        expect(cmd).toBe("cat /secret/key.txt");
    });

    test("FindFileStrategy should generate valid find command", () => {
        const kb = new TutorKnowledgeBase();
        const strategy = new FindFileStrategy();
        const cmd = strategy.generateCommand(kb);
        expect(cmd).toContain("find");
        expect(cmd).toContain("-name");
        expect(cmd).toContain("2>/dev/null");
    });

    test("GrepContentStrategy should search in known paths", () => {
        const kb = new TutorKnowledgeBase();
        const strategy = new GrepContentStrategy();
        
        kb.learn({
            type: KnowledgeType.PATH,
            value: "/var/www/html",
            discoveredAt: Date.now(),
            source: "manual",
            isBelief: false
        });

        const cmd = strategy.generateCommand(kb);
        expect(cmd).toContain("grep");
        expect(cmd).toContain("/var/www/html");
    });
});
