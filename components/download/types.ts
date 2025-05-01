import * as FileSystem from "expo-file-system";

export type DownloadStatus =
  | "pending"
  | "downloading"
  | "paused"
  | "completed"
  | "error"
  | "canceled";

export type DownloadPriority = "high" | "normal" | "low";

export type FileValidationResult = {
  isValid: boolean;
  error?: string;
};

export interface DownloadTask {
  id: string;
  url: string;
  filename: string;
  destinationUri: string;
  progress: number;
  status: DownloadStatus;
  error: string | null;
  priority: DownloadPriority;
  size: number;
  downloadedSize: number;
  speed: number;
  startTime: number;
  createdAt: number;
  updatedAt: number;
  metadata: Record<string, unknown>;
  resumableDownload: FileSystem.DownloadResumable | null;
  retryCount?: number;
  checksum?: string;
  mimeType?: string;
  lastRetryTime?: number;
}

export interface DownloadStats {
  total: number;
  active: number;
  pending: number;
  paused: number;
  completed: number;
  error: number;
  totalProgress: number;
  totalSpeed: number;
  totalSize: number;
  downloadedSize: number;
}

export interface DownloadHistory {
  id: string;
  filename: string;
  url: string;
  completedAt: number;
  size: number;
  checksum?: string;
  downloadDuration?: number;
  averageSpeed?: number;
}

export interface DownloadAnalytics {
  totalDownloads: number;
  totalBytes: number;
  averageSpeed: number;
  successRate: number;
  lastDownloadDate: number | null;
  downloadsByDay?: Record<string, number>;
  averageFileSize?: number;
  peakSpeed?: number;
  commonFileTypes?: Record<string, number>;
}

export interface DownloadSchedule {
  id: string;
  url: string;
  filename: string;
  scheduledTime: number;
  priority: DownloadPriority;
  retryPolicy?: {
    maxAttempts: number;
    delayBetweenAttempts: number;
  };
  metadata?: Record<string, unknown>;
}

export interface DownloadSettings {
  maxConcurrentDownloads: number;
  autoResumeOnConnection: boolean;
  retryAttempts: number;
  retryDelay: number;
  downloadLocation: string;
  allowedFileTypes: string[];
  maxFileSize: number;
  notificationsEnabled: boolean;
  checksumVerification?: boolean;
  organizeByType?: boolean;
  organizeByDate?: boolean;
  compressionEnabled?: boolean;
  bandwidthLimit?: number;
  scheduleRestrictions?: {
    allowedTimeRanges?: Array<{ start: string; end: string }>;
    allowedDays?: number[];
    pauseOnMetered?: boolean;
  };
}

export interface DownloadOptions {
  priority?: DownloadPriority;
  metadata?: Record<string, unknown>;
  onProgress?: (progress: number) => void;
  onComplete?: () => void;
  onError?: (error: Error) => void;
  schedule?: Partial<DownloadSchedule>;
  validation?: {
    expectedSize?: number;
    expectedChecksum?: string;
    allowedTypes?: string[];
    maxSize?: number;
  };
}

export interface DownloadError {
  taskId: string;
  error: string;
  timestamp: number;
  retryCount: number;
  errorCode?: string;
  context?: Record<string, unknown>;
}
