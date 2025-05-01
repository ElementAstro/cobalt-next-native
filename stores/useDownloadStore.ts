import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system";
import * as Network from "expo-network";
import { z } from "zod";
import type {
  DownloadTask,
  DownloadStats,
  DownloadStatus,
  DownloadPriority,
  DownloadOptions,
} from "~/components/download/types";

interface DownloadHistory {
  id: string;
  filename: string;
  url: string;
  completedAt: number;
  size: number;
}

interface DownloadAnalytics {
  totalDownloads: number;
  totalBytes: number;
  averageSpeed: number;
  successRate: number;
  lastDownloadDate: number | null;
}

interface DownloadSettings {
  maxConcurrentDownloads: number;
  autoResumeOnConnection: boolean;
  retryAttempts: number;
  retryDelay: number;
  downloadLocation: string;
  allowedFileTypes: string[];
  maxFileSize: number;
  notificationsEnabled: boolean;
}

interface DownloadSchedule {
  id: string;
  url: string;
  filename: string;
  scheduledTime: number;
  priority: DownloadPriority;
  metadata?: Record<string, unknown>;
}

interface DownloadError {
  taskId: string;
  error: string;
  timestamp: number;
  retryCount: number;
}

interface DownloadState {
  // Core state
  downloads: Map<string, DownloadTask>;
  downloadQueue: string[];
  activeDownloads: Set<string>;
  errors: Map<string, DownloadError>;
  
  // History and analytics
  history: DownloadHistory[];
  analytics: DownloadAnalytics;
  
  // Settings and scheduling
  settings: DownloadSettings;
  schedules: DownloadSchedule[];
  
  // Computed stats
  stats: DownloadStats;
  
  // Actions
  addDownload: (url: string, filename: string, options?: DownloadOptions) => Promise<string>;
  pauseDownload: (id: string) => Promise<void>;
  resumeDownload: (id: string) => Promise<void>;
  cancelDownload: (id: string) => Promise<void>;
  retryDownload: (id: string) => Promise<void>;
  scheduleDownload: (schedule: Omit<DownloadSchedule, "id">) => string;
  updateSettings: (settings: Partial<DownloadSettings>) => void;
  clearHistory: () => void;
  clearErrors: () => void;
}

// Validation schemas
const downloadTaskSchema = z.object({
  id: z.string(),
  url: z.string().url(),
  filename: z.string(),
  status: z.enum(["pending", "downloading", "paused", "completed", "error", "canceled"]),
  progress: z.number().min(0).max(1),
  size: z.number().min(0),
  downloadedSize: z.number().min(0),
  speed: z.number().min(0),
});

