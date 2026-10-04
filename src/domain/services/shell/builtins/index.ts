import { BuiltinRegistry } from './ShellBuiltin';
import { ColonBuiltin, TrueBuiltin, FalseBuiltin, LoopControlBuiltin, ReturnBuiltin, ExitBuiltin } from './ControlBuiltins';
import {
    ExportBuiltin, ReadonlyBuiltin, UnsetBuiltin, ShiftBuiltin, SetBuiltin, LocalBuiltin
} from './VariableBuiltins';
import { EvalBuiltin, DotBuiltin, ExecBuiltin, CommandBuiltin, TypeBuiltin, HashBuiltin } from './EvalBuiltins';
import { ReadBuiltin } from './ReadBuiltin';
import { GetoptsBuiltin } from './GetoptsBuiltin';
import { TrapBuiltin } from './TrapBuiltin';
import { AliasBuiltin, UnaliasBuiltin } from './AliasBuiltins';
import { CdBuiltin, PwdBuiltin } from './CdBuiltin';
import { ShBuiltin } from './ShBuiltin';
import { UmaskBuiltin } from './UmaskBuiltin';
import { UlimitBuiltin } from './UlimitBuiltin';
import { FcBuiltin, HistoryBuiltin } from './HistoryBuiltins';

/** The shell's builtin utilities (special builtins per XCU §2.14 plus regular builtins). */
export function createDefaultBuiltins(): BuiltinRegistry {
    return new BuiltinRegistry()
        .register(ColonBuiltin)
        .register(TrueBuiltin)
        .register(FalseBuiltin)
        .register(LoopControlBuiltin)
        .register(ReturnBuiltin)
        .register(ExitBuiltin)
        .register(ExportBuiltin)
        .register(ReadonlyBuiltin)
        .register(UnsetBuiltin)
        .register(ShiftBuiltin)
        .register(SetBuiltin)
        .register(LocalBuiltin)
        .register(EvalBuiltin)
        .register(DotBuiltin)
        .register(ExecBuiltin)
        .register(CommandBuiltin)
        .register(TypeBuiltin)
        .register(HashBuiltin)
        .register(ReadBuiltin)
        .register(GetoptsBuiltin)
        .register(TrapBuiltin)
        .register(AliasBuiltin)
        .register(UnaliasBuiltin)
        .register(CdBuiltin)
        .register(PwdBuiltin)
        .register(ShBuiltin)
        .register(UmaskBuiltin)
        .register(UlimitBuiltin)
        .register(FcBuiltin)
        .register(HistoryBuiltin);
}

export { BuiltinRegistry } from './ShellBuiltin';
export { isKeyword } from './EvalBuiltins';
