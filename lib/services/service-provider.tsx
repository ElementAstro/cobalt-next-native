/**
 * Service provider for React context-based service injection
 * Provides unified access to all services throughout the app
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppService } from './app-service';
import { DownloadService } from './download-service';
import { ScannerService } from './scanner-service';
import { ServiceRegistry } from './base-service';

interface ServiceContextValue {
  appService: AppService;
  downloadService: DownloadService;
  scannerService: ScannerService;
  registry: ServiceRegistry;
  isInitialized: boolean;
}

const ServiceContext = createContext<ServiceContextValue | null>(null);

interface ServiceProviderProps {
  children: React.ReactNode;
}

export function ServiceProvider({ children }: ServiceProviderProps) {
  const [services, setServices] = useState<ServiceContextValue | null>(null);

  useEffect(() => {
    // Initialize services
    const appService = new AppService();
    const downloadService = appService.getDownloadService();
    const scannerService = appService.getScannerService();
    const registry = ServiceRegistry.getInstance();

    setServices({
      appService,
      downloadService,
      scannerService,
      registry,
      isInitialized: true,
    });

    // Cleanup on unmount
    return () => {
      registry.dispose();
    };
  }, []);

  if (!services) {
    return null; // Or loading component
  }

  return (
    <ServiceContext.Provider value={services}>
      {children}
    </ServiceContext.Provider>
  );
}

/**
 * Hook to access all services
 */
export function useServices(): ServiceContextValue {
  const context = useContext(ServiceContext);
  if (!context) {
    throw new Error('useServices must be used within a ServiceProvider');
  }
  return context;
}

/**
 * Hook to access app service specifically
 */
export function useAppService(): AppService {
  const { appService } = useServices();
  return appService;
}

/**
 * Hook to access download service specifically
 */
export function useDownloadService(): DownloadService {
  const { downloadService } = useServices();
  return downloadService;
}

/**
 * Hook to access scanner service specifically
 */
export function useScannerService(): ScannerService {
  const { scannerService } = useServices();
  return scannerService;
}

/**
 * Hook for unified app status
 */
export function useAppStatus() {
  const appService = useAppService();
  const [status, setStatus] = useState<any>(null);

  useEffect(() => {
    const subscription = appService.getAppStatus$().subscribe(setStatus);
    return () => subscription.unsubscribe();
  }, [appService]);

  return status;
}

/**
 * Hook for unified dashboard data
 */
export function useDashboardData() {
  const appService = useAppService();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const subscription = appService.getDashboardData$().subscribe(setData);
    return () => subscription.unsubscribe();
  }, [appService]);

  return data;
}

/**
 * Hook for global search functionality
 */
export function useGlobalSearch() {
  const appService = useAppService();
  const [isSearching, setIsSearching] = useState(false);

  const search = async (query: string, filters?: any) => {
    setIsSearching(true);
    try {
      const results = await appService.search(query, filters);
      return results;
    } finally {
      setIsSearching(false);
    }
  };

  return { search, isSearching };
}

/**
 * Hook for unified settings management
 */
export function useUnifiedSettings() {
  const appService = useAppService();
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    const subscription = appService.getUnifiedSettings$().subscribe(setSettings);
    return () => subscription.unsubscribe();
  }, [appService]);

  const updateSettings = (updates: any) => {
    appService.updateUnifiedSettings(updates);
  };

  return { settings, updateSettings };
}

/**
 * Hook for bulk operations
 */
export function useBulkOperations() {
  const appService = useAppService();
  const [isProcessing, setIsProcessing] = useState(false);

  const performBulkOperation = async (
    operation: 'pause' | 'resume' | 'cancel' | 'delete',
    targets: { type: 'download' | 'scan'; ids: string[] }[]
  ) => {
    setIsProcessing(true);
    try {
      await appService.bulkOperation(operation, targets);
    } finally {
      setIsProcessing(false);
    }
  };

  return { performBulkOperation, isProcessing };
}

/**
 * Hook for service events
 */
export function useServiceEvents(eventType?: string) {
  const { registry } = useServices();
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    const subscriptions = registry.getAll().map(service => {
      const stream = eventType 
        ? service.getEventsByType$(eventType)
        : service.getEvents$();
      
      return stream.subscribe(event => {
        setEvents(prev => [event, ...prev.slice(0, 99)]); // Keep last 100 events
      });
    });

    return () => {
      subscriptions.forEach(sub => sub.unsubscribe());
    };
  }, [registry, eventType]);

  return events;
}

/**
 * Hook for service health monitoring
 */
export function useServiceHealth() {
  const { registry } = useServices();
  const [health, setHealth] = useState<any>({});

  useEffect(() => {
    const updateHealth = () => {
      setHealth(registry.getHealthStatus());
    };

    updateHealth();
    const interval = setInterval(updateHealth, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [registry]);

  return health;
}
