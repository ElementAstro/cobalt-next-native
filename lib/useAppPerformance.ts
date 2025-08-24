import { useEffect, useRef, useState } from 'react';
import { AppState, Platform, Dimensions } from 'react-native';
import type { AppStateStatus } from 'react-native';
import type { NetworkState, DeviceInfo } from '~/types/common';

/**
 * Enhanced performance monitoring hook following 2025 best practices
 * Monitors app state, network connectivity, and device metrics
 */
export function useAppPerformance() {
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);
  const [isAppActive, setIsAppActive] = useState(true);
  const [networkState, setNetworkState] = useState<NetworkState>({
    isConnected: true,
    isInternetReachable: null,
    type: null,
  });
  
  const performanceStartTime = useRef<number>(Date.now());
  const renderCount = useRef<number>(0);

  // Track app state changes for performance optimization
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      setAppState(nextAppState);
      setIsAppActive(nextAppState === 'active');
      
      // Log performance metrics when app becomes active
      if (nextAppState === 'active') {
        const timeInBackground = Date.now() - performanceStartTime.current;
        if (__DEV__) {
          console.log(`App was in background for ${timeInBackground}ms`);
        }
      }
      
      performanceStartTime.current = Date.now();
    });

    return () => subscription?.remove();
  }, []);

  // Monitor network state (if expo-network is available)
  useEffect(() => {
    let networkSubscription: any;

    const setupNetworkMonitoring = async () => {
      try {
        const Network = await import('expo-network');
        
        // Get initial network state
        const initialState = await Network.default.getNetworkStateAsync();
        setNetworkState({
          isConnected: initialState.isConnected ?? false,
          isInternetReachable: initialState.isInternetReachable ?? null,
          type: initialState.type ?? null,
        });

        // Not all Expo versions support network state listeners
        // This is a progressive enhancement
      } catch (error) {
        if (__DEV__) {
          console.warn('Network monitoring not available:', error);
        }
      }
    };

    setupNetworkMonitoring();

    return () => {
      if (networkSubscription?.remove) {
        networkSubscription.remove();
      }
    };
  }, []);

  // Track render performance
  useEffect(() => {
    renderCount.current += 1;
    
    if (__DEV__ && renderCount.current % 10 === 0) {
      console.log(`Component has rendered ${renderCount.current} times`);
    }
  });

  // Get device information
  const getDeviceInfo = (): DeviceInfo => {
    const { width, height, scale, fontScale } = Dimensions.get('window');
    
    return {
      platform: Platform.OS as 'ios' | 'android' | 'web',
      version: Platform.Version.toString(),
      isTablet: Platform.OS === 'ios' ? Platform.isPad : width >= 768,
      hasNotch: Platform.OS === 'ios' && height >= 812, // Simplified notch detection
    };
  };

  return {
    appState,
    isAppActive,
    networkState,
    deviceInfo: getDeviceInfo(),
    renderCount: renderCount.current,
    isPerformanceOptimal: isAppActive && networkState.isConnected,
  };
}

/**
 * Hook for debounced state updates to improve performance
 */
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook for optimized list rendering following 2025 best practices
 */
export function useOptimizedList<T>(
  data: T[],
  itemHeight: number,
  windowSize: number = 10
) {
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: windowSize });
  const [scrollOffset, setScrollOffset] = useState(0);

  const updateVisibleRange = (offset: number) => {
    const start = Math.max(0, Math.floor(offset / itemHeight) - 2);
    const end = Math.min(data.length, start + windowSize + 4);
    
    setVisibleRange({ start, end });
    setScrollOffset(offset);
  };

  const visibleData = data.slice(visibleRange.start, visibleRange.end);

  return {
    visibleData,
    visibleRange,
    scrollOffset,
    updateVisibleRange,
    totalHeight: data.length * itemHeight,
  };
}
