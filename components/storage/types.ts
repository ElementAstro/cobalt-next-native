import type { ContentProps } from "@rn-primitives/dialog";

/**
 * Re-export dialog props for consistent usage
 */
export type DialogProps = ContentProps;

/**
 * Main file type definition
 * Represents both files and directories in the file system
 */
export interface FileItemType {
  /** Name of the file or directory */
  name: string;
  /** Full path/URI to the file or directory */
  uri: string;
  /** Whether the item is a directory */
  isDirectory: boolean;
  /** Size of the file in bytes */
  size?: number;
  /** Last modification timestamp */
  modificationTime?: number;
  /** Whether user has marked as favorite */
  isFavorite?: boolean;
  /** Whether file access is restricted */
  isLocked?: boolean;
  /** MIME type for the file */
  mimeType?: string;
  /** Version information for file versioning */
  version?: {
    number: number;
    timestamp: number;
    author?: string;
  };
  /** File checksum for integrity verification */
  checksum?: string;
  /** Compression information */
  compression?: {
    type: "gzip" | "zip" | "none";
    originalSize: number;
    compressedSize: number;
  };
  /** File metadata */
  metadata?: {
    [key: string]: any;
    created: number;
    lastAccessed: number;
    tags: string[];
  };
}

/** Operation status for progress tracking */
export interface OperationStatus {
  id: string;
  type: "copy" | "move" | "delete" | "compress" | "decompress";
  status: "pending" | "processing" | "completed" | "error";
  progress: number;
  message: string;
  error?: string;
}

/** Transaction for batch operations */
export interface FileTransaction {
  id: string;
  operations: {
    type: "copy" | "move" | "delete";
    source: string;
    destination?: string;
  }[];
  status: "pending" | "committing" | "committed" | "rollingBack" | "rolledBack";
  timestamp: number;
}

/** File system monitor event */
export interface FileSystemEvent {
  type: "created" | "modified" | "deleted" | "renamed";
  path: string;
  timestamp: number;
  details?: {
    oldPath?: string;
    newPath?: string;
    size?: number;
  };
}

/** Dialog type for confirm/error dialogs */
export type DialogType = "delete" | "error" | null;

/** State for dialog management */
export interface DialogState {
  /** Whether dialog is visible */
  showDialog: boolean;
  /** Type of dialog to show */
  type: DialogType;
  /** Message to display in dialog */
  message: string;
}

/** Available filter options for file list */
export type FilterType = "all" | "folders" | "files";

/** Available sort criteria */
export type SortBy = "name" | "date" | "size";

/** Sort direction options */
export type SortOrder = "asc" | "desc";

/** Props for file operation handling */
export interface FileOperationProps {
  /** Callback for single file operations */
  onFileAction: (file: FileItemType, action: string) => Promise<void>;
  /** Optional callback for batch operations */
  onBatchOperation?: (files: string[], action: string) => Promise<void>;
  /** Optional callback for file system events */
  onFileSystemEvent?: (event: FileSystemEvent) => void;
  /** Optional callback for operation status updates */
  onOperationStatusUpdate?: (status: OperationStatus) => void;
}

/** Props for file details dialog */
export interface FileDetailsDialogProps extends DialogProps {
  /** File to show details for */
  file: FileItemType | null;
}

/** Props for file list component */
export interface FileListProps {
  /** Array of files to display */
  files: FileItemType[];
  /** Display mode for the list */
  viewMode: "list" | "grid";
  /** Whether in landscape orientation */
  isLandscape: boolean;
  /** Callback for file actions */
  onFileAction: (file: FileItemType, action: string) => Promise<void>;
  /** Callback for refresh action */
  onRefresh: () => Promise<void>;
  /** Whether refresh is in progress */
  isRefreshing: boolean;
}

/** Search filters for file operations */
export interface FileSearchFilters {
  name?: string;
  extension?: string;
  minSize?: number;
  maxSize?: number;
  modifiedAfter?: Date;
  modifiedBefore?: Date;
  tags?: string[];
  type?: FilterType;
}

/** Cache configuration */
export interface CacheConfig {
  enabled: boolean;
  maxSize: number;
  ttl: number;
  strategy: "lru" | "fifo";
}

/** Resource monitoring stats */
export interface ResourceStats {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  operationsPerSecond: number;
}
