import {
    ASTNode, NodeType, CommandNode, PipelineNode, ListNode, AsyncNode, SubshellNode, BlockNode,
    FunctionDefNode, RedirectedNode, IfNode, ForNode, WhileNode, CaseNode, RedirectNode, TimedNode
} from '../../interfaces/ShellAST';

/**
 * ShellPrinter - renders an AST back to shell source. Used for job
 * descriptions (`jobs`), `type name` on functions and `set` output.
 */
export function printNode(node: ASTNode | null | undefined, indent = ''): string {
    if (!node) return ':';
    const inner = indent + '    ';
    switch (node.type) {
        case NodeType.COMMAND: {
            const c = node as CommandNode;
            return [...c.assignments, c.command, ...c.args].filter(Boolean)
                .concat(c.redirects.map(printRedirect)).join(' ');
        }
        case NodeType.PIPELINE: {
            const p = node as PipelineNode;
            return (p.negate ? '! ' : '') + p.parts.map(n => printNode(n, indent)).join(' | ');
        }
        case NodeType.LIST: {
            const l = node as ListNode;
            const sep = l.operator === ';' ? '; ' : ` ${l.operator} `;
            return printNode(l.left, indent) + sep + printNode(l.right, indent);
        }
        case NodeType.ASYNC:
            return printNode((node as AsyncNode).body, indent) + ' &';
        case NodeType.SUBSHELL:
            return `(${printNode((node as SubshellNode).root, indent)})`;
        case NodeType.BLOCK:
            return `{\n${inner}${printNode((node as BlockNode).body, inner)}\n${indent}}`;
        case NodeType.FUNCTION_DEF: {
            const f = node as FunctionDefNode;
            return `${f.name}() ${printNode(f.body, indent)}`;
        }
        case NodeType.REDIRECTED: {
            const r = node as RedirectedNode;
            return `${printNode(r.body, indent)} ${r.redirects.map(printRedirect).join(' ')}`;
        }
        case NodeType.IF: {
            const n = node as IfNode;
            let s = `if ${printNode(n.condition, indent)}; then\n${inner}${printNode(n.thenBody, inner)}\n`;
            if (n.elseBody) s += `${indent}else\n${inner}${printNode(n.elseBody, inner)}\n`;
            return s + `${indent}fi`;
        }
        case NodeType.FOR: {
            const n = node as ForNode;
            const list = n.items ? ` in ${n.items.join(' ')}` : '';
            return `for ${n.variable}${list}; do\n${inner}${printNode(n.body, inner)}\n${indent}done`;
        }
        case NodeType.WHILE: {
            const n = node as WhileNode;
            return `${n.until ? 'until' : 'while'} ${printNode(n.condition, indent)}; do\n${inner}${printNode(n.body, inner)}\n${indent}done`;
        }
        case NodeType.CASE: {
            const n = node as CaseNode;
            const items = n.items.map(i => `${inner}${i.patterns.join(' | ')}) ${printNode(i.body, inner)} ;;`).join('\n');
            return `case ${n.word} in\n${items}\n${indent}esac`;
        }
        case NodeType.TIMED: {
            const n = node as TimedNode;
            return `time${n.posix ? ' -p' : ''}${n.body ? ' ' + printNode(n.body, indent) : ''}`;
        }
        default:
            return '';
    }
}

function printRedirect(r: RedirectNode): string {
    const fd = r.fd !== undefined ? String(r.fd) : '';
    if (r.heredoc) return `${fd}${r.op}${r.file}`;
    return `${fd}${r.op}${r.file}`;
}
