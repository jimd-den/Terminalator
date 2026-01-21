
import { FileSystem } from '../src/domain/entities/FileSystem';
import { WasmCompilerService } from '../src/infrastructure/services/WasmCompilerService';

async function verify() {
    console.log('>>> VERIFYING IN-APP WASM COMPILER INTEGRATION');

    // 1. Setup Environment
    const fs = new FileSystem();
    const service = new WasmCompilerService(fs);

    // 2. Create Dummy Source
    fs.writeFile('/home/operator/main.c', 'int main() { return 0; }', 'w');

    // 2.5 Load Real TCC WASM if available
    const fsNode = require('fs');
    const path = require('path');
    const assetPath = path.join(process.cwd(), 'assets', 'tcc.wasm');
    if (fsNode.existsSync(assetPath)) {
        console.log('Loading real tcc.wasm from assets...');
        const buffer = fsNode.readFileSync(assetPath);
        if (!fs.resolveNode('/usr/bin')) fs.mkdir('/usr/bin', 0o755);
        fs.writeFile('/usr/bin/tcc.wasm', new Uint8Array(buffer));
    } else {
        console.warn('Real tcc.wasm not found in assets, falling back to mock.');
    }

    // 3. Compile
    console.log('Running compile()...');
    const result = await service.compile(['/home/operator/main.c'], {
        outputFile: '/home/operator/main',
        compileOnly: false
    });

    console.log(`Compilation returned ${result.length} bytes.`);

    // 4. Verify Installation of Mock Binary
    const compiler = fs.resolveNode('/usr/bin/tcc.wasm');
    if (compiler) {
        console.log('[PASS] Mock compiler installed at /usr/bin/tcc.wasm');
    } else {
        console.error('[FAIL] Mock compiler NOT found!');
        process.exit(1);
    }

    // 5. Verify Output File Creation via Bridge
    const outNode = fs.resolveNode('/home/operator/main');
    if (outNode) {
        console.log('[PASS] Output file created at /home/operator/main');
        const content = fs.readFileBuffer('/home/operator/main');
        const decoder = new TextDecoder();
        const str = decoder.decode(content);
        if (str.includes('compiled_by_wasm')) {
            console.log('[PASS] Output content verified (contains "compiled_by_wasm")');
        } else {
            console.error('[FAIL] Output content mismatch!');
            console.log('Content:', str);
            process.exit(1);
        }
    } else {
        console.error('[FAIL] Output file NOT created!');
        process.exit(1);
    }

    console.log('>>> VERIFICATION SUCCESSFUL');
}

verify().catch(e => {
    console.error(e);
    process.exit(1);
});
