import * as FileSystem from "expo-file-system";

// types/download.ts
export type DownloadStatus =
  | "pending"
  | "downloading"
  | "paused"
  | "completed"
  | "error"
  | "canceled";

export type DownloadPriority = "high" | "normal" | "low";

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

export interface DownloadOptions {
  priority?: DownloadPriority;
  metadata?: Record<string, unknown>;
  onProgress?: (progress: number) => void;
  onComplete?: () => void;
  onError?: (error: Error) => void;
}
