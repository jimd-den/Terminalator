import { Location } from '../entities/world/Location';
import { Device } from '../entities/world/Device';

export interface IWorldStateProvider {
    getAllLocations(): Location[];
    getAllDevices(): Device[];
    getDeviceById(id: string): Device | undefined;
    getLocationById(id: string): Location | undefined;
}
