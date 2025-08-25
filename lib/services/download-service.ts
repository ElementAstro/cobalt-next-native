/**
 * Download service implementing business logic for download management
 * Abstracts download operations from the store layer
 */

import { BaseService } from './base-service';
import { Observable, BehaviorSubject, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import type { 
  DownloadTask, 
  DownloadOptions, 
  DownloadStats, 
  DownloadSettings,
  DownloadAnalytics 
} from '~/components/download/types';

export interface DownloadServiceEvents {
  'download:added': { task: DownloadTask };
  'download:started': { taskId: string };
  'download:progress': { taskId: string; progress: number };
  'download:completed': { taskId: string; task: DownloadTask };
  'download:paused': { taskId: string };
  'download:resumed': { taskId: string };
  'download:cancelled': { taskId: string };
  'download:error': { taskId: string; error: string };
  'downloads:cleared': { count: number };
  'settings:updated': { settings: DownloadSettings };
}

export class DownloadService extends BaseService {
  private downloads$ = new BehaviorSubject<Map<string, DownloadTask>>(new Map());
  private settings$ = new BehaviorSubject<DownloadSettings>({
    maxConcurrentDownloads: 3,
    autoResumeOnConnection: true,
    retryAttempts: 3,
    retryDelay: 5000,
    downloadLocation: 'Downloads',
    allowedFileTypes: ['*'],
    maxFileSize: 1024 * 1024 * 1000, // 1GB
    notificationsEnabled: true,
    checksumVerification: false,
    organizeByType: false,
    organizeByDate: false,
    compressionEnabled: false,
    bandwidthLimit: 0,
  });

  constructor() {
    super('DownloadService');
  }

  /**
   * Get all downloads as observable
   */
  getDownloads$(): Observable<DownloadTask[]> {
    return this.downloads$.pipe(
      map(downloadsMap => Array.from(downloadsMap.values()))
    );
  }

  /**
   * Get download statistics
   */
  getStats$(): Observable<DownloadStats> {
    return this.downloads$.pipe(
      map(downloads => this.calculateStats(downloads))
    );
  }

  /**
   * Get download settings
   */
  getSettings$(): Observable<DownloadSettings> {
    return this.settings$.asObservable();
  }

  /**
   * Get download analytics
   */
  getAnalytics$(): Observable<DownloadAnalytics> {
    return this.downloads$.pipe(
      map(downloads => this.calculateAnalytics(downloads))
    );
  }

  /**
   * Get combined download overview
   */
  getOverview$(): Observable<{
    stats: DownloadStats;
    analytics: DownloadAnalytics;
    recentDownloads: DownloadTask[];
    activeDownloads: DownloadTask[];
  }> {
    return combineLatest([
      this.getStats$(),
      this.getAnalytics$(),
      this.getDownloads$()
    ]).pipe(
      map(([stats, analytics, downloads]) => ({
        stats,
        analytics,
        recentDownloads: downloads
          .filter(d => d.status === 'completed')
          .sort((a, b) => b.updatedAt - a.updatedAt)
          .slice(0, 5),
        activeDownloads: downloads.filter(d => 
          d.status === 'downloading' || d.status === 'pending'
        ),
      }))
    );
  }

  /**
   * Add new download
   */
  async addDownload(
    url: string, 
    filename: string, 
    options: DownloadOptions = {}
  ): Promise<string> {
    return this.trackOperation('addDownload', async () => {
      // Validate URL and filename
      if (!this.isValidUrl(url)) {
        throw new Error('Invalid URL provided');
      }

      if (!this.isValidFilename(filename)) {
        throw new Error('Invalid filename provided');
      }

      // Check file type restrictions
      if (!this.isAllowedFileType(filename)) {
        throw new Error('File type not allowed');
      }

      const taskId = this.generateTaskId();
      const task: DownloadTask = {
        id: taskId,
        url,
        filename,
        destinationUri: `${this.settings$.value.downloadLocation}/${filename}`,
        progress: 0,
        status: 'pending',
        error: null,
        priority: options.priority || 'normal',
        size: 0,
        downloadedSize: 0,
        speed: 0,
        startTime: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        metadata: options.metadata || {},
        resumableDownload: null,
        retryCount: 0,
      };

      // Add to downloads map
      const currentDownloads = new Map(this.downloads$.value);
      currentDownloads.set(taskId, task);
      this.downloads$.next(currentDownloads);

      this.emitEvent('download:added', { task });
      
      return taskId;
    });
  }

  /**
   * Start download
   */
  async startDownload(taskId: string): Promise<void> {
    return this.trackOperation('startDownload', async () => {
      const task = this.getDownload(taskId);
      if (!task) {
        throw new Error(`Download task ${taskId} not found`);
      }

      if (task.status !== 'pending' && task.status !== 'paused') {
        throw new Error(`Cannot start download in status: ${task.status}`);
      }

      // Check concurrent download limit
      const activeCount = this.getActiveDownloadCount();
      if (activeCount >= this.settings$.value.maxConcurrentDownloads) {
        throw new Error('Maximum concurrent downloads reached');
      }

      // Update task status
      this.updateDownload(taskId, {
        status: 'downloading',
        startTime: Date.now(),
        updatedAt: Date.now(),
      });

      this.emitEvent('download:started', { taskId });
    });
  }

  /**
   * Pause download
   */
  async pauseDownload(taskId: string): Promise<void> {
    return this.trackOperation('pauseDownload', async () => {
      const task = this.getDownload(taskId);
      if (!task || task.status !== 'downloading') {
        throw new Error('Cannot pause download');
      }

      this.updateDownload(taskId, {
        status: 'paused',
        updatedAt: Date.now(),
      });

      this.emitEvent('download:paused', { taskId });
    });
  }

  /**
   * Resume download
   */
  async resumeDownload(taskId: string): Promise<void> {
    return this.trackOperation('resumeDownload', async () => {
      const task = this.getDownload(taskId);
      if (!task || task.status !== 'paused') {
        throw new Error('Cannot resume download');
      }

      // Check concurrent download limit
      const activeCount = this.getActiveDownloadCount();
      if (activeCount >= this.settings$.value.maxConcurrentDownloads) {
        throw new Error('Maximum concurrent downloads reached');
      }

      this.updateDownload(taskId, {
        status: 'downloading',
        updatedAt: Date.now(),
      });

      this.emitEvent('download:resumed', { taskId });
    });
  }

  /**
   * Cancel download
   */
  async cancelDownload(taskId: string): Promise<void> {
    return this.trackOperation('cancelDownload', async () => {
      const task = this.getDownload(taskId);
      if (!task) {
        throw new Error(`Download task ${taskId} not found`);
      }

      // Remove from downloads map
      const currentDownloads = new Map(this.downloads$.value);
      currentDownloads.delete(taskId);
      this.downloads$.next(currentDownloads);

      this.emitEvent('download:cancelled', { taskId });
    });
  }

  /**
   * Update download progress
   */
  updateProgress(taskId: string, progress: number, speed?: number): void {
    const updates: Partial<DownloadTask> = {
      progress,
      updatedAt: Date.now(),
    };

    if (speed !== undefined) {
      updates.speed = speed;
    }

    this.updateDownload(taskId, updates);
    this.emitEvent('download:progress', { taskId, progress });
  }

  /**
   * Mark download as completed
   */
  completeDownload(taskId: string): void {
    const task = this.getDownload(taskId);
    if (!task) return;

    this.updateDownload(taskId, {
      status: 'completed',
      progress: 1,
      updatedAt: Date.now(),
    });

    this.emitEvent('download:completed', { taskId, task: this.getDownload(taskId)! });
  }

  /**
   * Update download settings
   */
  updateSettings(newSettings: Partial<DownloadSettings>): void {
    const currentSettings = this.settings$.value;
    const updatedSettings = { ...currentSettings, ...newSettings };
    this.settings$.next(updatedSettings);
    
    this.emitEvent('settings:updated', { settings: updatedSettings });
  }

  // Private helper methods
  private getDownload(taskId: string): DownloadTask | undefined {
    return this.downloads$.value.get(taskId);
  }

  private updateDownload(taskId: string, updates: Partial<DownloadTask>): void {
    const currentDownloads = new Map(this.downloads$.value);
    const task = currentDownloads.get(taskId);
    
    if (task) {
      currentDownloads.set(taskId, { ...task, ...updates });
      this.downloads$.next(currentDownloads);
    }
  }

  private getActiveDownloadCount(): number {
    return Array.from(this.downloads$.value.values())
      .filter(task => task.status === 'downloading').length;
  }

  private calculateStats(downloads: Map<string, DownloadTask>): DownloadStats {
    const tasks = Array.from(downloads.values());
    
    return {
      total: tasks.length,
      active: tasks.filter(t => t.status === 'downloading').length,
      pending: tasks.filter(t => t.status === 'pending').length,
      paused: tasks.filter(t => t.status === 'paused').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      error: tasks.filter(t => t.status === 'error').length,
      totalProgress: tasks.reduce((sum, t) => sum + t.progress, 0) / Math.max(tasks.length, 1),
      totalSpeed: tasks.filter(t => t.status === 'downloading').reduce((sum, t) => sum + t.speed, 0),
      totalSize: tasks.reduce((sum, t) => sum + t.size, 0),
      downloadedSize: tasks.reduce((sum, t) => sum + t.downloadedSize, 0),
    };
  }

  private calculateAnalytics(downloads: Map<string, DownloadTask>): DownloadAnalytics {
    const tasks = Array.from(downloads.values());
    const completedTasks = tasks.filter(t => t.status === 'completed');
    
    return {
      totalDownloads: completedTasks.length,
      totalBytes: completedTasks.reduce((sum, t) => sum + t.size, 0),
      averageSpeed: completedTasks.reduce((sum, t) => sum + t.speed, 0) / Math.max(completedTasks.length, 1),
      successRate: tasks.length > 0 ? completedTasks.length / tasks.length : 0,
      lastDownloadDate: completedTasks.length > 0 
        ? Math.max(...completedTasks.map(t => t.updatedAt))
        : null,
    };
  }

  private generateTaskId(): string {
    return `download_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private isValidFilename(filename: string): boolean {
    return filename.length > 0 && !/[<>:"/\\|?*]/.test(filename);
  }

  private isAllowedFileType(filename: string): boolean {
    const allowedTypes = this.settings$.value.allowedFileTypes;
    if (allowedTypes.includes('*')) return true;
    
    const extension = filename.split('.').pop()?.toLowerCase();
    return extension ? allowedTypes.includes(extension) : false;
  }
}
