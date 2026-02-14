
import { ASTNode, NodeType } from './ShellParser';
import { TerminalState } from '../entities/TerminalState';
import { CommandResponse } from '../entities/Command';
import { FileSystemService } from './FileSystemService';
import { ShellExpansionService } from './ShellExpansionService';
import { CommandRegistry } from '../commands/CommandRegistry';
import { JobControlService } from './JobControlService';
import { IBinaryRunner } from '../interfaces/IBinaryRunner';
import { RedirectionService } from './RedirectionService';
import { FileSystem } from '../entities/FileSystem';
import { IShellExecutor } from '../interfaces/IShellExecutor';
import { NodeExecutor } from './shell/NodeExecutor';
import { NetworkMap } from './NetworkMap';

// Executors
import { CommandExecutor } from './shell/executors/CommandExecutor';
import { ListExecutor } from './shell/executors/ListExecutor';
import { PipelineExecutor } from './shell/executors/PipelineExecutor';
import { ControlFlowExecutor } from './shell/executors/ControlFlowExecutor';
import { SubshellExecutor } from './shell/executors/SubshellExecutor';
import { FunctionDefExecutor } from './shell/executors/FunctionDefExecutor';
import { BlockExecutor } from './shell/executors/BlockExecutor';
import { SimulationBus } from './SimulationBus';
import { EconomyService } from './EconomyService';

/**
 * ShellInterpreter - Core AST Traversal Engine (Refactored)
 * 
 * Uses Strategy Pattern (NodeExecutor) to handle AST nodes.
 * Adheres to OCP and SRP.
 */
export class ShellInterpreter {
    private handlerMap: Map<NodeType, NodeExecutor> = new Map();

    constructor(
        private fsService: FileSystemService,
        private fs: FileSystem,
        private registry: CommandRegistry,
        private expansionService: ShellExpansionService,
        private jobControl: JobControlService,
        private redirectionService: RedirectionService,
        private binaryRunner?: IBinaryRunner,
        private executorFactory?: () => IShellExecutor,
        private networkMap?: NetworkMap,
        private bus?: SimulationBus,
        private economy?: EconomyService
    ) {
        this.initializeExecutors();
    }

    private initializeExecutors() {
        // 1. Command Executor (Complex Dependencies)
        const cmdExec = new CommandExecutor(
            this.expansionService,
            this.registry,
            this.jobControl,
            this.fsService,
            this.fs,
            this.redirectionService,
            this.bus,
            this.binaryRunner,
            this.executorFactory,
            this.networkMap,
            this.economy
        );
        this.handlerMap.set(NodeType.COMMAND, cmdExec);

        // 2. List Executor (Stateless)
        const listExec = new ListExecutor();
        this.handlerMap.set(NodeType.LIST, listExec);

        // 3. Pipeline Executor (Stateless)
        const pipeExec = new PipelineExecutor();
        this.handlerMap.set(NodeType.PIPELINE, pipeExec);

        // 4. Control Flow Executor (Expansion Dep)
        const flowExec = new ControlFlowExecutor(this.expansionService);
        this.handlerMap.set(NodeType.IF, flowExec);
        this.handlerMap.set(NodeType.FOR, flowExec);
        this.handlerMap.set(NodeType.WHILE, flowExec);

        // 5. Structure Executors
        this.handlerMap.set(NodeType.SUBSHELL, new SubshellExecutor());
        this.handlerMap.set(NodeType.FUNCTION_DEF, new FunctionDefExecutor());
        this.handlerMap.set(NodeType.BLOCK, new BlockExecutor());
    }

    /**
     * Entry point for AST traversal.
     */
    public async visit(node: ASTNode, state: TerminalState, stdin?: string): Promise<CommandResponse> {
        const executor = this.handlerMap.get(node.type);
        if (!executor) {
            throw new Error(`Unknown AST Node Type: ${node.type}`);
        }

        // Pass 'this.visit' bound to this instance as the Visitor callback
        return executor.execute(node, state, this.visit.bind(this), stdin);
    }
}
