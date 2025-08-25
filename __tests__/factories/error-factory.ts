/**
 * Error Factory
 * Creates test data for error handling and testing
 */

export interface ErrorData {
  name: string;
  message: string;
  code?: string | number;
  stack?: string;
  timestamp: string;
  context?: Record<string, any>;
}

export interface ErrorReportData {
  id: string;
  error: ErrorData;
  userAgent: string;
  appVersion: string;
  platform: string;
  userId?: string;
  sessionId: string;
  breadcrumbs: BreadcrumbData[];
  tags: Record<string, string>;
  level: 'error' | 'warning' | 'info' | 'debug';
}

export interface BreadcrumbData {
  timestamp: string;
  message: string;
  category: string;
  level: 'error' | 'warning' | 'info' | 'debug';
  data?: Record<string, any>;
}

export const createError = (overrides: Partial<ErrorData> = {}): ErrorData => ({
  name: 'Error',
  message: 'Test error message',
  timestamp: new Date().toISOString(),
  stack: 'Error: Test error message\n    at test (test.js:1:1)',
  ...overrides,
});

export const createBreadcrumb = (overrides: Partial<BreadcrumbData> = {}): BreadcrumbData => ({
  timestamp: new Date().toISOString(),
  message: 'Test breadcrumb',
  category: 'navigation',
  level: 'info',
  ...overrides,
});

export const createErrorReport = (overrides: Partial<ErrorReportData> = {}): ErrorReportData => ({
  id: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  error: createError(),
  userAgent: 'CobaltApp/1.0.0 (iOS 15.0)',
  appVersion: '1.0.0',
  platform: 'ios',
  sessionId: `session-${Date.now()}`,
  breadcrumbs: [],
  tags: {},
  level: 'error',
  ...overrides,
});

export const createNetworkError = (): ErrorData => 
  createError({
    name: 'NetworkError',
    message: 'Network request failed',
    code: 'NETWORK_ERROR',
    context: {
      url: 'https://api.example.com/data',
      method: 'GET',
      status: 0,
    },
  });

export const createValidationError = (field: string = 'email'): ErrorData => 
  createError({
    name: 'ValidationError',
    message: `Validation failed for field: ${field}`,
    code: 'VALIDATION_ERROR',
    context: {
      field,
      value: 'invalid-value',
      rules: ['required', 'email'],
    },
  });

export const createTimeoutError = (): ErrorData => 
  createError({
    name: 'TimeoutError',
    message: 'Operation timed out',
    code: 'TIMEOUT_ERROR',
    context: {
      timeout: 30000,
      operation: 'api-request',
    },
  });

export const createPermissionError = (): ErrorData => 
  createError({
    name: 'PermissionError',
    message: 'Permission denied',
    code: 'PERMISSION_DENIED',
    context: {
      permission: 'camera',
      requested: true,
      granted: false,
    },
  });

export const createStorageError = (): ErrorData => 
  createError({
    name: 'StorageError',
    message: 'Storage operation failed',
    code: 'STORAGE_ERROR',
    context: {
      operation: 'write',
      key: 'user-settings',
      size: 1024,
    },
  });

export const createParseError = (): ErrorData => 
  createError({
    name: 'SyntaxError',
    message: 'Unexpected token in JSON',
    code: 'PARSE_ERROR',
    context: {
      input: '{"invalid": json}',
      position: 15,
    },
  });

export const createJavaScriptError = (): ErrorData => 
  createError({
    name: 'TypeError',
    message: 'Cannot read property \'length\' of undefined',
    code: 'JS_ERROR',
    stack: 'TypeError: Cannot read property \'length\' of undefined\n    at Component.render (Component.js:25:10)',
    context: {
      component: 'UserList',
      props: { users: undefined },
    },
  });

export const createNativeError = (): ErrorData => 
  createError({
    name: 'NativeError',
    message: 'Native module error',
    code: 'NATIVE_ERROR',
    context: {
      module: 'FileSystem',
      method: 'writeFile',
      nativeCode: -1001,
    },
  });

export const createNavigationBreadcrumb = (screen: string): BreadcrumbData => 
  createBreadcrumb({
    message: `Navigated to ${screen}`,
    category: 'navigation',
    level: 'info',
    data: { screen, timestamp: Date.now() },
  });

export const createUserActionBreadcrumb = (action: string): BreadcrumbData => 
  createBreadcrumb({
    message: `User ${action}`,
    category: 'user',
    level: 'info',
    data: { action, timestamp: Date.now() },
  });

export const createNetworkBreadcrumb = (url: string, method: string = 'GET'): BreadcrumbData => 
  createBreadcrumb({
    message: `${method} ${url}`,
    category: 'network',
    level: 'info',
    data: { url, method, timestamp: Date.now() },
  });

export const createErrorBreadcrumb = (error: string): BreadcrumbData => 
  createBreadcrumb({
    message: `Error: ${error}`,
    category: 'error',
    level: 'error',
    data: { error, timestamp: Date.now() },
  });

export const createDetailedErrorReport = (): ErrorReportData => 
  createErrorReport({
    error: createJavaScriptError(),
    breadcrumbs: [
      createNavigationBreadcrumb('Home'),
      createUserActionBreadcrumb('tapped download button'),
      createNetworkBreadcrumb('https://api.example.com/download'),
      createErrorBreadcrumb('Network request failed'),
    ],
    tags: {
      environment: 'production',
      feature: 'downloads',
      severity: 'high',
    },
    userId: 'user-123',
  });

export const createWarningReport = (): ErrorReportData => 
  createErrorReport({
    error: createError({
      name: 'Warning',
      message: 'Deprecated API usage detected',
      code: 'DEPRECATION_WARNING',
    }),
    level: 'warning',
    tags: {
      category: 'deprecation',
      api: 'old-download-api',
    },
  });

export const createCriticalErrorReport = (): ErrorReportData => 
  createErrorReport({
    error: createError({
      name: 'CriticalError',
      message: 'Application crashed',
      code: 'CRITICAL_ERROR',
    }),
    level: 'error',
    tags: {
      severity: 'critical',
      crash: 'true',
    },
  });
