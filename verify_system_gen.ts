
import { SystemGenerator } from './src/domain/services/SystemGenerator';
import { FileSystemService } from './src/domain/services/FileSystemService';

const gen = new SystemGenerator();
const fs = gen.generate({ difficulty: 1, faction: 'military' });
const service = new FileSystemService(fs);

const hostname = service.readFile('/etc/hostname');
console.log('Hostname:', hostname);

if (hostname.includes('CMD') || hostname.includes('TAC') || hostname.includes('DEF')) {
    console.log('SUCCESS: Military theme applied.');
    process.exit(0);
} else {
    console.error('FAILURE: Theme not applied.');
    process.exit(1);
}
