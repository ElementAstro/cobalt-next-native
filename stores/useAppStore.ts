import React from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NetworkState, DeviceInfo } from '~/types/common';

// App state interface
interface AppState {
  // Theme and UI
  isDarkMode: boolean;
  primaryColor: string;
  fontSize: 'small' | 'medium' | 'large';
  
  // User preferences
  notifications: {
    enabled: boolean;
    sound: boolean;
    vibration: boolean;
  };
  
  // App metadata
  appVersion: string;
  buildNumber: string;
  lastUpdated: string;
  
  // Performance metrics
  networkState: NetworkState;
  deviceInfo: DeviceInfo | null;
  isAppActive: boolean;
  
  // Feature flags
  features: {
    enhancedAnimations: boolean;
    performanceMonitoring: boolean;
    analyticsEnabled: boolean;
  };
  
  // Actions
  setTheme: (isDark: boolean) => void;
  setPrimaryColor: (color: string) => void;
  setFontSize: (size: 'small' | 'medium' | 'large') => void;
  updateNotificationSettings: (settings: Partial<AppState['notifications']>) => void;
  updateNetworkState: (state: NetworkState) => void;
  setDeviceInfo: (info: DeviceInfo) => void;
  setAppActive: (active: boolean) => void;
  toggleFeature: (feature: keyof AppState['features']) => void;
  resetSettings: () => void;
}

// Default state
const defaultState = {
  isDarkMode: false,
  primaryColor: '#3b82f6',
  fontSize: 'medium' as const,
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
    isInternetReachable: null,
    type: null,
  },
  deviceInfo: null,
  isAppActive: true,
  features: {
    enhancedAnimations: true,
    performanceMonitoring: true,
    analyticsEnabled: true,
  },
};

/**
 * Global app store using Zustand with persistence and Immer
 * Following 2025 state management best practices
 */
export const useAppStore = create<AppState>()(
  persist(
    immer((set, get) => ({
      ...defaultState,
      
      setTheme: (isDark) =>
        set((state) => {
          state.isDarkMode = isDark;
          state.lastUpdated = new Date().toISOString();
        }),
      
      setPrimaryColor: (color) =>
        set((state) => {
          state.primaryColor = color;
          state.lastUpdated = new Date().toISOString();
        }),
      
      setFontSize: (size) =>
        set((state) => {
          state.fontSize = size;
          state.lastUpdated = new Date().toISOString();
        }),
      
      updateNotificationSettings: (settings) =>
        set((state) => {
          Object.assign(state.notifications, settings);
          state.lastUpdated = new Date().toISOString();
        }),
      
      updateNetworkState: (networkState) =>
        set((state) => {
          state.networkState = networkState;
        }),
      
      setDeviceInfo: (info) =>
        set((state) => {
          state.deviceInfo = info;
        }),
      
      setAppActive: (active) =>
        set((state) => {
          state.isAppActive = active;
        }),
      
      toggleFeature: (feature) =>
        set((state) => {
          state.features[feature] = !state.features[feature];
          state.lastUpdated = new Date().toISOString();
        }),
      
      resetSettings: () =>
        set((state) => {
          Object.assign(state, defaultState);
          state.lastUpdated = new Date().toISOString();
        }),
    })),
    {
      name: 'cobalt-app-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist user preferences, not runtime state
      partialize: (state) => ({
        isDarkMode: state.isDarkMode,
        primaryColor: state.primaryColor,
        fontSize: state.fontSize,
        notifications: state.notifications,
        features: state.features,
        lastUpdated: state.lastUpdated,
      }),
    }
  )
);

// Selectors for better performance
export const useTheme = () => useAppStore((state) => ({
  isDarkMode: state.isDarkMode,
  primaryColor: state.primaryColor,
  setTheme: state.setTheme,
  setPrimaryColor: state.setPrimaryColor,
}));

export const useNotifications = () => useAppStore((state) => ({
  notifications: state.notifications,
  updateNotificationSettings: state.updateNotificationSettings,
}));

export const useDeviceState = () => useAppStore((state) => ({
  networkState: state.networkState,
  deviceInfo: state.deviceInfo,
  isAppActive: state.isAppActive,
}));

export const useFeatures = () => useAppStore((state) => ({
  features: state.features,
  toggleFeature: state.toggleFeature,
}));

// Performance monitoring state
interface PerformanceState {
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
  
  updateMetrics: (metrics: Partial<PerformanceState['metrics']>) => void;
  recordError: (error: string, type: 'js' | 'native') => void;
  resetMetrics: () => void;
}

export const usePerformanceStore = create<PerformanceState>()(
  immer((set) => ({
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
    
    updateMetrics: (newMetrics) =>
      set((state) => {
        Object.assign(state.metrics, newMetrics);
      }),
    
    recordError: (error, type) =>
      set((state) => {
        if (type === 'js') {
          state.errors.jsErrors++;
        } else {
          state.errors.nativeErrors++;
        }
        state.errors.lastError = error;
      }),
    
    resetMetrics: () =>
      set((state) => {
        state.metrics = {
          appStartTime: Date.now(),
          renderCount: 0,
          memoryUsage: 0,
          lastFrameTime: 0,
        };
        state.errors = {
          jsErrors: 0,
          nativeErrors: 0,
          lastError: null,
        };
      }),
  }))
);

// Custom hooks for common operations
export const useAppInit = () => {
  const { setDeviceInfo, updateNetworkState, setAppActive } = useAppStore();
  const { updateMetrics } = usePerformanceStore();
  
  React.useEffect(() => {
    // Initialize app performance tracking
    updateMetrics({ appStartTime: Date.now() });
    
    // Set initial app state
    setAppActive(true);
  }, [setAppActive, updateMetrics]);
  
  return { setDeviceInfo, updateNetworkState };
};
