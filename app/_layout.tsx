import '~/global.css';

import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import type { Theme } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as React from 'react';
import { Platform, AppState, type AppStateStatus } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NAV_THEME } from '~/lib/constants';
import { useColorScheme } from '~/lib/useColorScheme';
import { useAppPerformance } from '~/lib/useAppPerformance';
import { useAppStore } from '~/stores/useAppStore';
import { PortalHost } from '@rn-primitives/portal';
import { ThemeToggle } from '~/components/theme-toggle';
import { setAndroidNavigationBar } from '~/lib/android-navigation-bar';
import { ErrorBoundary } from 'expo-router';
import { EnhancedErrorBoundary } from '~/components/error-handling/enhanced-error-boundary';
import { NotificationSystem } from '~/components/notifications/notification-system';

const LIGHT_THEME: Theme = {
  ...DefaultTheme,
  colors: NAV_THEME.light,
};
const DARK_THEME: Theme = {
  ...DarkTheme,
  colors: NAV_THEME.dark,
};

// Performance optimization: Memoized theme provider
const MemoizedThemeProvider = React.memo(({ 
  children, 
  theme 
}: { 
  children: React.ReactNode; 
  theme: Theme 
}) => (
  <ThemeProvider value={theme}>
    {children}
  </ThemeProvider>
));

MemoizedThemeProvider.displayName = 'MemoizedThemeProvider';

export { ErrorBoundary } from 'expo-router';

export default function RootLayout() {
  const hasMounted = React.useRef(false);
  const { colorScheme, isDarkColorScheme } = useColorScheme();
  const [isColorSchemeLoaded, setIsColorSchemeLoaded] = React.useState(false);
  const [appState, setAppState] = React.useState<AppStateStatus>(AppState.currentState);

  // Initialize performance monitoring
  const { isAppActive, networkState, deviceInfo } = useAppPerformance();
  const { updateNetworkState, setDeviceInfo, setAppActive } = useAppStore();

  // Sync performance data with app store
  React.useEffect(() => {
    updateNetworkState(networkState);
  }, [networkState, updateNetworkState]);

  React.useEffect(() => {
    setDeviceInfo(deviceInfo);
  }, [deviceInfo, setDeviceInfo]);

  React.useEffect(() => {
    setAppActive(isAppActive);
  }, [isAppActive, setAppActive]);

  // App state change handler for performance optimization
  React.useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      setAppState(nextAppState);

      // Optimize for background/foreground transitions
      if (nextAppState === 'active') {
        setAndroidNavigationBar(colorScheme);
      }
    });

    return () => subscription?.remove();
  }, [colorScheme]);

  useIsomorphicLayoutEffect(() => {
    if (hasMounted.current) {
      return;
    }

    if (Platform.OS === 'web') {
      // Adds the background color to the html element to prevent white background on overscroll.
      document.documentElement.classList.add('bg-background');
      // Enable CSS containment for better performance
      document.documentElement.style.contain = 'layout style paint';
    }
    
    setAndroidNavigationBar(colorScheme);
    setIsColorSchemeLoaded(true);
    hasMounted.current = true;
  }, [colorScheme]);

  // Memoize theme selection
  const selectedTheme = React.useMemo(
    () => (isDarkColorScheme ? DARK_THEME : LIGHT_THEME),
    [isDarkColorScheme]
  );

  if (!isColorSchemeLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <EnhancedErrorBoundary level="app" source="RootLayout" enableRetry={true}>
          <MemoizedThemeProvider theme={selectedTheme}>
            <StatusBar style={isDarkColorScheme ? 'light' : 'dark'} />
            <Stack
              screenOptions={{
                // Performance: Enable native stack animations
                animation: 'slide_from_right',
                // Enable gesture navigation
                gestureEnabled: true,
              }}
            >
              <Stack.Screen
                name='index'
                options={{
                  title: 'Cobalt Native',
                  headerRight: () => <ThemeToggle />,
                  // Add accessibility support
                  headerTitleStyle: {
                    fontWeight: '600',
                  },
                }}
              />
              <Stack.Screen
                name='download'
                options={{
                  title: 'Downloads',
                  presentation: 'modal',
                  gestureEnabled: true,
                }}
              />
              <Stack.Screen
                name='dashboard'
                options={{
                  title: 'Dashboard',
                  headerRight: () => <ThemeToggle />,
                  gestureEnabled: true,
                }}
              />
            </Stack>
            <PortalHost />
            <NotificationSystem position="top" maxNotifications={3} />
          </MemoizedThemeProvider>
        </EnhancedErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const useIsomorphicLayoutEffect =
  Platform.OS === 'web' && typeof window === 'undefined' ? React.useEffect : React.useLayoutEffect;
