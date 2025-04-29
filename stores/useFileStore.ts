import { create } from 'zustand';
import * as FileSystem from 'expo-file-system';
import { FileItemType, FileTransaction, OperationStatus, FileSystemEvent, FileSearchFilters } from '../components/storage/types';
import * as FileUtils from '../utils/file-utils';

interface FileState {
  // Existing state
  files: FileItemType[];
  currentPath: string;
  selectedFiles: string[];
  searchQuery: string;
  sortBy: 'name' | 'date' | 'size';
  sortOrder: 'asc' | 'desc';
  filterType: 'all' | 'folders' | 'files';
  viewMode: 'list' | 'grid';
  selectedMode: boolean;
  showDetails: boolean;
  detailsFile: FileItemType | null;
  error: string | null;

  // New advanced state
  operations: Map<string, OperationStatus>;
  transactions: Map<string, FileTransaction>;
  lockedFiles: Set<string>;
  fileVersions: Map<string, FileItemType[]>;
  fileSystemEvents: FileSystemEvent[];
  cachedFiles: Map<string, { data: FileItemType[]; timestamp: number }>;

  // State setters
  setFiles: (files: FileItemType[]) => void;
  setCurrentPath: (path: string) => void;
  setSelectedFiles: (files: string[]) => void;
  setSearchQuery: (query: string) => void;
  setSortBy: (sortBy: 'name' | 'date' | 'size') => void;
  setSortOrder: (order: 'asc' | 'desc') => void;
  setFilterType: (type: 'all' | 'folders' | 'files') => void;
  setViewMode: (mode: 'list' | 'grid') => void;
  setSelectedMode: (mode: boolean) => void;
  setShowDetails: (show: boolean) => void;
  setDetailsFile: (file: FileItemType | null) => void;
  setError: (error: string | null) => void;

  // New advanced actions
  addOperation: (operation: OperationStatus) => void;
  updateOperation: (id: string, update: Partial<OperationStatus>) => void;
  removeOperation: (id: string) => void;
  
  addTransaction: (transaction: FileTransaction) => void;
  updateTransaction: (id: string, update: Partial<FileTransaction>) => void;
  removeTransaction: (id: string) => void;
  
  lockFile: (path: string) => void;
  unlockFile: (path: string) => void;
  
  addFileVersion: (file: FileItemType) => void;
  getFileVersions: (path: string) => FileItemType[];
  
  addFileSystemEvent: (event: FileSystemEvent) => void;
  clearFileSystemEvents: () => void;
  
  // Advanced file operations
  compressFiles: (files: string[], outputPath: string) => Promise<string | null>;
  decompressFile: (path: string, outputPath: string) => Promise<string[] | null>;
  searchFiles: (filters: FileSearchFilters) => Promise<FileItemType[]>;
  batchOperation: (files: string[], operation: string, destination?: string) => Promise<boolean>;
  verifyFileIntegrity: (file: FileItemType) => Promise<boolean>;
  organizeFiles: (targetDir: string) => Promise<Record<string, string[]>>;
}

