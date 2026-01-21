import fs from 'fs';
import path from 'path';

const wasmPath = path.join(process.cwd(), 'assets', 'tcc.wasm');
console.log(`Inspecting ${wasmPath}...`);

try {
    const buffer = fs.readFileSync(wasmPath);
    const mod = new WebAssembly.Module(buffer);

    console.log('\n--- IMPORTS ---');
    const imports = WebAssembly.Module.imports(mod);
    imports.forEach(i => {
        console.log(`  ${i.module}.${i.name} (${i.kind})`);
    });

    console.log('\n--- EXPORTS ---');
    const exports = WebAssembly.Module.exports(mod);
    exports.forEach(e => {
        console.log(`  ${e.name} (${e.kind})`);
    });

} catch (e) {
    console.error('Error inspecting WASM:', e);
}
