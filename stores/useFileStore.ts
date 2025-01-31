import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { FileManagerState, FileItem } from '../components/storage/types'
import * as FileSystem from "expo-file-system";

interface FileStore extends FileManagerState {
  files: FileItem[];
  setFiles: (files: FileItem[]) => void;
  setCurrentPath: (path: string) => void;
  addToHistory: (path: string) => void;
  setSelectedFiles: (files: string[]) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  resetState: () => void;
  searchQuery: string;
  sortBy: 'name' | 'date' | 'size';
  sortOrder: 'asc' | 'desc';
  filterType: 'all' | 'files' | 'folders';
  setSearchQuery: (query: string) => void;
  setSortBy: (sortBy: 'name' | 'date' | 'size') => void;
  setSortOrder: (order: 'asc' | 'desc') => void;
  setFilterType: (type: 'all' | 'files' | 'folders') => void;
  selectedMode: boolean;
  showDetails: boolean;
  detailsFile: FileItem | null;
  setSelectedMode: (mode: boolean) => void;
  setShowDetails: (show: boolean) => void;
  setDetailsFile: (file: FileItem | null) => void;

  // 新增状态
  viewMode: 'grid' | 'list';
  gridColumns: number;
  showHidden: boolean;
  favorites: string[];
  recentFiles: FileItem[];
  clipboard: {
    type: 'copy' | 'cut' | null;
    files: string[];
  };
  
  // 新增方法
  setViewMode: (mode: 'grid' | 'list') => void;
  setGridColumns: (columns: number) => void;
  setShowHidden: (show: boolean) => void;
  toggleFavorite: (path: string) => void;
  addRecentFile: (file: FileItem) => void;
  setCopyFiles: (files: string[]) => void;
  setCutFiles: (files: string[]) => void;
  clearClipboard: () => void;
}

const initialState: Omit<FileStore, 'setFiles' | 'setCurrentPath' | 'addToHistory' | 'setSelectedFiles' | 'setIsLoading' | 'setError' | 'resetState' | 'setSearchQuery' | 'setSortBy' | 'setSortOrder' | 'setFilterType' | 'setSelectedMode' | 'setShowDetails' | 'setDetailsFile' | 'setViewMode' | 'setGridColumns' | 'setShowHidden' | 'toggleFavorite' | 'addRecentFile' | 'setCopyFiles' | 'setCutFiles' | 'clearClipboard'> = {
  files: [],
  currentPath: FileSystem.documentDirectory || "",
  history: [],
  selectedFiles: [],
  isLoading: false,
  error: null,
  searchQuery: '',
  sortBy: 'name',
  sortOrder: 'asc',
  filterType: 'all',
  selectedMode: false,
  showDetails: false,
  detailsFile: null,
  viewMode: 'grid',
  gridColumns: 2,
  showHidden: false,
  favorites: [],
  recentFiles: [],
  clipboard: {
    type: null,
    files: []
  },
};

export const useFileStore = create(
  persist<FileStore>(
    (set) => ({
      ...initialState,
      setFiles: (files) => set({ files }),
      setCurrentPath: (path) => set({ currentPath: path }),
      addToHistory: (path) => set((state) => ({
        history: [...state.history, path]
      })),
      setSelectedFiles: (files) => set({ selectedFiles: files }),
      setIsLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
      resetState: () => set(initialState),
      setSearchQuery: (query) => set({ searchQuery: query }),
      setSortBy: (sortBy) => set({ sortBy }),
      setSortOrder: (order) => set({ sortOrder: order }),
      setFilterType: (type) => set({ filterType: type }),
      setSelectedMode: (mode) => set({ selectedMode: mode }),
      setShowDetails: (show) => set({ showDetails: show }),
      setDetailsFile: (file) => set({ detailsFile: file }),
      setViewMode: (mode) => set({ viewMode: mode }),
      setGridColumns: (columns) => set({ gridColumns: columns }),
      setShowHidden: (show) => set({ showHidden: show }),
      toggleFavorite: (path) => set((state) => ({
        favorites: state.favorites.includes(path)
          ? state.favorites.filter(p => p !== path)
          : [...state.favorites, path]
      })),
      addRecentFile: (file) => set((state) => ({
        recentFiles: [file, ...state.recentFiles].slice(0, 20)
      })),
      setCopyFiles: (files) => set({
        clipboard: { type: 'copy', files }
      }),
      setCutFiles: (files) => set({
        clipboard: { type: 'cut', files }
      }),
      clearClipboard: () => set({
        clipboard: { type: null, files: [] }
      }),
    }),
    {
      name: 'file-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)
