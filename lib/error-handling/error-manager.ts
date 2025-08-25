/**
 * Centralized error handling and logging system
 * Provides unified error management across all app features
 */

import { BehaviorSubject, Observable } from 'rxjs';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AppError {
  id: string;
  code: string;
  message: string;
  details?: Record<string, any>;
  source: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
  userId?: string;
  sessionId?: string;
  stackTrace?: string;
  context?: {
    screen?: string;
    action?: string;
    userAgent?: string;
    networkState?: string;
  };
  resolved?: boolean;
  resolvedAt?: number;
  retryCount?: number;
}

export interface ErrorStats {
  total: number;
  bySource: Record<string, number>;
  bySeverity: Record<string, number>;
  recentErrors: AppError[];
  criticalErrors: AppError[];
  unresolved: number;
}

export interface ErrorNotification {
  id: string;
  error: AppError;
  type: 'toast' | 'modal' | 'banner' | 'silent';
  title: string;
  message: string;
  actions?: Array<{
    label: string;
    action: () => void;
    style?: 'default' | 'destructive' | 'cancel';
  }>;
  autoHide?: boolean;
  duration?: number;
}

export class ErrorManager {
  private static instance: ErrorManager;
  private errors$ = new BehaviorSubject<AppError[]>([]);
  private notifications$ = new BehaviorSubject<ErrorNotification[]>([]);
  private storageKey = 'cobalt-errors-v1';
  private maxStoredErrors = 1000;
  private sessionId = Date.now().toString();

  static getInstance(): ErrorManager {
    if (!ErrorManager.instance) {
      ErrorManager.instance = new ErrorManager();
    }
    return ErrorManager.instance;
  }

  private constructor() {
    this.loadFromStorage();
    this.setupGlobalErrorHandlers();
  }

  /**
   * Get all errors as observable
   */
  getErrors$(): Observable<AppError[]> {
    return this.errors$.asObservable();
  }

  /**
   * Get error notifications as observable
   */
  getNotifications$(): Observable<ErrorNotification[]> {
    return this.notifications$.asObservable();
  }

  /**
   * Log an error
   */
  logError(
    code: string,
    message: string,
    source: string,
    severity: AppError['severity'] = 'medium',
    details?: Record<string, any>,
    context?: AppError['context']
  ): string {
    const error: AppError = {
      id: this.generateErrorId(),
      code,
      message,
      source,
      severity,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      resolved: false,
      retryCount: 0,
      ...(details && { details }),
      ...(context && { context }),
    };

    // Add stack trace in development
    if (__DEV__) {
      const stack = new Error().stack;
      if (stack) {
        error.stackTrace = stack;
      }
    }

    this.addError(error);
    this.createNotification(error);
    
    return error.id;
  }

  /**
   * Log JavaScript error
   */
  logJSError(error: Error, source: string, context?: AppError['context']): string {
    return this.logError(
      'JS_ERROR',
      error.message,
      source,
      'high',
      {
        name: error.name,
        stack: error.stack,
      },
      context
    );
  }

  /**
   * Log network error
   */
  logNetworkError(
    url: string,
    status: number,
    statusText: string,
    source: string,
    context?: AppError['context']
  ): string {
    return this.logError(
      'NETWORK_ERROR',
      `Network request failed: ${status} ${statusText}`,
      source,
      status >= 500 ? 'high' : 'medium',
      {
        url,
        status,
        statusText,
      },
      context
    );
  }

  /**
   * Log validation error
   */
  logValidationError(
    field: string,
    value: any,
    rule: string,
    source: string,
    context?: AppError['context']
  ): string {
    return this.logError(
      'VALIDATION_ERROR',
      `Validation failed for ${field}: ${rule}`,
      source,
      'low',
      {
        field,
        value,
        rule,
      },
      context
    );
  }

  /**
   * Mark error as resolved
   */
  resolveError(errorId: string): void {
    const errors = this.errors$.value;
    const errorIndex = errors.findIndex(e => e.id === errorId);
    
    if (errorIndex !== -1) {
      const updatedErrors = [...errors];
      const currentError = updatedErrors[errorIndex];
      if (currentError) {
        updatedErrors[errorIndex] = {
          ...currentError,
          resolved: true,
          resolvedAt: Date.now(),
        };
      }
      
      this.errors$.next(updatedErrors);
      this.saveToStorage();
    }
  }

  /**
   * Retry failed operation
   */
  retryError(errorId: string, retryFn?: () => Promise<void>): void {
    const errors = this.errors$.value;
    const errorIndex = errors.findIndex(e => e.id === errorId);
    
    if (errorIndex !== -1) {
      const updatedErrors = [...errors];
      const currentError = updatedErrors[errorIndex];
      if (currentError) {
        updatedErrors[errorIndex] = {
          ...currentError,
          retryCount: (currentError.retryCount || 0) + 1,
        };
      }
      
      this.errors$.next(updatedErrors);
      
      if (retryFn) {
        retryFn().catch(error => {
          this.logJSError(error, 'ErrorManager.retryError');
        });
      }
    }
  }

  /**
   * Clear all errors
   */
  clearErrors(): void {
    this.errors$.next([]);
    this.saveToStorage();
  }

  /**
   * Clear resolved errors
   */
  clearResolvedErrors(): void {
    const errors = this.errors$.value.filter(e => !e.resolved);
    this.errors$.next(errors);
    this.saveToStorage();
  }

