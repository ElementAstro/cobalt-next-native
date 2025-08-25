import * as FileSystem from "expo-file-system";
import * as Network from "expo-network";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BehaviorSubject } from "rxjs";
import { z } from "zod";
import type {
  DownloadTask,
  DownloadStats,
  DownloadOptions,
  DownloadStatus,
  DownloadPriority,
} from "./types";

class DownloadManager {
  private static instance: DownloadManager;
  private downloads: Map<string, DownloadTask>;
  private downloadSubject: BehaviorSubject<DownloadTask[]>;
  private statsSubject: BehaviorSubject<DownloadStats>;
  private maxConcurrentDownloads: number;
  private retryAttempts: number;
  private retryDelay: number;
  private autoResumeOnConnection: boolean;

  private constructor() {
    this.downloads = new Map();
    this.downloadSubject = new BehaviorSubject<DownloadTask[]>([]);
    this.statsSubject = new BehaviorSubject<DownloadStats>(
      this.calculateStats()
    );
    this.maxConcurrentDownloads = 3;
    this.retryAttempts = 3;
    this.retryDelay = 1000;
    this.autoResumeOnConnection = true;
    this.init();
  }

  static getInstance(): DownloadManager {
    if (!DownloadManager.instance) {
      DownloadManager.instance = new DownloadManager();
    }
    return DownloadManager.instance;
  }

  private async init(): Promise<void> {
    // Only initialize in browser environment
    if (typeof window !== 'undefined') {
      await this.loadPersistedDownloads();
      this.setupNetworkListener();
      this.setupNotifications();
    }
  }

  private async loadPersistedDownloads(): Promise<void> {
    try {
      // Check if we're in a browser environment
      if (typeof window === 'undefined') {
        return;
      }

      const savedDownloads = await AsyncStorage.getItem("@downloads");
      if (savedDownloads) {
        const downloads = JSON.parse(savedDownloads) as DownloadTask[];
        downloads.forEach((task) => this.downloads.set(task.id, task));
        this.notifyChanges();
      }
    } catch (error) {
      console.error("Failed to load persisted downloads:", error);
    }
  }

  private async persistDownloads(): Promise<void> {
    try {
      const downloads = Array.from(this.downloads.values());
      await AsyncStorage.setItem("@downloads", JSON.stringify(downloads));
    } catch (error) {
      console.error("Failed to persist downloads:", error);
    }
  }

  private setupNetworkListener(): void {
    // Only setup network listener in browser environment
    if (typeof window === 'undefined') {
      return;
    }

    try {
      // 监听网络状态变化
      Network.addNetworkStateListener(({ isConnected }) => {
        if (isConnected && this.autoResumeOnConnection) {
          this.resumeAll();
        } else if (!isConnected) {
          this.pauseAll();
        }
      });
    } catch (error) {
      console.error("Failed to setup network listener:", error);
    }
  }

  private async setupNotifications(): Promise<void> {
    await Notifications.requestPermissionsAsync();
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  }

  private async showNotification(
    title: string,
    body: string,
    data?: Record<string, unknown>
  ): Promise<void> {
    await Notifications.scheduleNotificationAsync({
      content: { title, body, data: data || {} },
      trigger: null,
    });
  }

  private calculateStats(): DownloadStats {
    const stats: DownloadStats = {
      total: 0,
      active: 0,
      pending: 0,
      paused: 0,
      completed: 0,
      error: 0,
      totalProgress: 0,
      totalSpeed: 0,
      totalSize: 0,
      downloadedSize: 0,
    };

    this.downloads.forEach((task) => {
      stats.total++;
      stats[task.status as keyof DownloadStats]++;
      stats.totalSize += task.size;
      stats.downloadedSize += task.downloadedSize;
      stats.totalSpeed += task.speed;

      if (task.status === "downloading") {
        stats.totalProgress += task.progress;
      }
    });

    stats.totalProgress /= stats.active || 1;
    return stats;
  }