const fileStore = create<FileState>((set, get) => ({
  // Initial state
  files: [],
  currentPath: FileSystem.documentDirectory || '',
  selectedFiles: [],
  searchQuery: '',
  sortBy: 'name',
  sortOrder: 'asc',
  filterType: 'all',
  viewMode: 'list',
  selectedMode: false,
  showDetails: false,
  detailsFile: null,
  error: null,
  operations: new Map(),
  transactions: new Map(),
  lockedFiles: new Set(),
  fileVersions: new Map(),
  fileSystemEvents: [],
  cachedFiles: new Map(),

  // Basic setters
  setFiles: (files) => set({ files }),
  setCurrentPath: (path) => set({ currentPath: path }),
  setSelectedFiles: (files) => set({ selectedFiles: files }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSortBy: (sortBy) => set({ sortBy }),
  setSortOrder: (order) => set({ sortOrder: order }),
  setFilterType: (type) => set({ filterType: type }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setSelectedMode: (mode) => set({ selectedMode: mode }),
  setShowDetails: (show) => set({ showDetails: show }),
  setDetailsFile: (file) => set({ detailsFile: file }),
  setError: (error) => set({ error }),

  // Advanced operations management
  addOperation: (operation) => set((state) => ({
    operations: new Map(state.operations).set(operation.id, operation)
  })),

  updateOperation: (id, update) => set((state) => {
    const operations = new Map(state.operations);
    const operation = operations.get(id);
    if (operation) {
      operations.set(id, { ...operation, ...update });
    }
    return { operations };
  }),

  removeOperation: (id) => set((state) => {
    const operations = new Map(state.operations);
    operations.delete(id);
    return { operations };
  }),

  // Transaction management
  addTransaction: (transaction) => set((state) => ({
    transactions: new Map(state.transactions).set(transaction.id, transaction)
  })),

  updateTransaction: (id, update) => set((state) => {
    const transactions = new Map(state.transactions);
    const transaction = transactions.get(id);
    if (transaction) {
      transactions.set(id, { ...transaction, ...update });
    }
    return { transactions };
  }),

  removeTransaction: (id) => set((state) => {
    const transactions = new Map(state.transactions);
    transactions.delete(id);
    return { transactions };
  }),

  // File locking
  lockFile: (path) => set((state) => ({
    lockedFiles: new Set(state.lockedFiles).add(path)
  })),

  unlockFile: (path) => set((state) => {
    const lockedFiles = new Set(state.lockedFiles);
    lockedFiles.delete(path);
    return { lockedFiles };
  }),

  // Version control
  addFileVersion: (file) => set((state) => {
    const fileVersions = new Map(state.fileVersions);
    const versions = fileVersions.get(file.uri) || [];
    fileVersions.set(file.uri, [...versions, file]);
    return { fileVersions };
  }),

  getFileVersions: (path) => {
    return get().fileVersions.get(path) || [];
  },

  // File system monitoring
  addFileSystemEvent: (event) => set((state) => ({
    fileSystemEvents: [...state.fileSystemEvents, event]
  })),

  clearFileSystemEvents: () => set({ fileSystemEvents: [] }),

  // Advanced file operations
  compressFiles: async (files, outputPath) => {
    const state = get();
    const operationId = Date.now().toString();
    
    state.addOperation({
      id: operationId,
      type: 'compress',
      status: 'processing',
      progress: 0,
      message: 'Compressing files...'
    });

    try {
      const result = await FileUtils.compressFile(files[0], outputPath);
      
      state.updateOperation(operationId, {
        status: 'completed',
        progress: 100,
        message: 'Compression completed'
      });

      return result;
    } catch (error) {
      state.updateOperation(operationId, {
        status: 'error',
        progress: 0,
        message: 'Compression failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  },

  decompressFile: async (path, outputPath) => {
    const state = get();
    const operationId = Date.now().toString();
    
    state.addOperation({
      id: operationId,
      type: 'decompress',
      status: 'processing',
      progress: 0,
      message: 'Decompressing file...'
    });

    try {
      const result = await FileUtils.decompressFile(path, outputPath);
      
      state.updateOperation(operationId, {
        status: 'completed',
        progress: 100,
        message: 'Decompression completed'
      });

      return result;
    } catch (error) {
      state.updateOperation(operationId, {
        status: 'error',
        progress: 0,
        message: 'Decompression failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  },

  searchFiles: async (filters) => {
    const state = get();
    try {
      // Use the searchFiles functionality from use-advanced-file-operations
      const files = get().files;
      return files.filter(file => {
        if (filters.name && !file.name.toLowerCase().includes(filters.name.toLowerCase())) return false;
        if (filters.extension && !file.name.endsWith(`.${filters.extension}`)) return false;
        if (filters.minSize && (!file.size || file.size < filters.minSize)) return false;
        if (filters.maxSize && (!file.size || file.size > filters.maxSize)) return false;
        if (filters.modifiedAfter && (!file.modificationTime || file.modificationTime < filters.modifiedAfter.getTime())) return false;
        if (filters.modifiedBefore && (!file.modificationTime || file.modificationTime > filters.modifiedBefore.getTime())) return false;
        if (filters.type === 'folders' && !file.isDirectory) return false;
        if (filters.type === 'files' && file.isDirectory) return false;
        return true;
      });
    } catch (error) {
      state.setError(error instanceof Error ? error.message : 'Search failed');
      return [];
    }
  },

  batchOperation: async (files, operation, destination) => {
    const state = get();
    const operationId = Date.now().toString();
    
    // Create transaction
    const transaction: FileTransaction = {
      id: operationId,
      operations: files.map(file => ({
        type: operation as 'copy' | 'move' | 'delete',
        source: file,
        destination
      })),
      status: 'pending',
      timestamp: Date.now()
    };

    state.addTransaction(transaction);
    
    try {
      for (const file of files) {
        if (state.lockedFiles.has(file)) {
          throw new Error(`File ${file} is locked`);
        }
        state.lockFile(file);
      }

      // Handle batch operations directly
      for (const file of files) {
        switch (operation) {
          case 'copy':
            if (!destination) throw new Error('Destination required for copy operation');
            await FileSystem.copyAsync({ from: file, to: `${destination}/${file.split('/').pop()}` });
            break;
          case 'move':
            if (!destination) throw new Error('Destination required for move operation');
            await FileSystem.moveAsync({ from: file, to: `${destination}/${file.split('/').pop()}` });
            break;
          case 'delete':
            await FileSystem.deleteAsync(file);
            break;
          default:
            throw new Error(`Unsupported operation: ${operation}`);
        }
      }
      
      const result = true;
      
      state.updateTransaction(operationId, { status: 'committed' });
      files.forEach(file => state.unlockFile(file));
      
      return result;
    } catch (error) {
      state.updateTransaction(operationId, { status: 'rolledBack' });
      files.forEach(file => state.unlockFile(file));
      state.setError(error instanceof Error ? error.message : 'Operation failed');
      return false;
    }
  },

  verifyFileIntegrity: async (file) => {
    try {
      return await FileUtils.verifyFileIntegrity(file);
    } catch (error) {
      get().setError(error instanceof Error ? error.message : 'Verification failed');
      return false;
    }
  },

  organizeFiles: async (targetDir) => {
    const state = get();
    try {
      return await FileUtils.organizeFiles(state.files, targetDir);
    } catch (error) {
      state.setError(error instanceof Error ? error.message : 'Organization failed');
      return {};
    }
  }
}));

// Store hooks
export const fileStoreHooks = {
  useFiles: () => useFileStore((state) => state.files),
  useCurrentPath: () => useFileStore((state) => state.currentPath),
  useSelectedFiles: () => useFileStore((state) => state.selectedFiles),
  useSearchQuery: () => useFileStore((state) => state.searchQuery),
  useSortBy: () => useFileStore((state) => state.sortBy),
  useSortOrder: () => useFileStore((state) => state.sortOrder),
  useFilterType: () => useFileStore((state) => state.filterType),
  useViewMode: () => useFileStore((state) => state.viewMode),
  useSelectedMode: () => useFileStore((state) => state.selectedMode),
  useShowDetails: () => useFileStore((state) => state.showDetails),
  useDetailsFile: () => useFileStore((state) => state.detailsFile),
  useError: () => useFileStore((state) => state.error),
  // State setters
  useSetFiles: () => useFileStore((state) => state.setFiles),
  useSetCurrentPath: () => useFileStore((state) => state.setCurrentPath),
  useSetSelectedFiles: () => useFileStore((state) => state.setSelectedFiles),
  useSetSearchQuery: () => useFileStore((state) => state.setSearchQuery),
  useSetSortBy: () => useFileStore((state) => state.setSortBy),
  useSetSortOrder: () => useFileStore((state) => state.setSortOrder),
  useSetFilterType: () => useFileStore((state) => state.setFilterType),
  useSetViewMode: () => useFileStore((state) => state.setViewMode),
  useSetSelectedMode: () => useFileStore((state) => state.setSelectedMode),
  useSetShowDetails: () => useFileStore((state) => state.setShowDetails),
  useSetDetailsFile: () => useFileStore((state) => state.setDetailsFile),
  useSetError: () => useFileStore((state) => state.setError),
} as const;

// Export the store instance and hooks
export const useFileStore = fileStore;
export type { FileState };
