/**
 * App service coordinating all application services and providing unified interface
 * Implements cross-service communication and global app state management
 */

import { BaseService, ServiceRegistry } from './base-service';
import { DownloadService } from './download-service';
import { ScannerService } from './scanner-service';
import { Observable, BehaviorSubject, combineLatest } from 'rxjs';
import { map, distinctUntilChanged } from 'rxjs/operators';
import type { NetworkState, DeviceInfo } from '~/types/common';

export interface AppStatus {
  isHealthy: boolean;
  services: Record<string, any>;
  performance: {
    memoryUsage: number;
    cpuUsage: number;
    networkLatency: number;
  };
  features: {
    downloadsActive: number;
    scansActive: number;
    totalOperations: number;
  };
}

export interface UnifiedSettings {
  app: {
    theme: 'light' | 'dark' | 'auto';
    language: string;
    notifications: boolean;
    analytics: boolean;
  };
  downloads: {
    maxConcurrent: number;
    autoResume: boolean;
    location: string;
  };
  scanner: {
    timeout: number;
    concurrency: number;
    stealthMode: boolean;
  };
  performance: {
    enableMonitoring: boolean;
    optimizeForBattery: boolean;
    backgroundProcessing: boolean;
  };
}

export interface GlobalSearchResult {
  type: 'download' | 'scan' | 'setting' | 'error';
  id: string;
  title: string;
  description: string;
  metadata: Record<string, any>;
  relevance: number;
}

export class AppService extends BaseService {
  private downloadService: DownloadService;
  private scannerService: ScannerService;
  private registry: ServiceRegistry;

  private networkState$ = new BehaviorSubject<NetworkState>({
    isConnected: true,
    isInternetReachable: null,
    type: null,
  });

  private deviceInfo$ = new BehaviorSubject<DeviceInfo | null>(null);
  private isAppActive$ = new BehaviorSubject<boolean>(true);

  private unifiedSettings$ = new BehaviorSubject<UnifiedSettings>({
    app: {
      theme: 'auto',
      language: 'en',
      notifications: true,
      analytics: true,
    },
    downloads: {
      maxConcurrent: 3,
      autoResume: true,
      location: 'Downloads',
    },
    scanner: {
      timeout: 5000,
      concurrency: 50,
      stealthMode: false,
    },
    performance: {
      enableMonitoring: true,
      optimizeForBattery: false,
      backgroundProcessing: true,
    },
  });

  constructor() {
    super('AppService');
    
    this.registry = ServiceRegistry.getInstance();
    this.downloadService = this.registry.register(new DownloadService());
    this.scannerService = this.registry.register(new ScannerService());
    
    this.setupServiceCommunication();
  }

  /**
   * Get unified app status
   */
  getAppStatus$(): Observable<AppStatus> {
    return combineLatest([
      this.downloadService.getStats$(),
      this.scannerService.getOverview$(),
      this.networkState$,
      this.isAppActive$
    ]).pipe(
      map(([downloadStats, scanOverview, networkState, isAppActive]) => ({
        isHealthy: isAppActive && networkState.isConnected && 
                  downloadStats.error === 0 && scanOverview.activeSessions.length < 5,
        services: this.registry.getHealthStatus(),
        performance: {
          memoryUsage: 0, // Would be populated by actual performance monitoring
          cpuUsage: 0,
          networkLatency: 0,
        },
        features: {
          downloadsActive: downloadStats.active,
          scansActive: scanOverview.activeSessions.length,
          totalOperations: downloadStats.total + scanOverview.totalScans,
        },
      })),
      distinctUntilChanged((prev, curr) => 
        JSON.stringify(prev) === JSON.stringify(curr)
      )
    );
  }

  /**
   * Get unified dashboard data
   */
  getDashboardData$(): Observable<{
    downloads: any;
    scans: any;
    performance: any;
    quickActions: any[];
  }> {
    return combineLatest([
      this.downloadService.getOverview$(),
      this.scannerService.getOverview$(),
      this.getAppStatus$()
    ]).pipe(
      map(([downloadOverview, scanOverview, appStatus]) => ({
        downloads: downloadOverview,
        scans: scanOverview,
        performance: appStatus.performance,
        quickActions: this.generateQuickActions(downloadOverview, scanOverview),
      }))
    );
  }

  /**
   * Global search across all app data
   */
  async search(query: string, filters?: {
    types?: ('download' | 'scan' | 'setting')[];
    limit?: number;
  }): Promise<GlobalSearchResult[]> {
    return this.trackOperation('globalSearch', async () => {
      const results: GlobalSearchResult[] = [];
      const searchTerms = query.toLowerCase().split(' ');
      
      // Search downloads
      if (!filters?.types || filters.types.includes('download')) {
        const downloads = await this.downloadService.getDownloads$().pipe(
          map(downloads => downloads.slice(0, 10))
        ).toPromise();
        
        for (const download of downloads || []) {
          const relevance = this.calculateRelevance(
            searchTerms, 
            [download.filename, download.url].join(' ').toLowerCase()
          );
          
          if (relevance > 0) {
            results.push({
              type: 'download',
              id: download.id,
              title: download.filename,
              description: `${download.status} - ${download.url}`,
              metadata: { download },
              relevance,
            });
          }
        }
      }

      // Search scan sessions
      if (!filters?.types || filters.types.includes('scan')) {
        const sessions = await this.scannerService.getSessions$().pipe(
          map(sessions => sessions.slice(0, 10))
        ).toPromise();
        
        for (const session of sessions || []) {
          const relevance = this.calculateRelevance(
            searchTerms,
            [session.target, session.status].join(' ').toLowerCase()
          );
          
          if (relevance > 0) {
            results.push({
              type: 'scan',
              id: session.id,
              title: `Scan of ${session.target}`,
              description: `${session.status} - ${session.openPorts} open ports`,
              metadata: { session },
              relevance,
            });
          }
        }
      }

      // Sort by relevance and apply limit
      results.sort((a, b) => b.relevance - a.relevance);
      return results.slice(0, filters?.limit || 20);
    });
  }

