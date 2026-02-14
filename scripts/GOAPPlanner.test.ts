/**
 * GOAPPlanner.test.ts
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * Unit Tests for the GOAP Planning Engine
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// @ts-ignore
import { expect, test, describe } from "bun:test";
import { GOAPPlanner } from "../src/domain/services/tutor/planner/GOAPPlanner";
import { IPlannerAction, PlannerState } from "../src/domain/services/tutor/planner/IPlannerAction";
import { KnowledgeType } from "../src/domain/entities/knowledge/KnowledgeEntity";

/**
 * Concrete implementation of IPlannerAction for testing purposes.
 */
class MockAction implements IPlannerAction {
    constructor(
        public readonly name: string,
        public readonly cost: number,
        private readonly req: KnowledgeType[],
        private readonly prov: KnowledgeType[]
    ) {}

    public isSatisfiedBy(state: PlannerState): boolean {
        return this.req.every(t => state.knownTypes.has(t));
    }

    public applyEffects(state: PlannerState): PlannerState {
        const nextTypes = new Set(state.knownTypes);
        this.prov.forEach(t => nextTypes.add(t));
        return {
            knownTypes: nextTypes,
            knownValues: new Set(state.knownValues),
            knownTools: new Set(state.knownTools)
        };
    }
}

describe("GOAPPlanner", () => {
    test("should find a simple 1-step plan", () => {
        const planner = new GOAPPlanner();
        const start: PlannerState = { 
            knownTypes: new Set(), 
            knownValues: new Set(),
            knownTools: new Set()
        };
        const goal: PlannerState = { 
            knownTypes: new Set([KnowledgeType.IP]), 
            knownValues: new Set(),
            knownTools: new Set()
        };
        
        const scanAction = new MockAction("Scan", 1, [], [KnowledgeType.IP]);
        
        const plan = planner.plan(start, goal, [scanAction]);
        
        expect(plan).not.toBeNull();
        expect(plan).toHaveLength(1);
        expect(plan![0].name).toBe("Scan");
    });

    test("should find a multi-step plan: Scan -> List -> Read", () => {
        const planner = new GOAPPlanner();
        const start: PlannerState = { 
            knownTypes: new Set(), 
            knownValues: new Set(),
            knownTools: new Set()
        };
        const goal: PlannerState = { 
            // METADATA represents the "content" of the goal file
            knownTypes: new Set([KnowledgeType.METADATA]), 
            knownValues: new Set(),
            knownTools: new Set()
        };

        const actions = [
            new MockAction("ScanNetwork", 1, [], [KnowledgeType.IP]),
            new MockAction("ListFiles", 1, [KnowledgeType.IP], [KnowledgeType.PATH]),
            new MockAction("ReadFile", 1, [KnowledgeType.PATH], [KnowledgeType.METADATA]),
            // Distractor action with high cost
            new MockAction("HardWay", 100, [], [KnowledgeType.METADATA])
        ];

        const plan = planner.plan(start, goal, actions);
        
        expect(plan).not.toBeNull();
        expect(plan).toHaveLength(3);
        expect(plan![0].name).toBe("ScanNetwork");
        expect(plan![1].name).toBe("ListFiles");
        expect(plan![2].name).toBe("ReadFile");
    });

    test("should return null if no path exists", () => {
        const planner = new GOAPPlanner();
        const start: PlannerState = { knownTypes: new Set(), knownValues: new Set(), knownTools: new Set() };
        const goal: PlannerState = { knownTypes: new Set([KnowledgeType.USER]), knownValues: new Set(), knownTools: new Set() };
        
        const action = new MockAction("Useless", 1, [], [KnowledgeType.IP]);
        
        const plan = planner.plan(start, goal, [action]);
        
        expect(plan).toBeNull();
    });

    test("should prefer lower cost paths", () => {
        const planner = new GOAPPlanner();
        const start: PlannerState = { knownTypes: new Set(), knownValues: new Set(), knownTools: new Set() };
        const goal: PlannerState = { knownTypes: new Set([KnowledgeType.PATH]), knownValues: new Set(), knownTools: new Set() };

        const actions = [
            // Option A: 1 step, high cost
            new MockAction("ExpensiveShortcut", 10, [], [KnowledgeType.PATH]),
            // Option B: 2 steps, low total cost
            new MockAction("CheapStep1", 1, [], [KnowledgeType.IP]),
            new MockAction("CheapStep2", 1, [KnowledgeType.IP], [KnowledgeType.PATH])
        ];

        const plan = planner.plan(start, goal, actions);
        
        expect(plan).not.toBeNull();
        expect(plan).toHaveLength(2);
        expect(plan![0].name).toBe("CheapStep1");
        expect(plan![1].name).toBe("CheapStep2");
    });
});
