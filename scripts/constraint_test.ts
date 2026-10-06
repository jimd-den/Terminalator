import { ComplexityEstimator } from '../src/domain/services/constraints/ComplexityEstimator';
import { ConstraintValidator } from '../src/domain/services/constraints/ConstraintValidator';
import { Mission } from '../src/domain/entities/Mission';

console.log("--- CONSTRAINT VALIDATOR TEST ---");

const estimator = new ComplexityEstimator();
const validator = new ConstraintValidator(estimator);

const mission: Mission = {
    id: 'test-mission',
    type: 'modify',
    targetSystem: 'test',
    targetUser: 'test',
    objectiveTarget: 'test',
    description: 'test',
    reward: '100',
    rewardValue: 100,
    status: 'active',
    currentStep: 'PENDING' as any,
    assignedBy: 'npc',
    assignerName: 'NPC',
    chatHistory: [],
    problemSize: 100, // n = 100
    constraints: {
        requiredComplexity: 'O(log n)',
        maxTimeMs: 100
    }
};

// Case 1: Inefficient Solution (O(n))
const statsBad = {
    iterations: 150, // 1.5 * n (linear)
    timeMs: 50,
    memoryUsed: 100
};

const resultBad = validator.validate(mission, statsBad);
console.log(`[Bad Stats] Valid: ${resultBad.valid} (Expected: false)`);
if (!resultBad.valid) console.log(`   Reason: ${resultBad.reason}`);

// Case 2: Efficient Solution (O(log n))
const statsGood = {
    iterations: 10, // log2(100) is ~6.6. Limit is ~13.
    timeMs: 10,
    memoryUsed: 100
};

const resultGood = validator.validate(mission, statsGood);
console.log(`[Good Stats] Valid: ${resultGood.valid} (Expected: true)`);
if (!resultGood.valid) console.log(`   Reason: ${resultGood.reason}`);

// Case 3: Timeout
const statsTimeout = {
    iterations: 10,
    timeMs: 200, // > 100
    memoryUsed: 100
};
const resultTimeout = validator.validate(mission, statsTimeout);
console.log(`[Timeout] Valid: ${resultTimeout.valid} (Expected: false)`);
if (!resultTimeout.valid) console.log(`   Reason: ${resultTimeout.reason}`);

console.log("--- TEST COMPLETE ---");
