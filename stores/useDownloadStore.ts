import { create } from 'zustand';
import { downloadManager } from '../components/download/download';
import type {
  DownloadTask,
  DownloadStats,
  DownloadSettings,
  DownloadAnalytics,
  DownloadOptions
} from '../components/download/types';

interface DownloadState {
  downloads: Map<string, DownloadTask>;
  activeDownloads: Set<string>;
  stats: DownloadStats;
  settings: DownloadSettings;
  analytics: DownloadAnalytics;
  
  // 下载管理方法
  addDownload: (url: string, filename: string, options?: DownloadOptions) => Promise<string>;
  pauseDownload: (id: string) => void;
  resumeDownload: (id: string) => void;
  cancelDownload: (id: string) => void;
  retryDownload: (id: string) => void;
  updateSettings: (settings: Partial<DownloadSettings>) => void;
}

// 默认设置
const DEFAULT_SETTINGS: DownloadSettings = {
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
};

// 默认统计
const DEFAULT_STATS: DownloadStats = {
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

// 默认分析数据
const DEFAULT_ANALYTICS: DownloadAnalytics = {
  totalDownloads: 0,
  totalBytes: 0,
  averageSpeed: 0,
  successRate: 0,
  lastDownloadDate: null,
};

// 创建 Store
const useDownloadStore = create<DownloadState>((set, get) => {
  // Subscribe to download manager updates
  downloadManager.getDownloads$().subscribe((downloads) => {
    const downloadsMap = new Map();
    const activeDownloads = new Set<string>();

    downloads.forEach(task => {
      downloadsMap.set(task.id, task);
      if (task.status === 'downloading') {
        activeDownloads.add(task.id);
      }
    });

    set({
      downloads: downloadsMap,
      activeDownloads,
      stats: calculateStats(downloadsMap)
    });
  });

  return {
    downloads: new Map(),
    activeDownloads: new Set(),
    stats: DEFAULT_STATS,
    settings: DEFAULT_SETTINGS,
    analytics: DEFAULT_ANALYTICS,

  addDownload: async (url, filename, options = {}) => {
    try {
      // Use the real download manager
      const id = await downloadManager.addDownload(url, filename, {
        ...options,
        onProgress: (progress) => {
          // Update store when progress changes
          set((state) => {
            const downloads = new Map(state.downloads);
            const task = downloads.get(id);
            if (task) {
              task.progress = progress;
              task.updatedAt = Date.now();
              downloads.set(id, task);
            }
            return { downloads };
          });
          options.onProgress?.(progress);
        },
        onComplete: () => {
          // Update store when download completes
          set((state) => {
            const downloads = new Map(state.downloads);
            const task = downloads.get(id);
            if (task) {
              task.status = 'completed';
              task.progress = 1;
              task.updatedAt = Date.now();
              downloads.set(id, task);
            }
            return {
              downloads,
              stats: calculateStats(downloads)
            };
          });
          options.onComplete?.();
        },
        onError: (error) => {
          // Update store when download fails
          set((state) => {
            const downloads = new Map(state.downloads);
            const task = downloads.get(id);
            if (task) {
              task.status = 'error';
              task.error = error.message;
              task.updatedAt = Date.now();
              downloads.set(id, task);
            }
            return {
              downloads,
              stats: calculateStats(downloads)
            };
          });
          options.onError?.(error);
        }
      });

      return id;
    } catch (error) {
      console.error('Failed to add download:', error);
      throw error;
    }
  },

  pauseDownload: async (id) => {
    try {
      await downloadManager.pauseDownload(id);

      set((state) => {
        const downloads = new Map(state.downloads);
        const task = downloads.get(id);
        if (task) {
          task.status = 'paused';
          task.updatedAt = Date.now();
          downloads.set(id, task);
        }

        const newActiveDownloads = new Set(state.activeDownloads);
        newActiveDownloads.delete(id);

        return {
          downloads,
          activeDownloads: newActiveDownloads,
          stats: calculateStats(downloads)
        };
      });
    } catch (error) {
      console.error('Failed to pause download:', error);
    }
  },

  resumeDownload: async (id) => {
    try {
      await downloadManager.resumeDownload(id);

      set((state) => {
        const downloads = new Map(state.downloads);
        const task = downloads.get(id);
        if (task) {
          task.status = 'downloading';
          task.error = null;
          task.updatedAt = Date.now();
          downloads.set(id, task);
        }

        const newActiveDownloads = new Set(state.activeDownloads);
        newActiveDownloads.add(id);

        return {
          downloads,
          activeDownloads: newActiveDownloads,
          stats: calculateStats(downloads)
        };
      });
    } catch (error) {
      console.error('Failed to resume download:', error);
    }
  },

  cancelDownload: async (id) => {
    try {
      await downloadManager.cancelDownload(id);

      set((state) => {
        const downloads = new Map(state.downloads);
        downloads.delete(id);

        const newActiveDownloads = new Set(state.activeDownloads);
        newActiveDownloads.delete(id);

        return {
          downloads,
          activeDownloads: newActiveDownloads,
          stats: calculateStats(downloads)
        };
      });
    } catch (error) {
      console.error('Failed to cancel download:', error);
    }
  },

  retryDownload: async (id) => {
    try {
      await downloadManager.retryDownload(id);

      set((state) => {
        const downloads = new Map(state.downloads);
        const task = downloads.get(id);
        if (task) {
          task.status = 'pending';
          task.error = null;
          task.retryCount = (task.retryCount || 0) + 1;
          task.updatedAt = Date.now();
          task.lastRetryTime = Date.now();
          downloads.set(id, task);
        }

        return {
          downloads,
          stats: calculateStats(downloads)
        };
      });
    } catch (error) {
      console.error('Failed to retry download:', error);
    }
  },

  updateSettings: (newSettings) => {
    set((state) => ({
      settings: { ...state.settings, ...newSettings }
    }));

    // Update download manager settings
    if (newSettings.maxConcurrentDownloads) {
      downloadManager.setMaxConcurrentDownloads(newSettings.maxConcurrentDownloads);
    }
    if (newSettings.retryAttempts !== undefined && newSettings.retryDelay !== undefined) {
      downloadManager.setRetryConfig(newSettings.retryAttempts, newSettings.retryDelay);
    }
    if (newSettings.autoResumeOnConnection !== undefined) {
      downloadManager.setAutoResumeOnConnection(newSettings.autoResumeOnConnection);
    }
  },
  };
});

// 辅助函数：计算总体下载进度
function calculateTotalProgress(downloads: Map<string, DownloadTask>): number {
  if (downloads.size === 0) return 0;

  let totalWeightedProgress = 0;
  let totalSize = 0;

  for (const download of downloads.values()) {
    totalWeightedProgress += download.progress * download.size;
    totalSize += download.size;
  }

  return totalSize > 0 ? totalWeightedProgress / totalSize : 0;
}

// 辅助函数：计算下载统计
function calculateStats(downloads: Map<string, DownloadTask>): DownloadStats {
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

  for (const task of downloads.values()) {
    stats.total++;
    stats.totalSize += task.size;
    stats.downloadedSize += task.downloadedSize;
    stats.totalSpeed += task.speed;

    switch (task.status) {
      case 'downloading':
        stats.active++;
        stats.totalProgress += task.progress;
        break;
      case 'pending':
        stats.pending++;
        break;
      case 'paused':
        stats.paused++;
        break;
      case 'completed':
        stats.completed++;
        break;
      case 'error':
        stats.error++;
        break;
    }
  }

  stats.totalProgress = stats.active > 0 ? stats.totalProgress / stats.active : 0;
  return stats;
}

export default useDownloadStore;
