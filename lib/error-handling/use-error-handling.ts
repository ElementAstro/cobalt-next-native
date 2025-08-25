/**
 * React hooks for centralized error handling
 * Provides easy access to error management throughout the app
 */

import { useState, useEffect, useCallback } from 'react';
import { ErrorManager, type AppError, type ErrorStats, type ErrorNotification } from './error-manager';

/**
 * Hook for logging and managing errors
 */
export function useErrorHandler(): {
  logError: (
    code: string,
    message: string,
    source: string,
    severity?: AppError['severity'],
    details?: Record<string, any>,
    context?: AppError['context']
  ) => string;
  logJSError: (error: Error, source: string, context?: AppError['context']) => string;
  logNetworkError: (
    url: string,
    status: number,
    statusText: string,
    source: string,
    context?: AppError['context']
  ) => string;
  logValidationError: (
    field: string,
    value: any,
    rule: string,
    source: string,
    context?: AppError['context']
  ) => string;
  resolveError: (errorId: string) => void;
  retryError: (errorId: string, retryFn?: () => Promise<void>) => void;
} {
  const manager = ErrorManager.getInstance();

  return {
    logError: manager.logError.bind(manager),
    logJSError: manager.logJSError.bind(manager),
    logNetworkError: manager.logNetworkError.bind(manager),
    logValidationError: manager.logValidationError.bind(manager),
    resolveError: manager.resolveError.bind(manager),
    retryError: manager.retryError.bind(manager),
  };
}

/**
 * Hook for accessing error list and statistics
 */
export function useErrors(): {
  errors: AppError[];
  stats: ErrorStats;
  clearErrors: () => void;
  clearResolvedErrors: () => void;
  exportErrors: () => string;
} {
  const manager = ErrorManager.getInstance();
  const [errors, setErrors] = useState<AppError[]>([]);
  const [stats, setStats] = useState<ErrorStats>({
    total: 0,
    bySource: {},
    bySeverity: {},
    recentErrors: [],
    criticalErrors: [],
    unresolved: 0,
  });

  useEffect(() => {
    const subscription = manager.getErrors$().subscribe(newErrors => {
      setErrors(newErrors);
      setStats(manager.getStats());
    });

    return () => subscription.unsubscribe();
  }, [manager]);

  return {
    errors,
    stats,
    clearErrors: manager.clearErrors.bind(manager),
    clearResolvedErrors: manager.clearResolvedErrors.bind(manager),
    exportErrors: manager.exportErrors.bind(manager),
  };
}

/**
 * Hook for error notifications
 */
export function useErrorNotifications(): {
  notifications: ErrorNotification[];
  dismissNotification: (id: string) => void;
  clearNotifications: () => void;
} {
  const manager = ErrorManager.getInstance();
  const [notifications, setNotifications] = useState<ErrorNotification[]>([]);

  useEffect(() => {
    const subscription = manager.getNotifications$().subscribe(setNotifications);
    return () => subscription.unsubscribe();
  }, [manager]);

  return {
    notifications,
    dismissNotification: manager.dismissNotification.bind(manager),
    clearNotifications: manager.clearNotifications.bind(manager),
  };
}

/**
 * Hook for async operations with automatic error handling
 */
