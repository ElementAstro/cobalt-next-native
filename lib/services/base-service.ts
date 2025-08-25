/**
 * Base service class providing common functionality for all services
 * Implements service layer architecture for better separation of concerns
 */

import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { filter, map } from 'rxjs/operators';

export interface ServiceEvent<T = any> {
  type: string;
  payload: T;
  timestamp: number;
  source: string;
}

export interface ServiceError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: number;
  source: string;
}

export interface ServiceMetrics {
  operationCount: number;
  errorCount: number;
  lastOperation: number;
  averageResponseTime: number;
  uptime: number;
}

export abstract class BaseService {
  protected readonly serviceName: string;
  protected readonly events$ = new Subject<ServiceEvent>();
  protected readonly errors$ = new Subject<ServiceError>();
  protected readonly metrics$ = new BehaviorSubject<ServiceMetrics>({
    operationCount: 0,
    errorCount: 0,
    lastOperation: 0,
    averageResponseTime: 0,
    uptime: Date.now(),
  });

  private operationTimes: number[] = [];
  private startTime = Date.now();

  constructor(serviceName: string) {
    this.serviceName = serviceName;
  }

  /**
   * Get service events stream
   */
  getEvents$(): Observable<ServiceEvent> {
    return this.events$.asObservable();
  }

  /**
   * Get service errors stream
   */
  getErrors$(): Observable<ServiceError> {
    return this.errors$.asObservable();
  }

  /**
   * Get service metrics stream
   */
  getMetrics$(): Observable<ServiceMetrics> {
    return this.metrics$.asObservable();
  }

  /**
   * Get events of specific type
   */
  getEventsByType$<T>(eventType: string): Observable<ServiceEvent<T>> {
    return this.events$.pipe(
      filter(event => event.type === eventType),
      map(event => event as ServiceEvent<T>)
    );
  }

  /**
   * Emit service event
   */
  protected emitEvent<T>(type: string, payload: T): void {
    const event: ServiceEvent<T> = {
      type,
      payload,
      timestamp: Date.now(),
      source: this.serviceName,
    };
    this.events$.next(event);
  }

  /**
   * Emit service error
   */
  protected emitError(code: string, message: string, details?: Record<string, unknown>): void {
    const error: ServiceError = {
      code,
      message,
      timestamp: Date.now(),
      source: this.serviceName,
      ...(details && { details }),
    };
    this.errors$.next(error);
    this.updateMetrics({ errorCount: this.metrics$.value.errorCount + 1 });
  }

  /**
   * Track operation performance
   */
  protected async trackOperation<T>(
    operationName: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      this.emitEvent('operation:start', { operationName });
      const result = await operation();
      const duration = Date.now() - startTime;
      
      this.recordOperationTime(duration);
      this.emitEvent('operation:complete', { operationName, duration });
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.emitError(
        'operation:failed',
        `Operation ${operationName} failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { operationName, duration, error }
      );
      throw error;
    }
  }

  /**
   * Record operation timing for metrics
   */
  private recordOperationTime(duration: number): void {
    this.operationTimes.push(duration);
    
    // Keep only last 100 operations for average calculation
    if (this.operationTimes.length > 100) {
      this.operationTimes.shift();
    }

    const averageResponseTime = this.operationTimes.reduce((sum, time) => sum + time, 0) / this.operationTimes.length;
    
    this.updateMetrics({
      operationCount: this.metrics$.value.operationCount + 1,
      lastOperation: Date.now(),
      averageResponseTime,
    });
  }

  /**
   * Update service metrics
   */
  private updateMetrics(updates: Partial<ServiceMetrics>): void {
    const currentMetrics = this.metrics$.value;
    this.metrics$.next({
      ...currentMetrics,
      ...updates,
      uptime: Date.now() - this.startTime,
    });
  }

  /**
   * Get current service status
   */
  getStatus(): {
    name: string;
    isHealthy: boolean;
    metrics: ServiceMetrics;
    lastError?: ServiceError;
  } {
    const metrics = this.metrics$.value;
    const errorRate = metrics.operationCount > 0 ? metrics.errorCount / metrics.operationCount : 0;
    
    return {
      name: this.serviceName,
      isHealthy: errorRate < 0.1 && metrics.averageResponseTime < 5000, // Less than 10% error rate and under 5s response time
      metrics,
    };
  }

  /**
   * Cleanup service resources
   */
  dispose(): void {
    this.events$.complete();
    this.errors$.complete();
    this.metrics$.complete();
  }
}

/**
 * Service registry for managing all services
 */
export class ServiceRegistry {
  private static instance: ServiceRegistry;
  private services = new Map<string, BaseService>();

  static getInstance(): ServiceRegistry {
    if (!ServiceRegistry.instance) {
      ServiceRegistry.instance = new ServiceRegistry();
    }
    return ServiceRegistry.instance;
  }

  register<T extends BaseService>(service: T): T {
    this.services.set(service['serviceName'], service);
    return service;
  }

  get<T extends BaseService>(serviceName: string): T | undefined {
    return this.services.get(serviceName) as T;
  }

  getAll(): BaseService[] {
    return Array.from(this.services.values());
  }

  getHealthStatus(): Record<string, any> {
    const status: Record<string, any> = {};
    
    for (const [name, service] of this.services) {
      status[name] = service.getStatus();
    }
    
    return status;
  }

  dispose(): void {
    for (const service of this.services.values()) {
      service.dispose();
    }
    this.services.clear();
  }
}
