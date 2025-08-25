import React from 'react';
import { render, type RenderOptions } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Mock providers for testing
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return React.createElement(
    GestureHandlerRootView,
    { style: { flex: 1 } },
    React.createElement(SafeAreaProvider, null, children)
  );
};

const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

// Re-export everything
export * from '@testing-library/react-native';

// Override render method
export { customRender as render };

// Test utilities for common patterns
export const createMockStore = <T extends object>(initialState: T) => {
  let state = { ...initialState };
  
  return {
    getState: () => state,
    setState: (newState: Partial<T>) => {
      state = { ...state, ...newState };
    },
    subscribe: jest.fn(),
    destroy: jest.fn(),
  };
};

export const createMockObservable = <T>(initialValue: T) => {
  const subscribers: Array<(value: T) => void> = [];
  let currentValue = initialValue;

  return {
    value: currentValue,
    next: jest.fn((value: T) => {
      currentValue = value;
      subscribers.forEach(sub => sub(value));
    }),
    subscribe: jest.fn((callback: (value: T) => void) => {
      subscribers.push(callback);
      callback(currentValue);
      return {
        unsubscribe: jest.fn(() => {
          const index = subscribers.indexOf(callback);
          if (index > -1) subscribers.splice(index, 1);
        }),
      };
    }),
    pipe: jest.fn(() => ({
      subscribe: jest.fn(),
    })),
    asObservable: jest.fn(),
  };
};

export const waitForAsync = (ms: number = 0) => 
  new Promise(resolve => setTimeout(resolve, ms));

export const flushPromises = () => new Promise(setImmediate);

// Mock data generators
export const createMockDownloadTask = (overrides = {}) => ({
  id: 'test-download-1',
  url: 'https://example.com/file.zip',
  filename: 'test-file.zip',
  status: 'pending' as const,
  progress: 0,
  totalSize: 1024 * 1024,
  downloadedSize: 0,
  speed: 0,
  startTime: Date.now(),
  estimatedTimeRemaining: 0,
  error: null,
  retryCount: 0,
  ...overrides,
});

export const createMockScanSession = (overrides = {}) => ({
  id: 'test-scan-1',
  target: '192.168.1.1',
  ports: [80, 443, 22],
  startTime: Date.now(),
  status: 'idle' as const,
  results: [],
  totalPorts: 3,
  scannedPorts: 0,
  openPorts: 0,
  closedPorts: 0,
  filteredPorts: 0,
  errorPorts: 0,
  ...overrides,
});

export const createMockNetworkState = (overrides = {}) => ({
  isConnected: true,
  isInternetReachable: true,
  type: 'wifi',
  ...overrides,
});

export const createMockDeviceInfo = (overrides = {}) => ({
  platform: 'ios' as const,
  version: '14.0',
  isTablet: false,
  hasNotch: true,
  ...overrides,
});
