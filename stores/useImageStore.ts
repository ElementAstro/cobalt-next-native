import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system";

import { z } from "zod";

// Zod schema for FileItem
export const FileItemSchema = z.object({
  name: z.string().min(1, "文件名不能为空"),
  uri: z.string().url("文件路径必须是有效的URL"),
  isDirectory: z.boolean(),
  size: z.number().nonnegative().optional(),
  modificationTime: z.number().nonnegative().optional(),
  isFavorite: z.boolean().optional(),
  isLocked: z.boolean().optional(),
  permissions: z
    .object({
      read: z.boolean(),
      write: z.boolean(),
      execute: z.boolean(),
    })
    .optional(),
  thumbnailUri: z.string().url().optional(),
  lastAccessed: z.number().nonnegative().optional(),
  tags: z.array(z.string()).optional(),
  mimeType: z.string().optional(),
});

export type FileItem = z.infer<typeof FileItemSchema>;

export const DialogTypeSchema = z.enum(["delete", "rename", "error"]);
export type DialogType = z.infer<typeof DialogTypeSchema> | null;

export const FileActionSchema = z.object({
  type: z.enum([
    "open",
    "delete",
    "share",
    "rename",
    "download",
    "info",
    "lock",
    "star",
    "copy",
    "move",
    "compress",
  ]),
  icon: z.string(),
  label: z.string(),
  requiresConfirmation: z.boolean(),
  color: z.string().optional(),
});

export type FileAction = z.infer<typeof FileActionSchema>;

export interface FileManagerState {
  currentPath: string;
  history: string[];
  selectedFiles: string[];
  isLoading: boolean;
  error: string | null;
}

export interface FileHeaderProps {
  onNavigateUp: () => void;
  isDisabled: boolean;
  isLandscape: boolean;
  currentPath?: string;
}

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
  sortBy: "name" | "date" | "size";
  sortOrder: "asc" | "desc";
  filterType: "all" | "files" | "folders";
  setSearchQuery: (query: string) => void;
  setSortBy: (sortBy: "name" | "date" | "size") => void;
  setSortOrder: (order: "asc" | "desc") => void;
  setFilterType: (type: "all" | "files" | "folders") => void;
  selectedMode: boolean;
  showDetails: boolean;
  detailsFile: FileItem | null;
  setSelectedMode: (mode: boolean) => void;
  setShowDetails: (show: boolean) => void;
  setDetailsFile: (file: FileItem | null) => void;

  // 新增状态
  viewMode: "grid" | "list";
  gridColumns: number;
  showHidden: boolean;
  favorites: string[];
  recentFiles: FileItem[];
  clipboard: {
    type: "copy" | "cut" | null;
    files: string[];
  };

  // 新增方法
  setViewMode: (mode: "grid" | "list") => void;
  setGridColumns: (columns: number) => void;
  setShowHidden: (show: boolean) => void;
  addRecentFile: (file: FileItem) => void;
  setCopyFiles: (files: string[]) => void;
  setCutFiles: (files: string[]) => void;
  clearClipboard: () => void;

  // 批量操作和多选功能
  multiSelectMode: boolean;
  selectedCount: number;
  setMultiSelectMode: (mode: boolean) => void;
  selectAll: () => void;
  deselectAll: () => void;
  toggleSelectMode: () => void;
  toggleFavorite: (uri: string) => void;
  addToRecent: (file: FileItem) => void;

  // 新增状态和操作
  sortOptions: {
    field: "name" | "date" | "size" | "type";
    direction: "asc" | "desc";
  };
  filters: {
    name: string;
    extension: string;
    minSize?: number;
    maxSize?: number;
    dateFrom?: Date;
    dateTo?: Date;
  };
  searchHistory: string[];
  setSortOptions: (options: FileStore["sortOptions"]) => void;
  setFilters: (filters: FileStore["filters"]) => void;
  addToClipboard: (files: string[], type: "copy" | "cut") => void;
  addToSearchHistory: (term: string) => void;
}

const initialState: Omit<
  FileStore,
  | "setFiles"
  | "setCurrentPath"
  | "addToHistory"
  | "setSelectedFiles"
  | "setIsLoading"
  | "setError"
  | "resetState"
  | "setSearchQuery"
  | "setSortBy"
  | "setSortOrder"
  | "setFilterType"
  | "setSelectedMode"
  | "setShowDetails"
  | "setDetailsFile"
  | "setViewMode"
  | "setGridColumns"
  | "setShowHidden"
  | "toggleFavorite"
  | "addRecentFile"
  | "setCopyFiles"
  | "setCutFiles"
  | "clearClipboard"
  | "setMultiSelectMode"
  | "selectAll"
  | "deselectAll"
  | "toggleSelectMode"
  | "addToRecent"
  | "setSortOptions"
  | "setFilters"
  | "addToClipboard"
  | "addToSearchHistory"
> = {
  files: [],
  currentPath: FileSystem.documentDirectory || "",
  history: [],
  selectedFiles: [],
  isLoading: false,
  error: null,
  searchQuery: "",
  sortBy: "name",
  sortOrder: "asc",
  filterType: "all",
  selectedMode: false,
  showDetails: false,
  detailsFile: null,
  viewMode: "grid",
  gridColumns: 2,
  showHidden: false,
  favorites: [],
  recentFiles: [],
  clipboard: {
    type: null,
    files: [],
  },
  multiSelectMode: false,
  selectedCount: 0,
  sortOptions: {
    field: "name",
    direction: "asc",
  },
  filters: {
    name: "",
    extension: "",
  },
  searchHistory: [],
};

export const useFileStore = create(
  persist<FileStore>(
    (set) => ({
      ...initialState,
      setFiles: (files) => set({ files }),
      setCurrentPath: (path) => set({ currentPath: path }),
      addToHistory: (path) =>
        set((state) => ({
          history: [...state.history, path],
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
      toggleFavorite: (path) =>
        set((state) => ({
          favorites: state.favorites.includes(path)
            ? state.favorites.filter((p) => p !== path)
            : [...state.favorites, path],
        })),
      addRecentFile: (file) =>
        set((state) => ({
          recentFiles: [file, ...state.recentFiles].slice(0, 20),
        })),
      setCopyFiles: (files) =>
        set({
          clipboard: { type: "copy", files },
        }),
      setCutFiles: (files) =>
        set({
          clipboard: { type: "cut", files },
        }),
      clearClipboard: () =>
        set({
          clipboard: { type: null, files: [] },
        }),
      setMultiSelectMode: (mode) => set({ multiSelectMode: mode }),
      selectAll: () =>
        set((state) => ({
          selectedFiles: state.files.map((f) => f.uri),
          selectedCount: state.files.length,
        })),
      deselectAll: () => set({ selectedFiles: [], selectedCount: 0 }),
      toggleSelectMode: () =>
        set((state) => ({ multiSelectMode: !state.multiSelectMode })),
      addToRecent: (file: FileItem) =>
        set((state) => ({
          recentFiles: [
            file,
            ...state.recentFiles.filter((f) => f.uri !== file.uri),
          ].slice(0, 10),
        })),
      setSortOptions: (options) => set({ sortOptions: options }),
      setFilters: (filters) => set({ filters }),
      addToClipboard: (files, type) => set({ clipboard: { files, type } }),
      addToSearchHistory: (term) =>
        set((state) => ({
          searchHistory: [term, ...state.searchHistory.slice(0, 9)],
        })),
    }),
    {
      name: "file-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
