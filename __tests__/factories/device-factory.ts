/**
 * Device Factory
 * Creates test data for device information and capabilities
 */

import type { DeviceInfo } from '~/types/common';

export interface DeviceCapabilitiesData {
  hasCamera: boolean;
  hasMicrophone: boolean;
  hasGPS: boolean;
  hasBluetooth: boolean;
  hasNFC: boolean;
  hasBiometrics: boolean;
  hasNotifications: boolean;
  hasVibration: boolean;
  hasAccelerometer: boolean;
  hasGyroscope: boolean;
}

export interface DeviceStorageData {
  totalSpace: number;
  freeSpace: number;
  usedSpace: number;
  externalStorage: boolean;
  externalTotalSpace?: number;
  externalFreeSpace?: number;
}

export interface DeviceBatteryData {
  level: number;
  isCharging: boolean;
  chargingType?: 'wireless' | 'wired';
  batteryState: 'unknown' | 'unplugged' | 'charging' | 'full';
}

export const createDeviceInfo = (overrides: Partial<DeviceInfo> = {}): DeviceInfo => ({
  platform: 'ios',
  version: '15.0',
  isTablet: false,
  hasNotch: true,
  ...overrides,
});

export const createDeviceCapabilities = (overrides: Partial<DeviceCapabilitiesData> = {}): DeviceCapabilitiesData => ({
  hasCamera: true,
  hasMicrophone: true,
  hasGPS: true,
  hasBluetooth: true,
  hasNFC: true,
  hasBiometrics: true,
  hasNotifications: true,
  hasVibration: true,
  hasAccelerometer: true,
  hasGyroscope: true,
  ...overrides,
});

export const createDeviceStorage = (overrides: Partial<DeviceStorageData> = {}): DeviceStorageData => ({
  totalSpace: 128 * 1024 * 1024 * 1024, // 128GB
  freeSpace: 64 * 1024 * 1024 * 1024,   // 64GB
  usedSpace: 64 * 1024 * 1024 * 1024,   // 64GB
  externalStorage: false,
  ...overrides,
});

export const createDeviceBattery = (overrides: Partial<DeviceBatteryData> = {}): DeviceBatteryData => ({
  level: 0.85,
  isCharging: false,
  batteryState: 'unplugged',
  ...overrides,
});

export const createiOSDevice = (): DeviceInfo => 
  createDeviceInfo({
    platform: 'ios',
    version: '16.0',
    isTablet: false,
    hasNotch: true,
  });

export const createAndroidDevice = (): DeviceInfo => 
  createDeviceInfo({
    platform: 'android',
    version: '13',
    isTablet: false,
    hasNotch: false,
  });

export const createiPadDevice = (): DeviceInfo => 
  createDeviceInfo({
    platform: 'ios',
    version: '16.0',
    isTablet: true,
    hasNotch: false,
  });

export const createAndroidTabletDevice = (): DeviceInfo => 
  createDeviceInfo({
    platform: 'android',
    version: '13',
    isTablet: true,
    hasNotch: false,
  });

export const createOlderiOSDevice = (): DeviceInfo => 
  createDeviceInfo({
    platform: 'ios',
    version: '12.0',
    isTablet: false,
    hasNotch: false,
  });

export const createOlderAndroidDevice = (): DeviceInfo => 
  createDeviceInfo({
    platform: 'android',
    version: '8.0',
    isTablet: false,
    hasNotch: false,
  });

export const createLimitedCapabilitiesDevice = (): DeviceCapabilitiesData => 
  createDeviceCapabilities({
    hasCamera: false,
    hasMicrophone: false,
    hasGPS: false,
    hasBluetooth: false,
    hasNFC: false,
    hasBiometrics: false,
    hasVibration: false,
    hasAccelerometer: false,
    hasGyroscope: false,
  });

export const createFullCapabilitiesDevice = (): DeviceCapabilitiesData => 
  createDeviceCapabilities({
    hasCamera: true,
    hasMicrophone: true,
    hasGPS: true,
    hasBluetooth: true,
    hasNFC: true,
    hasBiometrics: true,
    hasNotifications: true,
    hasVibration: true,
    hasAccelerometer: true,
    hasGyroscope: true,
  });

export const createLowStorageDevice = (): DeviceStorageData => 
  createDeviceStorage({
    totalSpace: 32 * 1024 * 1024 * 1024, // 32GB
    freeSpace: 1 * 1024 * 1024 * 1024,   // 1GB
    usedSpace: 31 * 1024 * 1024 * 1024,  // 31GB
  });

export const createHighStorageDevice = (): DeviceStorageData => 
  createDeviceStorage({
    totalSpace: 512 * 1024 * 1024 * 1024, // 512GB
    freeSpace: 256 * 1024 * 1024 * 1024,  // 256GB
    usedSpace: 256 * 1024 * 1024 * 1024,  // 256GB
    externalStorage: true,
    externalTotalSpace: 128 * 1024 * 1024 * 1024, // 128GB
    externalFreeSpace: 64 * 1024 * 1024 * 1024,   // 64GB
  });

export const createLowBatteryDevice = (): DeviceBatteryData => 
  createDeviceBattery({
    level: 0.15,
    isCharging: false,
    batteryState: 'unplugged',
  });

export const createChargingDevice = (): DeviceBatteryData => 
  createDeviceBattery({
    level: 0.65,
    isCharging: true,
    chargingType: 'wired',
    batteryState: 'charging',
  });

export const createWirelessChargingDevice = (): DeviceBatteryData => 
  createDeviceBattery({
    level: 0.80,
    isCharging: true,
    chargingType: 'wireless',
    batteryState: 'charging',
  });

export const createFullBatteryDevice = (): DeviceBatteryData => 
  createDeviceBattery({
    level: 1.0,
    isCharging: false,
    batteryState: 'full',
  });