export function useAsyncOperation<T = any>(): {
  execute: (
    operation: () => Promise<T>,
    options?: {
      source?: string;
      onSuccess?: (result: T) => void;
      onError?: (error: Error) => void;
      retryable?: boolean;
    }
  ) => Promise<T | null>;
  isLoading: boolean;
  error: AppError | null;
  retry: () => Promise<T | null>;
} {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  const [lastOperation, setLastOperation] = useState<{
    operation: () => Promise<T>;
    options?: any;
  } | null>(null);
  
  const { logJSError, logNetworkError } = useErrorHandler();

  const execute = useCallback(async (
    operation: () => Promise<T>,
    options: {
      source?: string;
      onSuccess?: (result: T) => void;
      onError?: (error: Error) => void;
      retryable?: boolean;
    } = {}
  ): Promise<T | null> => {
    setIsLoading(true);
    setError(null);
    setLastOperation({ operation, options });

    try {
      const result = await operation();
      options.onSuccess?.(result);
      return result;
    } catch (err) {
      const error = err as Error;
      
      // Log the error
      const errorId = logJSError(error, options.source || 'AsyncOperation');
      
      // Create error object for state
      const appError: AppError = {
        id: errorId,
        code: 'ASYNC_OPERATION_ERROR',
        message: error.message,
        source: options.source || 'AsyncOperation',
        severity: 'medium',
        timestamp: Date.now(),
        resolved: false,
      };
      
      setError(appError);
      options.onError?.(error);
      
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [logJSError]);

  const retry = useCallback(async (): Promise<T | null> => {
    if (lastOperation) {
      return execute(lastOperation.operation, lastOperation.options);
    }
    return null;
  }, [lastOperation, execute]);

  return {
    execute,
    isLoading,
    error,
    retry,
  };
}

/**
 * Hook for form validation with error handling
 */
export function useFormValidation<T extends Record<string, any>>(
  initialValues: T,
  validationRules: Record<keyof T, (value: any) => string | null>
): {
  values: T;
  errors: Record<keyof T, string | null>;
  isValid: boolean;
  setValue: (field: keyof T, value: any) => void;
  setValues: (values: Partial<T>) => void;
  validate: (field?: keyof T) => boolean;
  reset: () => void;
} {
  const [values, setValuesState] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Record<keyof T, string | null>>({} as any);
  const { logValidationError } = useErrorHandler();

  const setValue = useCallback((field: keyof T, value: any) => {
    setValuesState(prev => ({ ...prev, [field]: value }));
    
    // Validate field
    const rule = validationRules[field];
    if (rule) {
      const error = rule(value);
      setErrors(prev => ({ ...prev, [field]: error }));
      
      if (error) {
        logValidationError(
          String(field),
          value,
          error,
          'FormValidation'
        );
      }
    }
  }, [validationRules, logValidationError]);

  const setValues = useCallback((newValues: Partial<T>) => {
    setValuesState(prev => ({ ...prev, ...newValues }));
  }, []);

  const validate = useCallback((field?: keyof T): boolean => {
    if (field) {
      const rule = validationRules[field];
      if (rule) {
        const error = rule(values[field]);
        setErrors(prev => ({ ...prev, [field]: error }));
        return !error;
      }
      return true;
    } else {
      // Validate all fields
      const newErrors: Record<keyof T, string | null> = {} as any;
      let isValid = true;
      
      for (const [fieldName, rule] of Object.entries(validationRules)) {
        const error = rule(values[fieldName as keyof T]);
        newErrors[fieldName as keyof T] = error;
        if (error) {
          isValid = false;
          logValidationError(
            fieldName,
            values[fieldName as keyof T],
            error,
            'FormValidation'
          );
        }
      }
      
      setErrors(newErrors);
      return isValid;
    }
  }, [values, validationRules, logValidationError]);

  const reset = useCallback(() => {
    setValuesState(initialValues);
    setErrors({} as any);
  }, [initialValues]);

  const isValid = Object.values(errors).every(error => !error);

  return {
    values,
    errors,
    isValid,
    setValue,
    setValues,
    validate,
    reset,
  };
}

/**
 * Hook for network requests with automatic error handling
 */
export function useNetworkRequest(): {
  request: <T = any>(
    url: string,
    options?: RequestInit & {
      source?: string;
      timeout?: number;
    }
  ) => Promise<T | null>;
  isLoading: boolean;
  error: AppError | null;
} {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  const { logNetworkError, logJSError } = useErrorHandler();

  const request = useCallback(async <T = any>(
    url: string,
    options: RequestInit & {
      source?: string;
      timeout?: number;
    } = {}
  ): Promise<T | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const controller = new AbortController();
      const timeoutId = options.timeout 
        ? setTimeout(() => controller.abort(), options.timeout)
        : null;

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      if (!response.ok) {
        const errorId = logNetworkError(
          url,
          response.status,
          response.statusText,
          options.source || 'NetworkRequest'
        );
        
        const appError: AppError = {
          id: errorId,
          code: 'NETWORK_ERROR',
          message: `Network request failed: ${response.status} ${response.statusText}`,
          source: options.source || 'NetworkRequest',
          severity: response.status >= 500 ? 'high' : 'medium',
          timestamp: Date.now(),
          resolved: false,
          details: {
            url,
            status: response.status,
            statusText: response.statusText,
          },
        };
        
        setError(appError);
        return null;
      }

      const data = await response.json();
      return data as T;
    } catch (err) {
      const error = err as Error;
      
      if (error.name === 'AbortError') {
        const errorId = logJSError(error, options.source || 'NetworkRequest');
        const appError: AppError = {
          id: errorId,
          code: 'TIMEOUT_ERROR',
          message: 'Request timed out',
          source: options.source || 'NetworkRequest',
          severity: 'medium',
          timestamp: Date.now(),
          resolved: false,
        };
        setError(appError);
      } else {
        const errorId = logJSError(error, options.source || 'NetworkRequest');
        const appError: AppError = {
          id: errorId,
          code: 'NETWORK_ERROR',
          message: error.message,
          source: options.source || 'NetworkRequest',
          severity: 'medium',
          timestamp: Date.now(),
          resolved: false,
        };
        setError(appError);
      }
      
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [logNetworkError, logJSError]);

  return {
    request,
    isLoading,
    error,
  };
}
