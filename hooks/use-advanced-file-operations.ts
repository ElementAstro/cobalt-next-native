import { useState, useEffect, useCallback } from 'react';
import * as FileSystem from 'expo-file-system';
import { createHash } from 'crypto';

type FileSystemInfo = {
  exists: boolean;
  uri: string;
  size?: number;
  isDirectory: boolean;
};

// Helper function to safely get file info
const getFileInfo = async (path: string): Promise<FileSystemInfo | null> => {
  try {
    const info = await FileSystem.getInfoAsync(path, { size: true });
    return {
      exists: info.exists,
      uri: info.uri,
      size: 'size' in info ? info.size : undefined,
      isDirectory: 'isDirectory' in info ? info.isDirectory : false
    };
  } catch (error) {
    console.error('Error getting file info:', error);
    return null;
  }
};
import { FileItemType, FileTransaction, OperationStatus, FileSystemEvent, FileSearchFilters } from '../components/storage/types';

/**
 * Hook for advanced file system operations including batch processing,
 * versioning, locking, monitoring, and performance optimization
 */
export function useAdvancedFileOperations() {
  const [operations, setOperations] = useState<Map<string, OperationStatus>>(new Map());
  const [transactions, setTransactions] = useState<Map<string, FileTransaction>>(new Map());
  const [locks, setLocks] = useState<Set<string>>(new Set());
  const [fileVersions, setFileVersions] = useState<Map<string, FileItemType[]>>(new Map());
  const [fileSystemEvents, setFileSystemEvents] = useState<FileSystemEvent[]>([]);

  // Cache for file operations
  const operationCache = new Map<string, any>();
  const FILE_LOCK_TIMEOUT = 30000; // 30 seconds

  /**
   * File locking mechanism
   */
  const acquireLock = useCallback(async (path: string): Promise<boolean> => {
    if (locks.has(path)) return false;
    
    setLocks(prev => {
      const newLocks = new Set(prev);
      newLocks.add(path);
      return newLocks;
    });

    // Auto-release lock after timeout
    setTimeout(() => releaseLock(path), FILE_LOCK_TIMEOUT);
    return true;
  }, [locks]);

  const releaseLock = useCallback((path: string) => {
    setLocks(prev => {
      const newLocks = new Set(prev);
      newLocks.delete(path);
      return newLocks;
    });
  }, []);

  /**
   * Operation status management
   */
  const updateOperationStatus = useCallback((id: string, status: Partial<OperationStatus>) => {
    setOperations(prev => {
      const newOps = new Map(prev);
      const currentOp = newOps.get(id);
      if (currentOp) {
        newOps.set(id, { ...currentOp, ...status });
      }
      return newOps;
    });
  }, []);

  /**
   * Transaction management for batch operations
   */
  const createTransaction = useCallback(async (operations: { type: 'copy' | 'move' | 'delete', source: string, destination?: string }[]) => {
    const transactionId = Date.now().toString();
    const transaction: FileTransaction = {
      id: transactionId,
      operations,
      status: 'pending',
      timestamp: Date.now()
    };

    setTransactions(prev => {
      const newTransactions = new Map(prev);
      newTransactions.set(transactionId, transaction);
      return newTransactions;
    });

    return transactionId;
  }, []);

  /**
   * File versioning support
   */
  const createFileVersion = useCallback(async (file: FileItemType) => {
    const fileContent = await FileSystem.readAsStringAsync(file.uri);
    const checksum = createHash('md5').update(fileContent).digest('hex');
    
    const version: FileItemType = {
      ...file,
      version: {
        number: (fileVersions.get(file.uri)?.length || 0) + 1,
        timestamp: Date.now()
      },
      checksum
    };

    setFileVersions(prev => {
      const newVersions = new Map(prev);
      const fileHistory = newVersions.get(file.uri) || [];
      newVersions.set(file.uri, [...fileHistory, version]);
      return newVersions;
    });

    return version;
  }, [fileVersions]);

  /**
   * File change monitoring
   */
  const addFileSystemEvent = useCallback((event: FileSystemEvent) => {
    setFileSystemEvents(prev => [...prev, event]);
  }, []);

  /**
   * Batch file operations
   */
  const batchOperation = useCallback(async (
    files: string[],
    operation: 'copy' | 'move' | 'delete',
    destination?: string
  ): Promise<boolean> => {
    const operationId = Date.now().toString();
    const total = files.length;
    let completed = 0;

    try {
      // Create transaction
      const transactionId = await createTransaction(
        files.map(file => ({ type: operation, source: file, destination }))
      );

      // Process files
      for (const file of files) {
        if (!await acquireLock(file)) {
          throw new Error(`Could not acquire lock for ${file}`);
        }

        try {
          switch (operation) {
            case 'copy':
              if (!destination) throw new Error('Destination required for copy operation');
              await FileSystem.copyAsync({ from: file, to: destination });
              break;
            case 'move':
              if (!destination) throw new Error('Destination required for move operation');
              await FileSystem.moveAsync({ from: file, to: destination });
              break;
            case 'delete':
              await FileSystem.deleteAsync(file);
              break;
          }

          completed++;
          updateOperationStatus(operationId, {
            progress: (completed / total) * 100,
            status: 'processing'
          });

          addFileSystemEvent({
            type: operation === 'delete' ? 'deleted' : 'modified',
            path: file,
            timestamp: Date.now()
          });

        } finally {
          releaseLock(file);
        }
      }

      updateOperationStatus(operationId, {
        status: 'completed',
        progress: 100
      });

      return true;

    } catch (error) {
      const err = error as Error;
      updateOperationStatus(operationId, {
        status: 'error',
        error: err.message || 'Unknown error occurred'
      });
      return false;
    }
  }, [acquireLock, releaseLock, updateOperationStatus, createTransaction, addFileSystemEvent]);

  /**
   * Advanced file search
   */
  const searchFiles = useCallback(async (
    directory: string,
    filters: FileSearchFilters
  ): Promise<FileItemType[]> => {
    const allFiles = await FileSystem.readDirectoryAsync(directory);
    const results: FileItemType[] = [];

    for (const file of allFiles) {
      const filePath = `${directory}/${file}`;
      const fileInfo = await getFileInfo(filePath);
      
      if (!fileInfo || !fileInfo.exists) continue;

      const fileItem: FileItemType = {
        name: file,
        uri: filePath,
        isDirectory: fileInfo.isDirectory,
        size: fileInfo.size,
        // Use creation time as modification time since it's not available in expo-file-system
        modificationTime: Date.now()
      };

      // Apply filters
      if (filters.name && !file.toLowerCase().includes(filters.name.toLowerCase())) continue;
      if (filters.extension && !file.endsWith(filters.extension)) continue;
      if (filters.minSize && (!fileInfo.size || fileInfo.size < filters.minSize)) continue;
      if (filters.maxSize && (!fileInfo.size || fileInfo.size > filters.maxSize)) continue;
      if (filters.type === 'folders' && !fileInfo.isDirectory) continue;
      if (filters.type === 'files' && fileInfo.isDirectory) continue;

      results.push(fileItem);
    }

    return results;
  }, []);

  return {
    batchOperation,
    searchFiles,
    createFileVersion,
    acquireLock,
    releaseLock,
    operations,
    transactions,
    fileVersions,
    fileSystemEvents
  };
}