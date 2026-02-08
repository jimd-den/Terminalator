import { WorldGenerator } from '../src/domain/services/generation/WorldGenerator';

console.log("--- WORLD GENERATOR TEST ---");

const generator = new WorldGenerator();
const seed = 'station-alpha-' + Date.now();
console.log(`Generating world with seed: ${seed}\n`);

const world = generator.generateStation(seed);

console.log(`Stats:`);
console.log(`- Locations: ${world.locations.length}`);
console.log(`- Devices: ${world.devices.length}`);
console.log(`- Connections: ${world.connections.length}\n`);

console.log("--- LAYOUT ---");
world.locations.forEach(loc => {
    console.log(`[${loc.type}] ${loc.name} (${loc.id})`);
    console.log(`   Host: ${loc.controllingHost || 'N/A'}`);
    
    // Find devices in this location
    const devices = world.devices.filter(d => d.locationId === loc.id);
    if (devices.length > 0) {
        console.log(`   Devices:`);
        devices.forEach(d => console.log(`     - ${d.name} (${d.type}) -> ${d.path}`));
    }

    // Find connections from this location
    const connections = world.connections.filter(c => c.fromId === loc.id);
    if (connections.length > 0) {
        console.log(`   Connections:`);
        connections.forEach(c => {
            const target = world.locations.find(l => l.id === c.toId);
            console.log(`     -> ${target?.name}`);
        });
    }
    console.log('');
});
