import { create } from 'zustand';
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
const useDownloadStore = create<DownloadState>((set, get) => ({
  downloads: new Map(),
  activeDownloads: new Set(),
  stats: DEFAULT_STATS,
  settings: DEFAULT_SETTINGS,
  analytics: DEFAULT_ANALYTICS,

  addDownload: async (url, filename, options = {}) => {
    const id = Date.now().toString();
    const newDownload: DownloadTask = {
      id,
      url,
      filename,
      destinationUri: `${get().settings.downloadLocation}/${filename}`,
      progress: 0,
      status: 'pending',
      error: null,
      priority: options.priority || 'normal',
      size: 0,
      downloadedSize: 0,
      speed: 0,
      startTime: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      metadata: options.metadata || {},
      resumableDownload: null,
      retryCount: 0,
    };

    set((state) => {
      const newDownloads = new Map(state.downloads);
      newDownloads.set(id, newDownload);
      
      return {
        downloads: newDownloads,
        stats: {
          ...state.stats,
          total: state.stats.total + 1,
          pending: state.stats.pending + 1,
        }
      };
    });

    // 模拟实现 - 在实际应用中这里会调用下载管理逻辑
    setTimeout(() => {
      get().resumeDownload(id);
    }, 500);

    return id;
  },

  pauseDownload: (id) => {
    set((state) => {
      const download = state.downloads.get(id);
      if (!download || download.status !== 'downloading') return state;

      const newDownloads = new Map(state.downloads);
      newDownloads.set(id, {
        ...download,
        status: 'paused',
        updatedAt: Date.now(),
      });

      const newActiveDownloads = new Set(state.activeDownloads);
      newActiveDownloads.delete(id);

      return {
        downloads: newDownloads,
        activeDownloads: newActiveDownloads,
        stats: {
          ...state.stats,
          active: state.stats.active - 1,
          paused: state.stats.paused + 1,
        }
      };
    });
  },

  resumeDownload: (id) => {
    set((state) => {
      const download = state.downloads.get(id);
      if (!download || (download.status !== 'paused' && download.status !== 'pending' && download.status !== 'error')) {
        return state;
      }

      const newDownloads = new Map(state.downloads);
      newDownloads.set(id, {
        ...download,
        status: 'downloading',
        error: null,
        updatedAt: Date.now(),
      });

      const newActiveDownloads = new Set(state.activeDownloads);
      newActiveDownloads.add(id);

      return {
        downloads: newDownloads,
        activeDownloads: newActiveDownloads,
        stats: {
          ...state.stats,
          active: state.stats.active + 1,
          paused: download.status === 'paused' ? state.stats.paused - 1 : state.stats.paused,
          pending: download.status === 'pending' ? state.stats.pending - 1 : state.stats.pending,
          error: download.status === 'error' ? state.stats.error - 1 : state.stats.error,
        }
      };
    });
  },

  cancelDownload: (id) => {
    set((state) => {
      const download = state.downloads.get(id);
      if (!download) return state;

      const newDownloads = new Map(state.downloads);
      newDownloads.delete(id);

      const newActiveDownloads = new Set(state.activeDownloads);
      newActiveDownloads.delete(id);

      let activeDecrement = 0;
      let pendingDecrement = 0;
      let pausedDecrement = 0;
      let errorDecrement = 0;
      let completedDecrement = 0;

      switch(download.status) {
        case 'downloading': activeDecrement = 1; break;
        case 'pending': pendingDecrement = 1; break;
        case 'paused': pausedDecrement = 1; break;
        case 'error': errorDecrement = 1; break;
        case 'completed': completedDecrement = 1; break;
      }

      return {
        downloads: newDownloads,
        activeDownloads: newActiveDownloads,
        stats: {
          ...state.stats,
          total: state.stats.total - 1,
          active: state.stats.active - activeDecrement,
          pending: state.stats.pending - pendingDecrement,
          paused: state.stats.paused - pausedDecrement,
          error: state.stats.error - errorDecrement,
          completed: state.stats.completed - completedDecrement,
          totalSize: state.stats.totalSize - download.size,
          downloadedSize: state.stats.downloadedSize - download.downloadedSize,
          totalProgress: calculateTotalProgress(newDownloads),
        }
      };
    });
  },

  retryDownload: (id) => {
    set((state) => {
      const download = state.downloads.get(id);
      if (!download || download.status !== 'error') return state;

      const newDownloads = new Map(state.downloads);
      newDownloads.set(id, {
        ...download,
        status: 'pending',
        error: null,
        retryCount: (download.retryCount || 0) + 1,
        updatedAt: Date.now(),
        lastRetryTime: Date.now(),
      });

      return {
        downloads: newDownloads,
        stats: {
          ...state.stats,
          error: state.stats.error - 1,
          pending: state.stats.pending + 1,
        }
      };
    });

    // 开始重试下载
    setTimeout(() => {
      get().resumeDownload(id);
    }, 500);
  },

  updateSettings: (newSettings) => {
    set((state) => ({
      settings: { ...state.settings, ...newSettings }
    }));
  },
}));

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

export default useDownloadStore;
