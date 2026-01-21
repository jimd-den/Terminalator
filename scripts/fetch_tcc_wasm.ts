import fs from 'fs';
import https from 'https';
import path from 'path';

const URL = 'https://raw.githubusercontent.com/lupyuen/tcc-riscv32-wasm/main/tcc-wasm.wasm';
const DEST_DIR = path.join(process.cwd(), 'assets');
const DEST_FILE = path.join(DEST_DIR, 'tcc.wasm');

if (!fs.existsSync(DEST_DIR)) {
    fs.mkdirSync(DEST_DIR);
}

console.log(`Downloading ${URL} to ${DEST_FILE}...`);

const file = fs.createWriteStream(DEST_FILE);

https.get(URL, (response) => {
    if (response.statusCode !== 200) {
        console.error(`Failed to download: ${response.statusCode} ${response.statusMessage}`);
        process.exit(1);
    }

    response.pipe(file);

    file.on('finish', () => {
        file.close();
        console.log('Download complete.');
        // Verify size
        const stats = fs.statSync(DEST_FILE);
        console.log(`File size: ${stats.size} bytes`);
        if (stats.size < 1000) {
            console.error('File too small, likely an HTML error page.');
            console.log(fs.readFileSync(DEST_FILE, 'utf8'));
        }
    });
}).on('error', (err) => {
    fs.unlink(DEST_FILE, () => { }); // Delete the file async. (But we don't check result)
    console.error('Error downloading file:', err.message);
    process.exit(1);
});