  private notifyChanges(): void {
    const downloads = Array.from(this.downloads.values());
    this.downloadSubject.next(downloads);
    this.statsSubject.next(this.calculateStats());
    this.persistDownloads();
  }

  private async validateDownloadRequest(url: string, filename: string) {
    const schema = z.object({
      url: z.string().url("无效的下载链接"),
      filename: z.string().min(1, "文件名不能为空"),
    });

    try {
      schema.parse({ url, filename });
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(error.errors[0]?.message || "Validation error");
      }
      throw error;
    }
  }

  private async checkSystemRequirements() {
    const networkStatus = await Network.getNetworkStateAsync();
    if (!networkStatus.isConnected) {
      throw new Error("无网络连接");
    }

    const fileInfo = await FileSystem.getInfoAsync(
      FileSystem.documentDirectory!
    );
    const minSpace = 1024 * 1024 * 10; // 10MB
    if (fileInfo.exists && fileInfo.size < minSpace) {
      throw new Error("存储空间不足");
    }
  }

  public async addDownload(
    url: string,
    filename: string,
    options: DownloadOptions = {}
  ): Promise<string> {
    await this.validateDownloadRequest(url, filename);
    await this.checkSystemRequirements();

    const downloadId = Math.random().toString(36).slice(2, 11);
    const destinationUri = `${FileSystem.documentDirectory}${filename}`;

    const task: DownloadTask = {
      id: downloadId,
      url,
      filename,
      destinationUri,
      progress: 0,
      status: "pending",
      error: null,
      priority: options.priority || "normal",
      size: 0,
      downloadedSize: 0,
      speed: 0,
      startTime: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      metadata: options.metadata || {},
      resumableDownload: null,
    };

    this.downloads.set(downloadId, task);
    this.notifyChanges();

    if (this.getActiveDownloads().length < this.maxConcurrentDownloads) {
      await this.startDownload(downloadId, options);
    }

    return downloadId;
  }

  private async startDownload(
    downloadId: string,
    options: DownloadOptions
  ): Promise<void> {
    const task = this.downloads.get(downloadId);
    if (!task || task.status === "downloading") return;

    try {
      const callback = (downloadProgress: FileSystem.DownloadProgressData) => {
        const progress =
          downloadProgress.totalBytesWritten /
          downloadProgress.totalBytesExpectedToWrite;
        const currentTime = Date.now();
        const timeElapsed = (currentTime - task.startTime) / 1000;
        const speed = downloadProgress.totalBytesWritten / timeElapsed;

        Object.assign(task, {
          progress,
          downloadedSize: downloadProgress.totalBytesWritten,
          size: downloadProgress.totalBytesExpectedToWrite,
          speed,
          updatedAt: currentTime,
        });

        this.notifyChanges();
        options.onProgress?.(progress);
      };

      const resumable = FileSystem.createDownloadResumable(
        task.url,
        task.destinationUri,
        {},
        callback
      );

      task.resumableDownload = resumable;
      task.status = "downloading";
      this.notifyChanges();

      const result = await resumable.downloadAsync();

      if (result) {
        task.status = "completed";
        task.progress = 1;
        options.onComplete?.();
        await this.showNotification("下载完成", `${task.filename} 已下载完成`);
      }
    } catch (error) {
      task.status = "error";
      task.error = error instanceof Error ? error.message : "Unknown error";
      options.onError?.(error as Error);
    } finally {
      this.notifyChanges();
      this.processNextDownload();
    }
  }

  private async processNextDownload(): Promise<void> {
    if (this.getActiveDownloads().length >= this.maxConcurrentDownloads) return;

    const pendingTasks = Array.from(this.downloads.values())
      .filter((task) => task.status === "pending")
      .sort((a: DownloadTask, b: DownloadTask) => {
        const priorityOrder: Record<DownloadPriority, number> = {
          high: 0,
          normal: 1,
          low: 2,
        };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });

    const nextTask = pendingTasks[0];
    if (nextTask) {
      await this.startDownload(nextTask.id, {});
    }
  }

  private getActiveDownloads(): DownloadTask[] {
    return Array.from(this.downloads.values()).filter(
      (task) => task.status === "downloading"
    );
  }

  public async pauseDownload(downloadId: string): Promise<void> {
    const task = this.downloads.get(downloadId);
    if (!task || task.status !== "downloading") return;

    try {
      await task.resumableDownload?.pauseAsync();
      task.status = "paused";
      this.notifyChanges();
    } catch (error) {
      console.error("Failed to pause download:", error);
    }
  }

  public async resumeDownload(downloadId: string): Promise<void> {
    const task = this.downloads.get(downloadId);
    if (!task || task.status !== "paused") return;

    try {
      await this.startDownload(downloadId, {});
    } catch (error) {
      console.error("Failed to resume download:", error);
    }
  }

  public async cancelDownload(downloadId: string): Promise<void> {
    const task = this.downloads.get(downloadId);
    if (!task) return;

    try {
      await task.resumableDownload?.cancelAsync();
      await FileSystem.deleteAsync(task.destinationUri, { idempotent: true });
      this.downloads.delete(downloadId);
      this.notifyChanges();
    } catch (error) {
      console.error("Failed to cancel download:", error);
    }
  }

  public async retryDownload(downloadId: string): Promise<void> {
    const task = this.downloads.get(downloadId);
    if (!task || task.status !== "error") return;

    task.status = "pending";
    task.error = null;
    task.progress = 0;
    task.downloadedSize = 0;
    task.speed = 0;
    task.startTime = Date.now();
    task.updatedAt = Date.now();

    this.notifyChanges();
    await this.startDownload(downloadId, {});
  }

  public async pauseAll(): Promise<void> {
    const promises = Array.from(this.downloads.values())
      .filter((task) => task.status === "downloading")
      .map((task) => this.pauseDownload(task.id));

    await Promise.all(promises);
  }

  public async resumeAll(): Promise<void> {
    const promises = Array.from(this.downloads.values())
      .filter((task) => task.status === "paused")
      .map((task) => this.resumeDownload(task.id));

    await Promise.all(promises);
  }

  public async cancelAll(): Promise<void> {
    const promises = Array.from(this.downloads.values()).map((task) =>
      this.cancelDownload(task.id)
    );

    await Promise.all(promises);
  }

  // ... 其他方法保持不变，但添加类型注解 ...

  public getDownloads$() {
    return this.downloadSubject.asObservable();
  }

  public getStats$() {
    return this.statsSubject.asObservable();
  }

  public setMaxConcurrentDownloads(count: number): void {
    this.maxConcurrentDownloads = count;
  }

  public setRetryConfig(attempts: number, delay: number): void {
    this.retryAttempts = attempts;
    this.retryDelay = delay;
  }

  public setAutoResumeOnConnection(enabled: boolean): void {
    this.autoResumeOnConnection = enabled;
  }

  public async clearCompleted(): Promise<void> {
    const completedTasks = Array.from(this.downloads.values()).filter(
      (task) => task.status === "completed"
    );

    for (const task of completedTasks) {
      await this.cancelDownload(task.id);
    }
  }

  public async clearAll(): Promise<void> {
    await this.cancelAll();
    this.downloads.clear();
    this.notifyChanges();
    await AsyncStorage.removeItem("@downloads");
  }
}

// Lazy-loaded singleton to avoid SSR issues
let downloadManagerInstance: DownloadManager | null = null;

export const getDownloadManager = (): DownloadManager => {
  if (!downloadManagerInstance) {
    downloadManagerInstance = DownloadManager.getInstance();
  }
  return downloadManagerInstance;
};

// For backward compatibility, but this should be avoided in SSR contexts
export const downloadManager = typeof window !== 'undefined' ? DownloadManager.getInstance() : null;
