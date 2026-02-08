import { Location } from '../entities/world/Location';
import { Device } from '../entities/world/Device';
import { FileSystemService } from '../services/FileSystemService';

export interface IWorldStateProvider {
    getAllLocations(): Location[];
    getAllDevices(): Device[];
    getDeviceById(id: string): Device | undefined;
    getLocationById(id: string): Location | undefined;
    getHostFileSystem(hostname: string): FileSystemService | null;
}