  /**
   * Get unified settings
   */
  getUnifiedSettings$(): Observable<UnifiedSettings> {
    return this.unifiedSettings$.asObservable();
  }

  /**
   * Update unified settings
   */
  updateUnifiedSettings(updates: Partial<UnifiedSettings>): void {
    const currentSettings = this.unifiedSettings$.value;
    const newSettings = this.deepMerge(currentSettings, updates);
    this.unifiedSettings$.next(newSettings);

    // Propagate settings to individual services
    this.propagateSettingsToServices(newSettings);
    
    this.emitEvent('settings:updated', { settings: newSettings });
  }

  /**
   * Update network state
   */
  updateNetworkState(state: NetworkState): void {
    this.networkState$.next(state);
    this.emitEvent('network:changed', { state });
  }

  /**
   * Update device info
   */
  updateDeviceInfo(info: DeviceInfo): void {
    this.deviceInfo$.next(info);
    this.emitEvent('device:updated', { info });
  }

  /**
   * Set app active state
   */
  setAppActive(active: boolean): void {
    this.isAppActive$.next(active);
    this.emitEvent('app:state-changed', { active });
  }

  /**
   * Get download service
   */
  getDownloadService(): DownloadService {
    return this.downloadService;
  }

  /**
   * Get scanner service
   */
  getScannerService(): ScannerService {
    return this.scannerService;
  }

  /**
   * Bulk operations
   */
  async bulkOperation(
    operation: 'pause' | 'resume' | 'cancel' | 'delete',
    targets: { type: 'download' | 'scan'; ids: string[] }[]
  ): Promise<void> {
    return this.trackOperation('bulkOperation', async () => {
      for (const target of targets) {
        if (target.type === 'download') {
          for (const id of target.ids) {
            switch (operation) {
              case 'pause':
                await this.downloadService.pauseDownload(id);
                break;
              case 'resume':
                await this.downloadService.resumeDownload(id);
                break;
              case 'cancel':
                await this.downloadService.cancelDownload(id);
                break;
            }
          }
        } else if (target.type === 'scan') {
          for (const id of target.ids) {
            switch (operation) {
              case 'delete':
                this.scannerService.deleteSession(id);
                break;
            }
          }
        }
      }
    });
  }

  // Private helper methods
  private setupServiceCommunication(): void {
    // Listen to download service events
    this.downloadService.getEvents$().subscribe(event => {
      this.emitEvent(`download:${event.type}`, event.payload);
    });

    // Listen to scanner service events
    this.scannerService.getEvents$().subscribe(event => {
      this.emitEvent(`scanner:${event.type}`, event.payload);
    });

    // Cross-service communication
    this.downloadService.getEventsByType$('download:completed').subscribe(() => {
      // Could trigger notifications or other cross-service actions
    });

    this.scannerService.getEventsByType$('scan:completed').subscribe(() => {
      // Could trigger notifications or other cross-service actions
    });
  }

  private generateQuickActions(downloadOverview: any, scanOverview: any): any[] {
    const actions = [];

    // Download quick actions
    if (downloadOverview.stats.paused > 0) {
      actions.push({
        id: 'resume-all-downloads',
        title: 'Resume All Downloads',
        icon: 'play',
        action: () => this.bulkOperation('resume', [{ type: 'download', ids: [] }]),
      });
    }

    // Scanner quick actions
    if (scanOverview.activeSessions.length === 0) {
      actions.push({
        id: 'quick-scan',
        title: 'Quick Port Scan',
        icon: 'search',
        action: () => {}, // Would open quick scan dialog
      });
    }

    return actions;
  }

  private calculateRelevance(searchTerms: string[], text: string): number {
    let relevance = 0;
    for (const term of searchTerms) {
      if (text.includes(term)) {
        relevance += term.length / text.length;
      }
    }
    return relevance;
  }

  private deepMerge(target: any, source: any): any {
    const result = { ...target };
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    return result;
  }

  private propagateSettingsToServices(settings: UnifiedSettings): void {
    // Update download service settings
    this.downloadService.updateSettings({
      maxConcurrentDownloads: settings.downloads.maxConcurrent,
      autoResumeOnConnection: settings.downloads.autoResume,
      downloadLocation: settings.downloads.location,
    });

    // Update scanner service settings
    this.scannerService.updateSettings({
      timeout: settings.scanner.timeout,
      concurrency: settings.scanner.concurrency,
    });

    this.scannerService.updateAdvancedSettings({
      stealthMode: settings.scanner.stealthMode,
    });
  }
}
