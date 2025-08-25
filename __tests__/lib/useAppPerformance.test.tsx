// Mock React Native modules specifically for this test
jest.mock('react-native', () => ({
  AppState: {
    currentState: 'active',
    addEventListener: jest.fn((event, callback) => ({
      remove: jest.fn(),
    })),
    removeEventListener: jest.fn(),
  },
  Platform: {
    OS: 'ios',
    Version: '14.0',
    isPad: false,
    select: jest.fn().mockImplementation((obj) => obj.ios || obj.default),
  },
  Dimensions: {
    get: jest.fn(() => ({ width: 375, height: 812, scale: 2, fontScale: 1 })),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  },
}));

import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { useAppPerformance, useDebouncedValue } from '../../lib/useAppPerformance';

// Get references to the mocked modules
const { AppState, Platform, Dimensions } = require('react-native');

// Mock variables are now handled by the React Native mock above

describe('lib/useAppPerformance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Reset Dimensions mock to default values
    Dimensions.get.mockReturnValue({ width: 375, height: 812, scale: 2, fontScale: 1 });

    // Reset Platform to iOS
    Platform.OS = 'ios';
    Platform.Version = '14.0';
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('useAppPerformance hook', () => {
    it('should return initial performance state', () => {
      const { result } = renderHook(() => useAppPerformance());

      expect(result.current.appState).toBe('active');
      expect(result.current.isAppActive).toBe(true);
      expect(result.current.networkState).toEqual({
        isConnected: true,
        isInternetReachable: null,
        type: null,
      });
      expect(result.current.deviceInfo).toEqual({
        platform: 'ios',
        version: '14.0',
        isTablet: false,
        hasNotch: true,
      });
      expect(result.current.renderCount).toBe(0);
      expect(result.current.isPerformanceOptimal).toBe(true);
    });

    it('should set up AppState event listeners', () => {
      renderHook(() => useAppPerformance());

      expect(AppState.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });

    it('should clean up event listeners on unmount', () => {
      const mockRemove = jest.fn();
      AppState.addEventListener.mockReturnValue({ remove: mockRemove });

      const { unmount } = renderHook(() => useAppPerformance());

      unmount();

      expect(mockRemove).toHaveBeenCalled();
    });

    it('should update app state when AppState changes', () => {
      let appStateChangeHandler: (nextAppState: string) => void;
      
      AppState.addEventListener.mockImplementation((event: string, handler: any) => {
        if (event === 'change') {
          appStateChangeHandler = handler;
        }
        return { remove: jest.fn() };
      });

      const { result } = renderHook(() => useAppPerformance());

      expect(result.current.appState).toBe('active');
      expect(result.current.isAppActive).toBe(true);

      // Simulate app going to background
      act(() => {
        appStateChangeHandler('background');
      });

      expect(result.current.appState).toBe('background');
      expect(result.current.isAppActive).toBe(false);

      // Simulate app going to inactive
      act(() => {
        appStateChangeHandler('inactive');
      });

      expect(result.current.appState).toBe('inactive');
      expect(result.current.isAppActive).toBe(false);

      // Simulate app becoming active again
      act(() => {
        appStateChangeHandler('active');
      });

      expect(result.current.appState).toBe('active');
      expect(result.current.isAppActive).toBe(true);
    });

    it('should increment render count on each render', () => {
      const { result, rerender } = renderHook(() => useAppPerformance());

      expect(result.current.renderCount).toBe(0);

      rerender({});
      expect(result.current.renderCount).toBe(1);

      rerender({});
      expect(result.current.renderCount).toBe(2);
    });

    it('should calculate performance optimality correctly', () => {
      let appStateChangeHandler: (nextAppState: string) => void;
      
      AppState.addEventListener.mockImplementation((event: string, handler: any) => {
        if (event === 'change') {
          appStateChangeHandler = handler;
        }
        return { remove: jest.fn() };
      });

      const { result } = renderHook(() => useAppPerformance());

      // Initially optimal (active + connected)
      expect(result.current.isPerformanceOptimal).toBe(true);

      // App goes to background - should not be optimal
      act(() => {
        appStateChangeHandler('background');
      });

      expect(result.current.isPerformanceOptimal).toBe(false);
    });

    it('should handle different platform configurations', () => {
      // Test Android configuration
      Platform.OS = 'android';
      Platform.Version = '30';

      const { result } = renderHook(() => useAppPerformance());

      expect(result.current.deviceInfo.platform).toBe('android');
      expect(result.current.deviceInfo.version).toBe('30');
      expect(result.current.deviceInfo.hasNotch).toBe(false); // Android default
    });

    it('should handle web platform', () => {
      Platform.OS = 'web';

      const { result } = renderHook(() => useAppPerformance());

      expect(result.current.deviceInfo.platform).toBe('web');
      expect(result.current.deviceInfo.isTablet).toBe(false);
    });

    it('should detect tablet devices', () => {
      // Test iPad detection
      Platform.isPad = true;

      const { result } = renderHook(() => useAppPerformance());

      expect(result.current.deviceInfo.isTablet).toBe(true);

      // Test Android tablet detection
      Platform.OS = 'android';
      Platform.isPad = false;
      Dimensions.get.mockReturnValue({ width: 1024, height: 768, scale: 2, fontScale: 1 });

      const { result: androidResult } = renderHook(() => useAppPerformance());
      expect(androidResult.current.deviceInfo.isTablet).toBe(true);
    });

    it('should handle memory pressure scenarios', () => {
      // This would be extended in a real implementation with memory monitoring
      const { result, rerender } = renderHook(() => useAppPerformance());

      // Simulate many re-renders (potential memory pressure)
      for (let i = 0; i < 5; i++) {
        rerender({});
      }

      expect(result.current.renderCount).toBeGreaterThan(0);
    });
  });

  describe('useDebouncedValue hook', () => {
    it('should return initial value immediately', () => {
      const { result } = renderHook(() => useDebouncedValue('initial', 500));

      expect(result.current).toBe('initial');
    });

    it('should debounce value changes', () => {
      const { result, rerender } = renderHook(
        ({ value, delay }: { value: string; delay: number }) => useDebouncedValue(value, delay),
        { initialProps: { value: 'initial', delay: 500 } }
      );

      expect(result.current).toBe('initial');

      // Change value
      rerender({ value: 'changed', delay: 500 });

      // Should still be initial value before delay
      expect(result.current).toBe('initial');

      // Fast forward time
      act(() => {
        jest.advanceTimersByTime(500);
      });

      // Should now be the changed value
      expect(result.current).toBe('changed');
    });

    it('should cancel previous timeout on rapid changes', () => {
      const { result, rerender } = renderHook(
        ({ value, delay }: { value: string; delay: number }) => useDebouncedValue(value, delay),
        { initialProps: { value: 'initial', delay: 500 } }
      );

      // Rapid changes
      rerender({ value: 'change1', delay: 500 });
      rerender({ value: 'change2', delay: 500 });
      rerender({ value: 'final', delay: 500 });

      // Should still be initial
      expect(result.current).toBe('initial');

      // Fast forward time
      act(() => {
        jest.advanceTimersByTime(500);
      });

      // Should be the final value (previous timeouts cancelled)
      expect(result.current).toBe('final');
    });

    it('should handle different delay values', () => {
      const { result, rerender } = renderHook(
        ({ value, delay }: { value: string; delay: number }) => useDebouncedValue(value, delay),
        { initialProps: { value: 'initial', delay: 100 } }
      );

      rerender({ value: 'changed', delay: 100 });

      act(() => {
        jest.advanceTimersByTime(50);
      });
      expect(result.current).toBe('initial');

      act(() => {
        jest.advanceTimersByTime(50);
      });
      expect(result.current).toBe('changed');
    });

    it('should handle zero delay', () => {
      const { result, rerender } = renderHook(
        ({ value, delay }: { value: string; delay: number }) => useDebouncedValue(value, delay),
        { initialProps: { value: 'initial', delay: 0 } }
      );

      rerender({ value: 'changed', delay: 0 });

      act(() => {
        jest.advanceTimersByTime(0);
      });

      expect(result.current).toBe('changed');
    });

    it('should clean up timeout on unmount', () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      
      const { unmount, rerender } = renderHook(
        ({ value, delay }: { value: string; delay: number }) => useDebouncedValue(value, delay),
        { initialProps: { value: 'initial', delay: 500 } }
      );

      rerender({ value: 'changed', delay: 500 });
      unmount();

      expect(clearTimeoutSpy).toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });
  });
});