const useDownloadStore = create<DownloadState>()(
  persist(
    (set, get) => ({
      // Initial state
      downloads: new Map(),
      downloadQueue: [],
      activeDownloads: new Set(),
      errors: new Map(),
      history: [],
      analytics: {
        totalDownloads: 0,
        totalBytes: 0,
        averageSpeed: 0,
        successRate: 1,
        lastDownloadDate: null,
      },
      settings: {
        maxConcurrentDownloads: 3,
        autoResumeOnConnection: true,
        retryAttempts: 3,
        retryDelay: 1000,
        downloadLocation: FileSystem.documentDirectory!,
        allowedFileTypes: ["*"],
        maxFileSize: 1024 * 1024 * 1024, // 1GB
        notificationsEnabled: true,
      },
      schedules: [],
      stats: {
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
      },

      // Actions
      addDownload: async (url, filename, options = {}) => {
        const state = get();
        const { settings } = state;

        // Validate input
        try {
          await z.object({
            url: z.string().url(),
            filename: z.string().min(1),
          }).parseAsync({ url, filename });
        } catch (error) {
          throw new Error("Invalid download parameters");
        }

        // Generate unique ID
        const id = Math.random().toString(36).slice(2, 11);
        
        // Create download task
        const task: DownloadTask = {
          id,
          url,
          filename,
          destinationUri: `${settings.downloadLocation}${filename}`,
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

        // Update state
        set(state => {
          const downloads = new Map(state.downloads);
          downloads.set(id, task);
          const downloadQueue = [...state.downloadQueue, id];
          
          return {
            downloads,
            downloadQueue,
            stats: calculateStats(downloads),
          };
        });

        // Process queue if possible
        await processDownloadQueue();

        return id;
      },

      pauseDownload: async (id) => {
        const state = get();
        const task = state.downloads.get(id);
        if (!task || task.status !== "downloading") return;

        try {
          await task.resumableDownload?.pauseAsync();
          set(state => {
            const downloads = new Map(state.downloads);
            const task = { ...downloads.get(id)!, status: "paused" as const };
            downloads.set(id, task);
            const activeDownloads = new Set(state.activeDownloads);
            activeDownloads.delete(id);
            
            return {
              downloads,
              activeDownloads,
              stats: calculateStats(downloads),
            };
          });
        } catch (error) {
          console.error("Failed to pause download:", error);
        }
      },

      resumeDownload: async (id) => {
        const state = get();
        const task = state.downloads.get(id);
        if (!task || task.status !== "paused") return;

        set(state => {
          const downloads = new Map(state.downloads);
          const task = { ...downloads.get(id)!, status: "pending" as const };
          downloads.set(id, task);
          return {
            downloads,
            downloadQueue: [...state.downloadQueue, id],
            stats: calculateStats(downloads),
          };
        });

        await processDownloadQueue();
      },

      cancelDownload: async (id) => {
        const state = get();
        const task = state.downloads.get(id);
        if (!task) return;

        try {
          await task.resumableDownload?.cancelAsync();
          await FileSystem.deleteAsync(task.destinationUri, { idempotent: true });
          
          set(state => {
            const downloads = new Map(state.downloads);
            downloads.delete(id);
            const activeDownloads = new Set(state.activeDownloads);
            activeDownloads.delete(id);
            const downloadQueue = state.downloadQueue.filter(qid => qid !== id);
            
            return {
              downloads,
              activeDownloads,
              downloadQueue,
              stats: calculateStats(downloads),
            };
          });
        } catch (error) {
          console.error("Failed to cancel download:", error);
        }
      },

      retryDownload: async (id) => {
        const state = get();
        const task = state.downloads.get(id);
        if (!task || task.status !== "error") return;

        set(state => {
          const downloads = new Map(state.downloads);
          const updatedTask = {
            ...task,
            status: "pending" as const,
            error: null,
            progress: 0,
            downloadedSize: 0,
            speed: 0,
            startTime: Date.now(),
            updatedAt: Date.now(),
          };
          downloads.set(id, updatedTask);
          return {
            downloads,
            downloadQueue: [...state.downloadQueue, id],
            stats: calculateStats(downloads),
          };
        });

        await processDownloadQueue();
      },

      scheduleDownload: (schedule) => {
        const id = Math.random().toString(36).slice(2, 11);
        set(state => ({
          schedules: [...state.schedules, { ...schedule, id }],
        }));
        return id;
      },

      updateSettings: (newSettings) => {
        set(state => ({
          settings: { ...state.settings, ...newSettings },
        }));
      },

      clearHistory: () => {
        set({ history: [] });
      },

      clearErrors: () => {
        set({ errors: new Map() });
      },
    }),
    {
      name: "download-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        downloads: Array.from(state.downloads.entries()),
        history: state.history,
        settings: state.settings,
        schedules: state.schedules,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Convert arrays back to Maps/Sets
          state.downloads = new Map(state.downloads);
          state.activeDownloads = new Set();
          state.errors = new Map();
          
          // Recalculate stats
          state.stats = calculateStats(state.downloads);
          
          // Setup network listener
          setupNetworkListener(state);
          
          // Process any pending downloads
          processDownloadQueue();
        }
      },
    })
);

// Helper functions
const calculateStats = (downloads: Map<string, DownloadTask>): DownloadStats => {
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

  downloads.forEach(task => {
    stats.total++;
    stats.totalSize += task.size;
    stats.downloadedSize += task.downloadedSize;
    stats.totalSpeed += task.speed;

    switch (task.status) {
      case "downloading":
        stats.active++;
        stats.totalProgress += task.progress;
        break;
      case "pending":
        stats.pending++;
        break;
      case "paused":
        stats.paused++;
        break;
      case "completed":
        stats.completed++;
        break;
      case "error":
        stats.error++;
        break;
    }
  });

  stats.totalProgress /= stats.active || 1;
  return stats;
};

