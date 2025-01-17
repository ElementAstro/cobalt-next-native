export interface FileItem {
  name: string;
  uri: string;
  isDirectory: boolean;
  size?: number;
  modificationTime?: number;
}

export type DialogType = "delete" | "rename" | "error" | null;
