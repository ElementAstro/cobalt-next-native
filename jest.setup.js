import 'react-native-gesture-handler/jestSetup';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiSet: jest.fn(() => Promise.resolve()),
  multiRemove: jest.fn(() => Promise.resolve()),
}));

// Mock Expo modules
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(() => true),
  }),
  useLocalSearchParams: () => ({}),
  Stack: ({ children }) => children,
  Link: ({ children }) => children,
}));

jest.mock('expo-linking', () => ({
  createURL: jest.fn(),
  openURL: jest.fn(),
  canOpenURL: jest.fn(() => Promise.resolve(true)),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
}));

jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: jest.fn(),
  cancelNotificationAsync: jest.fn(),
  getAllScheduledNotificationsAsync: jest.fn(() => Promise.resolve([])),
}));

jest.mock('expo-file-system', () => ({
  documentDirectory: 'file://test/',
  downloadAsync: jest.fn(() => Promise.resolve({ uri: 'file://test/file.txt' })),
  readAsStringAsync: jest.fn(() => Promise.resolve('')),
  writeAsStringAsync: jest.fn(() => Promise.resolve()),
  deleteAsync: jest.fn(() => Promise.resolve()),
  makeDirectoryAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('expo-network', () => ({
  getNetworkStateAsync: jest.fn(() => Promise.resolve({
    type: 'WIFI',
    isConnected: true,
    isInternetReachable: true,
  })),
}));

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }) => children,
  SafeAreaView: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  useSafeAreaFrame: () => ({ x: 0, y: 0, width: 375, height: 812 }),
}));

// Mock react-native-gesture-handler
jest.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: ({ children }) => children,
  PanGestureHandler: ({ children }) => children,
  TapGestureHandler: ({ children }) => children,
  State: {},
  Directions: {},
}));

// Mock PixelRatio
jest.mock('react-native/Libraries/Utilities/PixelRatio', () => ({
  get: jest.fn(() => 2),
  getFontScale: jest.fn(() => 1),
  getPixelSizeForLayoutSize: jest.fn((layoutSize) => layoutSize * 2),
  roundToNearestPixel: jest.fn((layoutSize) => Math.round(layoutSize * 2) / 2),
}));

// Additional React Native mocks (React Native preset handles most of this)
const mockAppState = {
  currentState: 'active',
  addEventListener: jest.fn((event, callback) => ({
    remove: jest.fn(),
  })),
  removeEventListener: jest.fn(),
};

jest.mock('react-native/Libraries/AppState/AppState', () => mockAppState);

// Create global mocks that can be accessed by tests
global.mockAppState = mockAppState;
global.mockDimensions = {
  get: jest.fn(() => ({ width: 375, height: 812, scale: 2, fontScale: 1 })),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};
global.mockPlatform = {
  OS: 'ios',
  Version: '14.0',
  isPad: false,
  select: jest.fn().mockImplementation((obj) => obj.ios || obj.default),
};

// Mock specific React Native modules to avoid conflicts
jest.mock('react-native', () => ({
  AppState: global.mockAppState,
  Platform: global.mockPlatform,
  Dimensions: global.mockDimensions,
  PixelRatio: {
    get: jest.fn(() => 2),
    getFontScale: jest.fn(() => 1),
    getPixelSizeForLayoutSize: jest.fn((layoutSize) => layoutSize * 2),
    roundToNearestPixel: jest.fn((layoutSize) => Math.round(layoutSize * 2) / 2),
  },
  StyleSheet: {
    create: jest.fn((styles) => styles),
    flatten: jest.fn((style) => style),
  },
  View: 'View',
  Text: 'Text',
  ScrollView: 'ScrollView',
  TouchableOpacity: 'TouchableOpacity',
  Image: 'Image',
}));

// These are now handled by the main react-native mock above

// Mock NativeWind - make it flexible for test overrides
const mockNativeWind = {
  useColorScheme: jest.fn(() => ({
    colorScheme: 'light',
    setColorScheme: jest.fn(),
    toggleColorScheme: jest.fn(),
  })),
};

jest.mock('nativewind', () => mockNativeWind);

// Mock Zustand
jest.mock('zustand', () => ({
  create: jest.fn((fn) => {
    const store = fn(jest.fn(), jest.fn());
    return () => store;
  }),
}));

// Mock RxJS for testing
jest.mock('rxjs', () => ({
  ...jest.requireActual('rxjs'),
  BehaviorSubject: jest.fn().mockImplementation((initialValue) => ({
    value: initialValue,
    next: jest.fn(),
    subscribe: jest.fn(),
    pipe: jest.fn(() => ({ subscribe: jest.fn() })),
    asObservable: jest.fn(),
    complete: jest.fn(),
  })),
  Subject: jest.fn().mockImplementation(() => ({
    next: jest.fn(),
    subscribe: jest.fn(),
    pipe: jest.fn(() => ({ subscribe: jest.fn() })),
    asObservable: jest.fn(),
    complete: jest.fn(),
  })),
  combineLatest: jest.fn(() => ({
    pipe: jest.fn(() => ({ subscribe: jest.fn() })),
    subscribe: jest.fn(),
  })),
  map: jest.fn(() => jest.fn()),
  filter: jest.fn(() => jest.fn()),
  distinctUntilChanged: jest.fn(() => jest.fn()),
}));

// Mock Expo File System
jest.mock('expo-file-system', () => ({
  documentDirectory: 'file://test/',
  downloadAsync: jest.fn(() => Promise.resolve({ uri: 'file://test/download.txt' })),
  readAsStringAsync: jest.fn(() => Promise.resolve('test content')),
  writeAsStringAsync: jest.fn(() => Promise.resolve()),
  deleteAsync: jest.fn(() => Promise.resolve()),
  getInfoAsync: jest.fn(() => Promise.resolve({ exists: true, size: 1024 })),
}));

// Mock Expo Network
jest.mock('expo-network', () => ({
  getNetworkStateAsync: jest.fn(() => Promise.resolve({
    type: 'WIFI',
    isConnected: true,
    isInternetReachable: true,
  })),
}));

// Mock Expo Haptics
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
}));

// Mock Expo Clipboard
jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn(() => Promise.resolve()),
  getStringAsync: jest.fn(() => Promise.resolve('test clipboard content')),
}));

// Global test utilities
global.mockAsyncStorage = () => {
  const storage = {};
  return {
    getItem: jest.fn((key) => Promise.resolve(storage[key] || null)),
    setItem: jest.fn((key, value) => {
      storage[key] = value;
      return Promise.resolve();
    }),
    removeItem: jest.fn((key) => {
      delete storage[key];
      return Promise.resolve();
    }),
    clear: jest.fn(() => {
      Object.keys(storage).forEach(key => delete storage[key]);
      return Promise.resolve();
    }),
  };
};

// Silence console warnings in tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock timers
jest.useFakeTimers();