const setupNetworkListener = (state: DownloadState) => {
  Network.addNetworkStateListener(({ isConnected }) => {
    if (isConnected && state.settings.autoResumeOnConnection) {
      // Resume all paused downloads
      state.downloads.forEach((task, id) => {
        if (task.status === "paused") {
          state.resumeDownload(id);
        }
      });
    }
  });
};

const processDownloadQueue = async () => {
  const state = useDownloadStore.getState();
  const { downloads, downloadQueue, activeDownloads, settings } = state;

  // Check if we can start more downloads
  if (activeDownloads.size >= settings.maxConcurrentDownloads) return;

  // Get next download from queue
  const nextId = downloadQueue[0];
  if (!nextId) return;

  const task = downloads.get(nextId);
  if (!task) return;

  // Start download
  try {
    const callback = (downloadProgress: FileSystem.DownloadProgressData) => {
      const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
      const currentTime = Date.now();
      const timeElapsed = (currentTime - task.startTime) / 1000;
      const speed = downloadProgress.totalBytesWritten / timeElapsed;

      useDownloadStore.setState(state => {
        const downloads = new Map(state.downloads);
        const updatedTask = {
          ...downloads.get(task.id)!,
          progress,
          downloadedSize: downloadProgress.totalBytesWritten,
          size: downloadProgress.totalBytesExpectedToWrite,
          speed,
          updatedAt: currentTime,
        };
        downloads.set(task.id, updatedTask);
        return {
          downloads,
          stats: calculateStats(downloads),
        };
      });
    };

    const resumable = FileSystem.createDownloadResumable(
      task.url,
      task.destinationUri,
      {},
      callback
    );

    useDownloadStore.setState(state => {
      const downloads = new Map(state.downloads);
      const downloadQueue = state.downloadQueue.filter(id => id !== task.id);
      const activeDownloads = new Set(state.activeDownloads);
      
      const updatedTask = {
        ...downloads.get(task.id)!,
        status: "downloading" as const,
        resumableDownload: resumable,
      };
      
      downloads.set(task.id, updatedTask);
      activeDownloads.add(task.id);
      
      return {
        downloads,
        downloadQueue,
        activeDownloads,
        stats: calculateStats(downloads),
      };
    });

    const result = await resumable.downloadAsync();
    if (result) {
      useDownloadStore.setState(state => {
        const downloads = new Map(state.downloads);
        const activeDownloads = new Set(state.activeDownloads);
        const history = [...state.history];
        
        activeDownloads.delete(task.id);
        
        const completedTask = {
          ...downloads.get(task.id)!,
          status: "completed" as const,
          progress: 1,
        };
        downloads.set(task.id, completedTask);
        
        history.push({
          id: task.id,
          filename: task.filename,
          url: task.url,
          completedAt: Date.now(),
          size: task.size,
        });
        
        return {
          downloads,
          activeDownloads,
          history,
          stats: calculateStats(downloads),
        };
      });
    }
  } catch (error) {
    useDownloadStore.setState(state => {
      const downloads = new Map(state.downloads);
      const activeDownloads = new Set(state.activeDownloads);
      const errors = new Map(state.errors);
      
      activeDownloads.delete(task.id);
      
      const errorTask = {
        ...downloads.get(task.id)!,
        status: "error" as const,
        error: error instanceof Error ? error.message : "Unknown error",
      };
      downloads.set(task.id, errorTask);
      
      errors.set(task.id, {
        taskId: task.id,
        error: errorTask.error,
        timestamp: Date.now(),
        retryCount: (errors.get(task.id)?.retryCount || 0) + 1,
      });
      
      return {
        downloads,
        activeDownloads,
        errors,
        stats: calculateStats(downloads),
      };
    });
  }

  // Process next download in queue
  await processDownloadQueue();
};

export default useDownloadStore;