  /**
   * Get error statistics
   */
  getStats(): ErrorStats {
    const errors = this.errors$.value;
    const now = Date.now();
    const recentThreshold = now - (24 * 60 * 60 * 1000); // 24 hours

    const stats: ErrorStats = {
      total: errors.length,
      bySource: {},
      bySeverity: {},
      recentErrors: errors.filter(e => e.timestamp > recentThreshold).slice(0, 10),
      criticalErrors: errors.filter(e => e.severity === 'critical' && !e.resolved),
      unresolved: errors.filter(e => !e.resolved).length,
    };

    // Count by source
    errors.forEach(error => {
      stats.bySource[error.source] = (stats.bySource[error.source] || 0) + 1;
    });

    // Count by severity
    errors.forEach(error => {
      stats.bySeverity[error.severity] = (stats.bySeverity[error.severity] || 0) + 1;
    });

    return stats;
  }

  /**
   * Export errors for debugging
   */
  exportErrors(): string {
    const errors = this.errors$.value;
    const stats = this.getStats();
    
    return JSON.stringify({
      timestamp: Date.now(),
      sessionId: this.sessionId,
      stats,
      errors: errors.slice(0, 100), // Export last 100 errors
    }, null, 2);
  }

  /**
   * Dismiss notification
   */
  dismissNotification(notificationId: string): void {
    const notifications = this.notifications$.value.filter(n => n.id !== notificationId);
    this.notifications$.next(notifications);
  }

  /**
   * Clear all notifications
   */
  clearNotifications(): void {
    this.notifications$.next([]);
  }

  // Private methods
  private addError(error: AppError): void {
    const errors = [error, ...this.errors$.value];
    
    // Keep only the most recent errors
    if (errors.length > this.maxStoredErrors) {
      errors.splice(this.maxStoredErrors);
    }
    
    this.errors$.next(errors);
    this.saveToStorage();
  }

  private createNotification(error: AppError): void {
    const actions = this.getNotificationActions(error);
    const duration = this.getNotificationDuration(error);

    const notification: ErrorNotification = {
      id: this.generateNotificationId(),
      error,
      type: this.getNotificationType(error),
      title: this.getNotificationTitle(error),
      message: this.getNotificationMessage(error),
      autoHide: error.severity !== 'critical',
      ...(actions && { actions }),
      ...(duration && { duration }),
    };

    const notifications = [notification, ...this.notifications$.value];
    this.notifications$.next(notifications);

    // Auto-dismiss non-critical notifications
    if (notification.autoHide && notification.duration) {
      setTimeout(() => {
        this.dismissNotification(notification.id);
      }, notification.duration);
    }
  }

  private getNotificationType(error: AppError): ErrorNotification['type'] {
    switch (error.severity) {
      case 'critical':
        return 'modal';
      case 'high':
        return 'banner';
      case 'medium':
        return 'toast';
      case 'low':
        return 'silent';
      default:
        return 'toast';
    }
  }

  private getNotificationTitle(error: AppError): string {
    switch (error.severity) {
      case 'critical':
        return 'Critical Error';
      case 'high':
        return 'Error';
      case 'medium':
        return 'Warning';
      case 'low':
        return 'Notice';
      default:
        return 'Error';
    }
  }

  private getNotificationMessage(error: AppError): string {
    // Provide user-friendly error messages
    switch (error.code) {
      case 'NETWORK_ERROR':
        return 'Network connection failed. Please check your internet connection.';
      case 'VALIDATION_ERROR':
        return 'Please check your input and try again.';
      case 'JS_ERROR':
        return 'An unexpected error occurred. The app will continue to work.';
      default:
        return error.message;
    }
  }

  private getNotificationActions(error: AppError): ErrorNotification['actions'] {
    const actions: ErrorNotification['actions'] = [];

    // Add retry action for retryable errors
    if (this.isRetryable(error)) {
      actions.push({
        label: 'Retry',
        action: () => this.retryError(error.id),
        style: 'default',
      });
    }

    // Add dismiss action
    actions.push({
      label: 'Dismiss',
      action: () => this.resolveError(error.id),
      style: 'cancel',
    });

    return actions;
  }

  private getNotificationDuration(error: AppError): number {
    switch (error.severity) {
      case 'critical':
        return 0; // Don't auto-hide
      case 'high':
        return 10000; // 10 seconds
      case 'medium':
        return 5000; // 5 seconds
      case 'low':
        return 3000; // 3 seconds
      default:
        return 5000;
    }
  }

  private isRetryable(error: AppError): boolean {
    return ['NETWORK_ERROR', 'TIMEOUT_ERROR'].includes(error.code) && 
           (error.retryCount || 0) < 3;
  }

  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateNotificationId(): string {
    return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private setupGlobalErrorHandlers(): void {
    // Handle unhandled promise rejections
    if (typeof window !== 'undefined') {
      window.addEventListener('unhandledrejection', (event) => {
        this.logError(
          'UNHANDLED_PROMISE_REJECTION',
          event.reason?.message || 'Unhandled promise rejection',
          'GlobalErrorHandler',
          'high',
          {
            reason: event.reason,
          }
        );
      });
    }
  }

  private async saveToStorage(): Promise<void> {
    try {
      const errors = this.errors$.value.slice(0, 100); // Save only recent errors
      await AsyncStorage.setItem(this.storageKey, JSON.stringify(errors));
    } catch (error) {
      console.error('Failed to save errors to storage:', error);
    }
  }

  private async loadFromStorage(): Promise<void> {
    try {
      const data = await AsyncStorage.getItem(this.storageKey);
      if (data) {
        const errors = JSON.parse(data) as AppError[];
        this.errors$.next(errors);
      }
    } catch (error) {
      console.error('Failed to load errors from storage:', error);
    }
  }
}
