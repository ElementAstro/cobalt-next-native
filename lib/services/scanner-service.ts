/**
 * Scanner service implementing business logic for network scanning
 * Abstracts scanning operations from the store layer
 */

import { BaseService } from './base-service';
import { Observable, BehaviorSubject, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import type { 
  ScanSession, 
  ScanResult, 
  ScanSettings, 
  AdvancedScanSettings,
  ScanStatus 
} from '~/stores/useScannerStore';

export interface ScanServiceEvents {
  'scan:started': { session: ScanSession };
  'scan:progress': { sessionId: string; progress: number };
  'scan:result': { sessionId: string; result: ScanResult };
  'scan:completed': { sessionId: string; session: ScanSession };
  'scan:paused': { sessionId: string };
  'scan:resumed': { sessionId: string };
  'scan:stopped': { sessionId: string };
  'scan:error': { sessionId: string; error: string };
  'settings:updated': { settings: ScanSettings };
  'advanced-settings:updated': { settings: AdvancedScanSettings };
}

export interface ScanOverview {
  activeSessions: ScanSession[];
  recentSessions: ScanSession[];
  totalScans: number;
  totalPorts: number;
  openPorts: number;
  successRate: number;
  averageScanTime: number;
}

export class ScannerService extends BaseService {
  private sessions$ = new BehaviorSubject<ScanSession[]>([]);
  private currentSession$ = new BehaviorSubject<ScanSession | null>(null);
  private settings$ = new BehaviorSubject<ScanSettings>({
    timeout: 5000,
    concurrency: 50,
    retryAttempts: 2,
    retryDelay: 1000,
    enableServiceDetection: true,
    enableVersionDetection: false,
    enableOSDetection: false,
    customUserAgent: 'CobaltScanner/1.0',
    scanDelay: 0,
    randomizeOrder: false,
  });
  private advancedSettings$ = new BehaviorSubject<AdvancedScanSettings>({
    tcpConnectScan: true,
    tcpSynScan: false,
    udpScan: false,
    stealthMode: false,
    fragmentPackets: false,
    spoofSourceIP: '',
    sourcePort: 0,
    decoyHosts: [],
    timing: 'normal',
    hostDiscovery: true,
    skipHostDiscovery: false,
    dnsResolution: true,
    reverseDnsLookup: false,
  });

  constructor() {
    super('ScannerService');
  }

  /**
   * Get all scan sessions
   */
  getSessions$(): Observable<ScanSession[]> {
    return this.sessions$.asObservable();
  }

  /**
   * Get current active session
   */
  getCurrentSession$(): Observable<ScanSession | null> {
    return this.currentSession$.asObservable();
  }

  /**
   * Get scan settings
   */
  getSettings$(): Observable<ScanSettings> {
    return this.settings$.asObservable();
  }

  /**
   * Get advanced scan settings
   */
  getAdvancedSettings$(): Observable<AdvancedScanSettings> {
    return this.advancedSettings$.asObservable();
  }

  /**
   * Get scan overview with analytics
   */
  getOverview$(): Observable<ScanOverview> {
    return combineLatest([
      this.sessions$,
      this.currentSession$
    ]).pipe(
      map(([sessions, currentSession]) => {
        const activeSessions = sessions.filter(s => 
          s.status === 'scanning' || s.status === 'paused'
        );
        
        const completedSessions = sessions.filter(s => s.status === 'success');
        const totalPorts = completedSessions.reduce((sum, s) => sum + s.totalPorts, 0);
        const openPorts = completedSessions.reduce((sum, s) => sum + s.openPorts, 0);
        
        const scanTimes = completedSessions
          .filter(s => s.endTime)
          .map(s => s.endTime! - s.startTime);
        
        return {
          activeSessions,
          recentSessions: sessions
            .filter(s => s.status === 'success')
            .sort((a, b) => b.startTime - a.startTime)
            .slice(0, 5),
          totalScans: sessions.length,
          totalPorts,
          openPorts,
          successRate: sessions.length > 0 ? completedSessions.length / sessions.length : 0,
          averageScanTime: scanTimes.length > 0 
            ? scanTimes.reduce((sum, time) => sum + time, 0) / scanTimes.length 
            : 0,
        };
      })
    );
  }

  /**
   * Start new scan session
   */
  async startScan(target: string, ports: number[]): Promise<string> {
    return this.trackOperation('startScan', async () => {
      // Validate target
      if (!this.isValidTarget(target)) {
        throw new Error('Invalid scan target');
      }

      // Validate ports
      if (ports.length === 0) {
        throw new Error('No ports specified for scanning');
      }

      if (ports.some(port => port < 1 || port > 65535)) {
        throw new Error('Invalid port numbers specified');
      }

      // Check if there's already an active scan
      const currentSession = this.currentSession$.value;
      if (currentSession && (currentSession.status === 'scanning' || currentSession.status === 'paused')) {
        throw new Error('Another scan is already in progress');
      }

      const sessionId = this.generateSessionId();
      const session: ScanSession = {
        id: sessionId,
        target,
        ports: this.settings$.value.randomizeOrder ? this.shuffleArray([...ports]) : ports,
        startTime: Date.now(),
        status: 'scanning',
        results: [],
        totalPorts: ports.length,
        scannedPorts: 0,
        openPorts: 0,
        closedPorts: 0,
        filteredPorts: 0,
        errorPorts: 0,
      };

      // Add to sessions list
      const currentSessions = [...this.sessions$.value];
      currentSessions.unshift(session);
      this.sessions$.next(currentSessions);

      // Set as current session
      this.currentSession$.next(session);

      this.emitEvent('scan:started', { session });
      
      return sessionId;
    });
  }

  /**
   * Stop current scan
   */
  async stopScan(): Promise<void> {
    return this.trackOperation('stopScan', async () => {
      const currentSession = this.currentSession$.value;
      if (!currentSession) {
        throw new Error('No active scan to stop');
      }

      const updatedSession: ScanSession = {
        ...currentSession,
        status: 'idle',
        endTime: Date.now(),
      };

      this.updateSession(updatedSession);
      this.currentSession$.next(null);

      this.emitEvent('scan:stopped', { sessionId: currentSession.id });
    });
  }

  /**
   * Pause current scan
   */
  async pauseScan(): Promise<void> {
    return this.trackOperation('pauseScan', async () => {
      const currentSession = this.currentSession$.value;
      if (!currentSession || currentSession.status !== 'scanning') {
        throw new Error('No active scan to pause');
      }

      const updatedSession: ScanSession = {
        ...currentSession,
        status: 'paused',
      };

      this.updateSession(updatedSession);
      this.currentSession$.next(updatedSession);

      this.emitEvent('scan:paused', { sessionId: currentSession.id });
    });
  }

  /**
   * Resume paused scan
   */
  async resumeScan(): Promise<void> {
    return this.trackOperation('resumeScan', async () => {
      const currentSession = this.currentSession$.value;
      if (!currentSession || currentSession.status !== 'paused') {
        throw new Error('No paused scan to resume');
      }

      const updatedSession: ScanSession = {
        ...currentSession,
        status: 'scanning',
      };

      this.updateSession(updatedSession);
      this.currentSession$.next(updatedSession);

      this.emitEvent('scan:resumed', { sessionId: currentSession.id });
    });
  }

  /**
   * Add scan result
   */
  addResult(result: ScanResult): void {
    const currentSession = this.currentSession$.value;
    if (!currentSession) return;

    const updatedSession: ScanSession = {
      ...currentSession,
      results: [...currentSession.results, result],
      scannedPorts: currentSession.scannedPorts + 1,
      openPorts: result.status === 'open' ? currentSession.openPorts + 1 : currentSession.openPorts,
      closedPorts: result.status === 'closed' ? currentSession.closedPorts + 1 : currentSession.closedPorts,
      filteredPorts: result.status === 'filtered' ? currentSession.filteredPorts + 1 : currentSession.filteredPorts,
      errorPorts: result.status === 'error' ? currentSession.errorPorts + 1 : currentSession.errorPorts,
    };

    // Check if scan is complete
    if (updatedSession.scannedPorts >= updatedSession.totalPorts) {
      updatedSession.endTime = Date.now();
      updatedSession.status = 'success';
      this.currentSession$.next(null);
      this.emitEvent('scan:completed', { sessionId: updatedSession.id, session: updatedSession });
    } else {
      this.currentSession$.next(updatedSession);
    }

    this.updateSession(updatedSession);
    this.emitEvent('scan:result', { sessionId: updatedSession.id, result });

    // Emit progress update
    const progress = updatedSession.scannedPorts / updatedSession.totalPorts;
    this.emitEvent('scan:progress', { sessionId: updatedSession.id, progress });
  }

  /**
   * Update scan settings
   */
  updateSettings(newSettings: Partial<ScanSettings>): void {
    const currentSettings = this.settings$.value;
    const updatedSettings = { ...currentSettings, ...newSettings };
    this.settings$.next(updatedSettings);
    
    this.emitEvent('settings:updated', { settings: updatedSettings });
  }

  /**
   * Update advanced scan settings
   */
  updateAdvancedSettings(newSettings: Partial<AdvancedScanSettings>): void {
    const currentSettings = this.advancedSettings$.value;
    const updatedSettings = { ...currentSettings, ...newSettings };
    this.advancedSettings$.next(updatedSettings);
    
    this.emitEvent('advanced-settings:updated', { settings: updatedSettings });
  }

  /**
   * Delete scan session
   */
  deleteSession(sessionId: string): void {
    const currentSessions = this.sessions$.value.filter(s => s.id !== sessionId);
    this.sessions$.next(currentSessions);
  }

  /**
   * Clear all scan history
   */
  clearHistory(): void {
    this.sessions$.next([]);
  }

  /**
   * Export scan results
   */
  async exportResults(sessionId: string): Promise<string> {
    return this.trackOperation('exportResults', async () => {
      const session = this.sessions$.value.find(s => s.id === sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      return JSON.stringify(session, null, 2);
    });
  }

  // Private helper methods
  private updateSession(updatedSession: ScanSession): void {
    const currentSessions = this.sessions$.value.map(session =>
      session.id === updatedSession.id ? updatedSession : session
    );
    this.sessions$.next(currentSessions);
  }

  private generateSessionId(): string {
    return `scan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private isValidTarget(target: string): boolean {
    // Basic validation for IP addresses and hostnames
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const hostnameRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    
    return ipRegex.test(target) || hostnameRegex.test(target);
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = shuffled[i];
      const swapItem = shuffled[j];
      if (temp !== undefined && swapItem !== undefined) {
        shuffled[i] = swapItem;
        shuffled[j] = temp;
      }
    }
    return shuffled;
  }
}
