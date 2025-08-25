/**
 * Download Factory
 * Creates test data for download operations
 */

export interface DownloadItemData {
  id: string;
  url: string;
  filename: string;
  status: 'pending' | 'downloading' | 'completed' | 'failed' | 'paused';
  progress: number;
  totalSize: number;
  downloadedSize: number;
  speed: number;
  estimatedTimeRemaining: number;
  startTime: string;
  endTime?: string;
  error?: string;
  metadata: {
    contentType: string;
    lastModified?: string;
    etag?: string;
  };
}

export interface DownloadStateData {
  downloads: DownloadItemData[];
  activeDownloads: number;
  totalDownloads: number;
  completedDownloads: number;
  failedDownloads: number;
  totalBytesDownloaded: number;
  settings: {
    maxConcurrentDownloads: number;
    downloadPath: string;
    autoRetry: boolean;
    retryAttempts: number;
  };
}

export const createDownloadItem = (overrides: Partial<DownloadItemData> = {}): DownloadItemData => ({
  id: `download-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  url: 'https://example.com/file.zip',
  filename: 'test-file.zip',
  status: 'pending',
  progress: 0,
  totalSize: 1024 * 1024, // 1MB
  downloadedSize: 0,
  speed: 0,
  estimatedTimeRemaining: 0,
  startTime: new Date().toISOString(),
  metadata: {
    contentType: 'application/zip',
    lastModified: new Date().toISOString(),
    etag: '"abc123"',
  },
  ...overrides,
});

export const createDownloadState = (overrides: Partial<DownloadStateData> = {}): DownloadStateData => ({
  downloads: [],
  activeDownloads: 0,
  totalDownloads: 0,
  completedDownloads: 0,
  failedDownloads: 0,
  totalBytesDownloaded: 0,
  settings: {
    maxConcurrentDownloads: 3,
    downloadPath: '/downloads',
    autoRetry: true,
    retryAttempts: 3,
  },
  ...overrides,
});

export const createActiveDownload = (): DownloadItemData => 
  createDownloadItem({
    status: 'downloading',
    progress: 45,
    downloadedSize: 460800, // 45% of 1MB
    speed: 102400, // 100KB/s
    estimatedTimeRemaining: 5500, // 5.5 seconds
  });

export const createCompletedDownload = (): DownloadItemData => 
  createDownloadItem({
    status: 'completed',
    progress: 100,
    downloadedSize: 1024 * 1024, // 1MB
    speed: 0,
    estimatedTimeRemaining: 0,
    endTime: new Date().toISOString(),
  });

export const createFailedDownload = (): DownloadItemData => 
  createDownloadItem({
    status: 'failed',
    progress: 25,
    downloadedSize: 256 * 1024, // 256KB
    speed: 0,
    estimatedTimeRemaining: 0,
    error: 'Network connection lost',
    endTime: new Date().toISOString(),
  });

export const createPausedDownload = (): DownloadItemData => 
  createDownloadItem({
    status: 'paused',
    progress: 60,
    downloadedSize: 614400, // 60% of 1MB
    speed: 0,
    estimatedTimeRemaining: 0,
  });

export const createLargeDownload = (): DownloadItemData => 
  createDownloadItem({
    filename: 'large-file.iso',
    totalSize: 4 * 1024 * 1024 * 1024, // 4GB
    metadata: {
      contentType: 'application/octet-stream',
    },
  });

export const createDownloadStateWithMultipleItems = (): DownloadStateData => {
  const downloads = [
    createActiveDownload(),
    createCompletedDownload(),
    createFailedDownload(),
    createPausedDownload(),
  ];

  return createDownloadState({
    downloads,
    activeDownloads: 1,
    totalDownloads: 4,
    completedDownloads: 1,
    failedDownloads: 1,
    totalBytesDownloaded: 1024 * 1024, // 1MB from completed download
  });
};

export const createDownloadBatch = (count: number): DownloadItemData[] => 
  Array.from({ length: count }, (_, index) => 
    createDownloadItem({
      filename: `batch-file-${index + 1}.zip`,
      url: `https://example.com/batch-file-${index + 1}.zip`,
    })
  );

export const createDownloadWithCustomMetadata = (metadata: Partial<DownloadItemData['metadata']>): DownloadItemData => 
  createDownloadItem({
    metadata: {
      contentType: 'application/zip',
      lastModified: new Date().toISOString(),
      etag: '"abc123"',
      ...metadata,
    },
  });
