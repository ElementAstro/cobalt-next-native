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
