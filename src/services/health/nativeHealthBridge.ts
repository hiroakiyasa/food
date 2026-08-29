import { Platform } from 'react-native';

export interface HealthData {
  date: string;
  steps?: number;
  activeEnergyKcal?: number;
  restingHeartRate?: number;
  sleepHours?: number;
  weight?: number;
}

export interface HealthBridge {
  isAvailable(): Promise<boolean>;
  requestPermissions(): Promise<boolean>;
  getSteps(startDate: Date, endDate: Date): Promise<number | null>;
  getActiveEnergy(startDate: Date, endDate: Date): Promise<number | null>;
  getRestingHeartRate(startDate: Date, endDate: Date): Promise<number | null>;
  getSleepHours(startDate: Date, endDate: Date): Promise<number | null>;
  getWeight(): Promise<number | null>;
  disconnect(): Promise<void>;
}

// NoOp bridge for unsupported platforms and Expo Go
class NoOpHealthBridge implements HealthBridge {
  private mockEnabled: boolean;

  constructor(enableMock = false) {
    this.mockEnabled = enableMock;
  }

  async isAvailable(): Promise<boolean> {
    return this.mockEnabled;
  }

  async requestPermissions(): Promise<boolean> {
    return this.mockEnabled;
  }

  async getSteps(): Promise<number | null> {
    return this.mockEnabled ? 8500 : null;
  }

  async getActiveEnergy(): Promise<number | null> {
    return this.mockEnabled ? 350 : null;
  }

  async getRestingHeartRate(): Promise<number | null> {
    return this.mockEnabled ? 68 : null;
  }

  async getSleepHours(): Promise<number | null> {
    return this.mockEnabled ? 7.2 : null;
  }

  async getWeight(): Promise<number | null> {
    return this.mockEnabled ? 65.5 : null;
  }

  async disconnect(): Promise<void> {}
}

/* eslint-disable @typescript-eslint/no-explicit-any */
// iOS HealthKit bridge (requires EAS Build)
// Uses `any` for native module interop since react-native-health types
// don't perfectly align with runtime behavior
class AppleHealthBridge implements HealthBridge {
  private kit: any = null;

  private async getKit(): Promise<any> {
    if (this.kit) return this.kit;
    try {
      const mod = require('react-native-health');
      this.kit = mod.default ?? mod;
      return this.kit;
    } catch {
      return null;
    }
  }

  async isAvailable(): Promise<boolean> {
    const kit = await this.getKit();
    if (!kit) return false;
    return new Promise((resolve) => {
      kit.isAvailable((err: any, available: boolean) => {
        resolve(!err && available);
      });
    });
  }

  async requestPermissions(): Promise<boolean> {
    const kit = await this.getKit();
    if (!kit) return false;

    const permissions = {
      permissions: {
        read: [
          kit.Constants?.Permissions?.Steps ?? 'Steps',
          kit.Constants?.Permissions?.ActiveEnergyBurned ?? 'ActiveEnergyBurned',
          kit.Constants?.Permissions?.RestingHeartRate ?? 'RestingHeartRate',
          kit.Constants?.Permissions?.SleepAnalysis ?? 'SleepAnalysis',
          kit.Constants?.Permissions?.Weight ?? 'Weight',
        ],
        write: [],
      },
    };

    return new Promise((resolve) => {
      kit.initHealthKit(permissions, (err: any) => {
        resolve(!err);
      });
    });
  }

