/**
 * TutorKnowledgeBase.test.ts
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * Unit Tests for the Blackboard Pattern (KnowledgeBase)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// @ts-ignore
import { expect, test, describe, beforeEach } from "bun:test";
import { TutorKnowledgeBase } from "../src/domain/entities/knowledge/TutorKnowledgeBase";
import { KnowledgeType, KnowledgeEntity } from "../src/domain/entities/knowledge/KnowledgeEntity";

describe("TutorKnowledgeBase", () => {
    let kb: TutorKnowledgeBase;

    beforeEach(() => {
        kb = new TutorKnowledgeBase();
    });

    test("should learn and recall a path", () => {
        const entity: KnowledgeEntity = {
            type: KnowledgeType.PATH,
            value: "/etc/passwd",
            discoveredAt: Date.now(),
            source: "ls",
            isBelief: false
        };

        kb.learn(entity);
        const recalled = kb.recall(KnowledgeType.PATH);

        expect(recalled).toHaveLength(1);
        expect(recalled[0].value).toBe("/etc/passwd");
        expect(recalled[0].type).toBe(KnowledgeType.PATH);
    });

    test("should deduplicate knowledge", () => {
        const e1: KnowledgeEntity = {
            type: KnowledgeType.IP,
            value: "10.0.0.1",
            discoveredAt: 100,
            source: "net-scan",
            isBelief: true
        };
        const e2: KnowledgeEntity = {
            type: KnowledgeType.IP,
            value: "10.0.0.1",
            discoveredAt: 200,
            source: "ping",
            isBelief: true
        };

        kb.learn(e1);
        kb.learn(e2);

        const recalled = kb.recall(KnowledgeType.IP);
        expect(recalled).toHaveLength(1);
        expect(recalled[0].discoveredAt).toBe(200);
        expect(recalled[0].source).toBe("ping");
    });

    test("truth should override belief", () => {
        const belief: KnowledgeEntity = {
            type: KnowledgeType.USER,
            value: "admin",
            discoveredAt: 100,
            source: "guess",
            isBelief: true
        };
        const truth: KnowledgeEntity = {
            type: KnowledgeType.USER,
            value: "admin",
            discoveredAt: 150,
            source: "whoami",
            isBelief: false
        };

        kb.learn(belief);
        expect(kb.recall(KnowledgeType.USER)[0].isBelief).toBe(true);

        kb.learn(truth);
        expect(kb.recall(KnowledgeType.USER)[0].isBelief).toBe(false);
        expect(kb.recall(KnowledgeType.USER)[0].source).toBe("whoami");
    });

    test("should not override truth with belief", () => {
        const truth: KnowledgeEntity = {
            type: KnowledgeType.PID,
            value: "1234",
            discoveredAt: 100,
            source: "ps",
            isBelief: false
        };
        const belief: KnowledgeEntity = {
            type: KnowledgeType.PID,
            value: "1234",
            discoveredAt: 150,
            source: "guess",
            isBelief: true
        };

        kb.learn(truth);
        kb.learn(belief);

        expect(kb.recall(KnowledgeType.PID)[0].isBelief).toBe(false);
        expect(kb.recall(KnowledgeType.PID)[0].source).toBe("ps");
    });

    test("has() should correctly report knowledge existence", () => {
        expect(kb.has(KnowledgeType.IP, "1.1.1.1")).toBe(false);
        
        kb.learn({
            type: KnowledgeType.IP,
            value: "1.1.1.1",
            discoveredAt: 1,
            source: "manual",
            isBelief: false
        });

        expect(kb.has(KnowledgeType.IP, "1.1.1.1")).toBe(true);
    });
});
