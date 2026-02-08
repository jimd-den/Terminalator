/**
 * MissionInstantiationService.ts
 *
 * Pillar: The Four-Fold Shield (Clean Architecture) - Domain Service
 * Pillar: THE MASTER'S TOOL (Metaprogramming)
 *
 * Intent:
 * The bridge between the Mission DSL (Scheme) and the Simulation Engine.
 * It takes a seed and a DSL script, expands the macros, and produces 
 * a MissionGrammar and SystemPreparationSpec.
 *
 * Design Pattern: Factory / Interpreter
 * Why: To allow missions to be defined in a high-level, expressive language 
 * (Scheme) while being consumed by a high-performance, type-safe engine (TS).
 */

import { MissionGrammar, StepRule, CommandMatcher, StepTransition } from '../../entities/mission/MissionGrammar';
import { SystemPreparationSpec } from '../../entities/world/SystemPreparationSpec';
import { MacroExpander } from '../scheme/MacroExpander';
import { SchemeParser } from '../../usecases/SchemeParser';
import { MISSION_MACROS } from '../scheme/MissionMacroDefinitions';
import { SchemeValue, listToArray, schemeToString } from '../../entities/SchemeValue';
import { SchemeVM } from '../../usecases/SchemeVM';
import { Environment } from '../../entities/Environment';
import { SchemeCompiler } from '../../usecases/SchemeCompiler';
import { getPurePrimitives } from '../../usecases/SchemePrimitives';
import { makeProcedure } from '../../entities/SchemeValue';
import { WorldPatchService } from '../world/WorldPatchService';

export interface InstantiatedMission {
    grammar: MissionGrammar;
    prepSpec: SystemPreparationSpec;
}

export class MissionInstantiationService {
    private expander: MacroExpander;
    private parser: SchemeParser;
    private vm: SchemeVM;
    private compiler: SchemeCompiler;

    constructor(private worldPatchService: WorldPatchService) {
        this.expander = new MacroExpander();
        this.parser = new SchemeParser();
        this.compiler = new SchemeCompiler();
        
        const env = new Environment();
        getPurePrimitives().forEach(p => {
            env.define(p.name, makeProcedure({
                isBuiltin: true,
                name: p.name,
                call: p.func
            }));
        });
        this.vm = new SchemeVM(env);

        this.initializeMacros();
    }

    private initializeMacros() {
        const macroExprs = this.parser.parse(MISSION_MACROS);
        macroExprs.forEach(expr => this.expander.expand(expr));
    }

    /**
     * Instantiates a mission from a Scheme DSL script.
     * 
     * @param script - The Scheme DSL code defining the mission.
     * @param hostname - The target system for the mission.
     * @returns The grammar and preparation spec.
     */
    public instantiate(script: string, hostname: string): InstantiatedMission {
        const exprs = this.parser.parse(script);
        if (exprs.length === 0) throw new Error("Empty mission script");

        // 1. Expand Macros
        const expanded = this.expander.expand(exprs[0]);

        // 2. Compile and Evaluate
        const code = this.compiler.compile(expanded);
        const result = this.vm.execute(code);

        // 3. Convert to JS Object
        const rawData = this.schemeToJS(result);

        // 4. Parse into Interfaces
        const missionData = this.parseMissionData(rawData, hostname);

        // 5. Apply World Patch (Lens 7: Experience Alignment)
        this.worldPatchService.patch(missionData.prepSpec);

        return missionData;
    }

    private schemeToJS(v: SchemeValue): any {
        switch (v.type) {
            case 'number':
            case 'string':
            case 'boolean':
                return v.value;
            case 'symbol':
                if (v.value === 'nil' || v.value === 'null') return null;
                return v.value;
            case 'null':
                return [];
            case 'pair': {
                const arr = listToArray(v);
                return arr.map(x => this.schemeToJS(x));
            }
            default:
                return null;
        }
    }

    private parseMissionData(data: any, hostname: string): InstantiatedMission {
        // Expected Structure: ['mission', archetype, initialStepId, [steps...]]
        if (!Array.isArray(data) || data[0] !== 'mission') {
            throw new Error(`Invalid mission data format: ${JSON.stringify(data)}`);
        }

        const archetype = data[1];
        const initialStepId = data[2];
        const rawSteps = data[3];

        const steps: StepRule[] = rawSteps.map((s: any) => {
            // ['step', id, type, desc, lessonText, ['matcher', ...], ['transition', ...]]
            const lessonText = s[4] === 'nil' ? undefined : s[4];
            const matcherData = s[5];
            const transData = s[6];

            const matcher: CommandMatcher = {
                type: matcherData[1],
                target: matcherData[2] === 'nil' ? undefined : matcherData[2],
                expectedValue: matcherData[3] === 'nil' ? undefined : matcherData[3],
                ruleKey: matcherData[4] === 'nil' ? undefined : matcherData[4]
            };

            const transition: StepTransition = {
                nextStepId: transData[1] === 'nil' ? undefined : transData[1],
                startLessonId: transData[2] === 'nil' ? undefined : transData[2],
                tutorIntent: transData[3] === 'nil' ? undefined : transData[3],
                tutorToneProfile: transData[4] === 'nil' ? undefined : transData[4]
            };

            return {
                id: s[1],
                stepType: s[2],
                description: s[3],
                lessonText,
                commandMatcher: matcher,
                onComplete: transition
            };
        });

        const grammar: MissionGrammar = {
            archetype,
            initialStepId,
            steps
        };

        // For Phase 3, we generate a basic prep spec based on the grammar
        // Real generation would use more complex seed-based logic
        const prepSpec: SystemPreparationSpec = {
            hostname,
            requiredDirs: ['/home/admin', '/var/log'],
            files: [],
            logs: []
        };

        return { grammar, prepSpec };
    }
}