  async getSteps(startDate: Date, endDate: Date): Promise<number | null> {
    const kit = await this.getKit();
    if (!kit) return null;
    return new Promise((resolve) => {
      kit.getStepCount(
        { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
        (err: any, results: any) => {
          resolve(err ? null : results?.value ?? null);
        },
      );
    });
  }

  async getActiveEnergy(startDate: Date, endDate: Date): Promise<number | null> {
    const kit = await this.getKit();
    if (!kit) return null;
    return new Promise((resolve) => {
      kit.getActiveEnergyBurned(
        { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
        (err: any, results: any[]) => {
          if (err || !results?.length) return resolve(null);
          const total = results.reduce((sum: number, r: any) => sum + (r.value ?? 0), 0);
          resolve(total);
        },
      );
    });
  }

  async getRestingHeartRate(startDate: Date, endDate: Date): Promise<number | null> {
    const kit = await this.getKit();
    if (!kit) return null;
    return new Promise((resolve) => {
      kit.getRestingHeartRate(
        { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
        (err: any, results: any[]) => {
          if (err || !results?.length) return resolve(null);
          resolve(results[results.length - 1].value ?? null);
        },
      );
    });
  }

  async getSleepHours(startDate: Date, endDate: Date): Promise<number | null> {
    const kit = await this.getKit();
    if (!kit) return null;
    return new Promise((resolve) => {
      kit.getSleepSamples(
        { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
        (err: any, results: any[]) => {
          if (err || !results?.length) return resolve(null);
          const totalMs = results.reduce((sum: number, r: any) => {
            return sum + (new Date(r.endDate).getTime() - new Date(r.startDate).getTime());
          }, 0);
          resolve(totalMs / (1000 * 60 * 60));
        },
      );
    });
  }

  async getWeight(): Promise<number | null> {
    const kit = await this.getKit();
    if (!kit) return null;
    return new Promise((resolve) => {
      kit.getLatestWeight({}, (err: any, results: any) => {
        resolve(err ? null : results?.value ?? null);
      });
    });
  }

  async disconnect(): Promise<void> {
    this.kit = null;
  }
}

// Android Health Connect bridge (requires EAS Build)
// Uses `any` for native module interop since react-native-health-connect
// readRecords return types require unsafe casts
class AndroidHealthBridge implements HealthBridge {
  private hc: any = null;

  private async getHC(): Promise<any> {
    if (this.hc) return this.hc;
    try {
      this.hc = require('react-native-health-connect');
      return this.hc;
    } catch {
      return null;
    }
  }

  async isAvailable(): Promise<boolean> {
    const hc = await this.getHC();
    if (!hc) return false;
    try {
      const result = await hc.getSdkStatus();
      return result === 3; // SDK_AVAILABLE
    } catch {
      return false;
    }
  }

  async requestPermissions(): Promise<boolean> {
    const hc = await this.getHC();
    if (!hc) return false;
    try {
      await hc.initialize();
      await hc.requestPermission([
        { accessType: 'read', recordType: 'Steps' },
        { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
        { accessType: 'read', recordType: 'RestingHeartRate' },
        { accessType: 'read', recordType: 'SleepSession' },
        { accessType: 'read', recordType: 'Weight' },
      ]);
      return true;
    } catch {
      return false;
    }
  }

  async getSteps(startDate: Date, endDate: Date): Promise<number | null> {
    const hc = await this.getHC();
    if (!hc) return null;
    try {
      const result: any = await hc.readRecords('Steps', {
        timeRangeFilter: {
          operator: 'between',
          startTime: startDate.toISOString(),
          endTime: endDate.toISOString(),
        },
      });
      const records = Array.isArray(result) ? result : result?.records ?? [];
      const total = records.reduce((sum: number, r: any) => sum + (r.count ?? 0), 0);
      return total || null;
    } catch {
      return null;
    }
  }

  async getActiveEnergy(startDate: Date, endDate: Date): Promise<number | null> {
    const hc = await this.getHC();
    if (!hc) return null;
    try {
      const result: any = await hc.readRecords('ActiveCaloriesBurned', {
        timeRangeFilter: {
          operator: 'between',
          startTime: startDate.toISOString(),
          endTime: endDate.toISOString(),
        },
      });
      const records = Array.isArray(result) ? result : result?.records ?? [];
      const total = records.reduce(
        (sum: number, r: any) => sum + (r.energy?.inKilocalories ?? 0),
        0,
      );
      return total || null;
    } catch {
      return null;
    }
  }

  async getRestingHeartRate(startDate: Date, endDate: Date): Promise<number | null> {
    const hc = await this.getHC();
    if (!hc) return null;
    try {
      const result: any = await hc.readRecords('RestingHeartRate', {
        timeRangeFilter: {
          operator: 'between',
          startTime: startDate.toISOString(),
          endTime: endDate.toISOString(),
        },
      });
      const records = Array.isArray(result) ? result : result?.records ?? [];
      return records.length > 0 ? records[records.length - 1].beatsPerMinute : null;
    } catch {
      return null;
    }
  }

  async getSleepHours(startDate: Date, endDate: Date): Promise<number | null> {
    const hc = await this.getHC();
    if (!hc) return null;
    try {
      const result: any = await hc.readRecords('SleepSession', {
        timeRangeFilter: {
          operator: 'between',
          startTime: startDate.toISOString(),
          endTime: endDate.toISOString(),
        },
      });
      const records = Array.isArray(result) ? result : result?.records ?? [];
      const totalMs = records.reduce(
        (sum: number, r: any) => sum + (new Date(r.endTime).getTime() - new Date(r.startTime).getTime()),
        0,
      );
      return totalMs > 0 ? totalMs / (1000 * 60 * 60) : null;
    } catch {
      return null;
    }
  }

  async getWeight(): Promise<number | null> {
    const hc = await this.getHC();
    if (!hc) return null;
    try {
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const result: any = await hc.readRecords('Weight', {
        timeRangeFilter: {
          operator: 'between',
          startTime: weekAgo.toISOString(),
          endTime: now.toISOString(),
        },
      });
      const records = Array.isArray(result) ? result : result?.records ?? [];
      return records.length > 0 ? records[records.length - 1].weight.inKilograms : null;
    } catch {
      return null;
    }
  }

  async disconnect(): Promise<void> {
    this.hc = null;
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

function createHealthBridge(): HealthBridge {
  if (Platform.OS === 'ios') {
    return new AppleHealthBridge();
  }
  if (Platform.OS === 'android') {
    return new AndroidHealthBridge();
  }
  // Web or other platforms - use NoOp with mock disabled
  return new NoOpHealthBridge(false);
}

export const healthBridge = createHealthBridge();

// For testing/simulator use
export function createMockHealthBridge(): HealthBridge {
  return new NoOpHealthBridge(true);
}
