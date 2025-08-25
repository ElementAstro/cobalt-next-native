/**
 * Service Factory
 * Creates test data for service layer testing
 */

// Note: RxJS is mocked in jest.setup.js, so we import the actual types for TypeScript
// but the runtime behavior will use the mocked versions

export interface ServiceEventData {
  type: string;
  payload: any;
  timestamp: string;
  source: string;
}

export interface ServiceMetricsData {
  operationCount: number;
  errorCount: number;
  averageResponseTime: number;
  lastOperationTime: string;
  memoryUsage: number;
  activeConnections: number;
}

export interface ServiceStateData {
  isInitialized: boolean;
  isActive: boolean;
  lastError: Error | null;
  metrics: ServiceMetricsData;
  events: ServiceEventData[];
}

export const createServiceEvent = (overrides: Partial<ServiceEventData> = {}): ServiceEventData => ({
  type: 'test-event',
  payload: { data: 'test' },
  timestamp: new Date().toISOString(),
  source: 'test-service',
  ...overrides,
});

export const createServiceMetrics = (overrides: Partial<ServiceMetricsData> = {}): ServiceMetricsData => ({
  operationCount: 0,
  errorCount: 0,
  averageResponseTime: 0,
  lastOperationTime: new Date().toISOString(),
  memoryUsage: 0,
  activeConnections: 0,
  ...overrides,
});

export const createServiceState = (overrides: Partial<ServiceStateData> = {}): ServiceStateData => ({
  isInitialized: false,
  isActive: false,
  lastError: null,
  metrics: createServiceMetrics(),
  events: [],
  ...overrides,
});

export const createMockBehaviorSubject = <T>(initialValue: T) => {
  return {
    value: initialValue,
    next: jest.fn(),
    subscribe: jest.fn(),
    pipe: jest.fn(() => ({ subscribe: jest.fn() })),
    asObservable: jest.fn(),
    complete: jest.fn(),
  };
};

export const createMockSubject = <T>() => {
  return {
    next: jest.fn(),
    subscribe: jest.fn(),
    pipe: jest.fn(() => ({ subscribe: jest.fn() })),
    asObservable: jest.fn(),
    complete: jest.fn(),
  };
};

export const createMockBaseService = () => ({
  initialize: jest.fn(() => Promise.resolve()),
  destroy: jest.fn(() => Promise.resolve()),
  emit: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
  getMetrics: jest.fn(() => createServiceMetrics()),
  resetMetrics: jest.fn(),
  isInitialized: jest.fn(() => true),
  isActive: jest.fn(() => true),
});

export const createMockAppService = () => ({
  ...createMockBaseService(),
  updateTheme: jest.fn(),
  updateSettings: jest.fn(),
  getAppInfo: jest.fn(() => ({
    version: '1.0.0',
    buildNumber: '1',
    platform: 'ios',
  })),
  checkForUpdates: jest.fn(() => Promise.resolve(false)),
  reportError: jest.fn(),
});

export const createMockDownloadService = () => ({
  ...createMockBaseService(),
  startDownload: jest.fn(() => Promise.resolve('download-id')),
  pauseDownload: jest.fn(() => Promise.resolve()),
  resumeDownload: jest.fn(() => Promise.resolve()),
  cancelDownload: jest.fn(() => Promise.resolve()),
  getDownloadProgress: jest.fn(() => ({ progress: 0, speed: 0 })),
  getActiveDownloads: jest.fn(() => []),
  clearCompleted: jest.fn(() => Promise.resolve()),
});

export const createMockScannerService = () => ({
  ...createMockBaseService(),
  startScan: jest.fn(() => Promise.resolve('scan-id')),
  stopScan: jest.fn(() => Promise.resolve()),
  getScanResults: jest.fn(() => []),
  getActiveScan: jest.fn(() => null),
  exportResults: jest.fn(() => Promise.resolve('export-path')),
  importResults: jest.fn(() => Promise.resolve()),
});

export const createServiceError = (message: string = 'Test service error'): Error => {
  const error = new Error(message);
  error.name = 'ServiceError';
  return error;
};

export const createServiceNetworkError = (): Error => {
  const error = new Error('Service network request failed');
  error.name = 'ServiceNetworkError';
  return error;
};

export const createServiceTimeoutError = (): Error => {
  const error = new Error('Service operation timed out');
  error.name = 'ServiceTimeoutError';
  return error;
};

export const createServiceValidationError = (field: string): Error => {
  const error = new Error(`Service validation failed for field: ${field}`);
  error.name = 'ServiceValidationError';
  return error;
};

export const createHighPerformanceMetrics = (): ServiceMetricsData => 
  createServiceMetrics({
    operationCount: 1000,
    errorCount: 5,
    averageResponseTime: 150,
    memoryUsage: 256,
    activeConnections: 10,
  });

export const createLowPerformanceMetrics = (): ServiceMetricsData => 
  createServiceMetrics({
    operationCount: 50,
    errorCount: 25,
    averageResponseTime: 2000,
    memoryUsage: 1024,
    activeConnections: 1,
  });

export const createServiceEventBatch = (count: number, type: string = 'batch-event'): ServiceEventData[] => 
  Array.from({ length: count }, (_, index) => 
    createServiceEvent({
      type,
      payload: { index, data: `batch-${index}` },
      timestamp: new Date(Date.now() + index * 1000).toISOString(),
    })
  );

export const createInitializedServiceState = (): ServiceStateData => 
  createServiceState({
    isInitialized: true,
    isActive: true,
    metrics: createServiceMetrics({
      operationCount: 1,
      lastOperationTime: new Date().toISOString(),
    }),
  });

export const createErrorServiceState = (error: Error = createServiceError()): ServiceStateData => 
  createServiceState({
    isInitialized: true,
    isActive: false,
    lastError: error,
    metrics: createServiceMetrics({
      errorCount: 1,
    }),
  });
