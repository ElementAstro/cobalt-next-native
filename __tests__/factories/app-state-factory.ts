/**
 * App State Factory
 * Creates test data for app state management
 */

import type { NetworkState, DeviceInfo } from '~/types/common';

export interface AppStateData {
  isDarkMode: boolean;
  primaryColor: string;
  fontSize: 'small' | 'medium' | 'large';
  notifications: {
    enabled: boolean;
    sound: boolean;
    vibration: boolean;
  };
  appVersion: string;
  buildNumber: string;
  lastUpdated: string;
  networkState: NetworkState;
  deviceInfo: DeviceInfo | null;
  isAppActive: boolean;
  features: {
    enhancedAnimations: boolean;
    performanceMonitoring: boolean;
    analyticsEnabled: boolean;
  };
}

export interface PerformanceStateData {
  metrics: {
    appStartTime: number;
    renderCount: number;
    memoryUsage: number;
    lastFrameTime: number;
  };
  errors: {
    jsErrors: number;
    nativeErrors: number;
    lastError: string | null;
  };
}

export const createAppState = (overrides: Partial<AppStateData> = {}): AppStateData => ({
  isDarkMode: false,
  primaryColor: '#3b82f6',
  fontSize: 'medium',
  notifications: {
    enabled: true,
    sound: true,
    vibration: true,
  },
  appVersion: '1.0.0',
  buildNumber: '1',
  lastUpdated: new Date().toISOString(),
  networkState: {
    isConnected: true,
    isInternetReachable: true,
    type: 'wifi',
  },
  deviceInfo: {
    platform: 'ios',
    version: '14.0',
    isTablet: false,
    hasNotch: true,
  },
  isAppActive: true,
  features: {
    enhancedAnimations: true,
    performanceMonitoring: true,
    analyticsEnabled: true,
  },
  ...overrides,
});

export const createPerformanceState = (overrides: Partial<PerformanceStateData> = {}): PerformanceStateData => ({
  metrics: {
    appStartTime: Date.now(),
    renderCount: 0,
    memoryUsage: 0,
    lastFrameTime: 0,
  },
  errors: {
    jsErrors: 0,
    nativeErrors: 0,
    lastError: null,
  },
  ...overrides,
});

export const createDarkModeAppState = (): AppStateData => 
  createAppState({ isDarkMode: true, primaryColor: '#1f2937' });

export const createOfflineAppState = (): AppStateData => 
  createAppState({ 
    networkState: { isConnected: false, isInternetReachable: false, type: null },
    isAppActive: false 
  });

export const createTabletAppState = (): AppStateData => 
  createAppState({ 
    deviceInfo: {
      platform: 'ios',
      version: '15.0',
      isTablet: true,
      hasNotch: false,
    }
  });

export const createAndroidAppState = (): AppStateData => 
  createAppState({ 
    deviceInfo: {
      platform: 'android',
      version: '12',
      isTablet: false,
      hasNotch: false,
    }
  });

export const createHighPerformanceState = (): PerformanceStateData => 
  createPerformanceState({
    metrics: {
      appStartTime: Date.now() - 1000,
      renderCount: 50,
      memoryUsage: 128,
      lastFrameTime: 16.67,
    }
  });

export const createErrorPerformanceState = (): PerformanceStateData => 
  createPerformanceState({
    errors: {
      jsErrors: 3,
      nativeErrors: 1,
      lastError: 'Test error message',
    }
  });
