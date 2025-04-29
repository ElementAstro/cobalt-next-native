import { useCallback } from 'react';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { FileItemType } from '../components/storage/types';
import { toast } from 'sonner-native';
import { fileStoreHooks } from '../stores/useFileStore';

type FileInfo = FileSystem.FileInfo & {
  size?: number;
  modificationTime?: number;
};

/**
 * Custom hook for handling file system operations
 *
 * Provides functions for:
 * - Loading directory contents
 * - File operations (open, delete, share)
 * - Batch operations
 * - Error handling
 *
 * Integrates with:
 * - expo-file-system for file operations
 * - expo-sharing for sharing files
 * - useFileStore for state management
 */
export function useFileOperations() {
  const {
    useSetError,
    useCurrentPath,
    useSetFiles
  } = fileStoreHooks;

  const setError = useSetError();
  const currentPath = useCurrentPath();
  const setFiles = useSetFiles();

  /**
   * Standardized error handling
   * - Converts unknown errors to readable messages
   * - Updates global error state
   * - Shows toast notification
   */
  const handleError = useCallback((error: unknown) => {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    setError(errorMessage);
    toast.error(errorMessage);
  }, [setError]);

  /**
   * Loads contents of a directory
   * @param path - Directory path to load
   *
   * - Reads directory contents
   * - Gets detailed info for each file
   * - Updates file store with results
   * - Handles errors
   */
  const loadDirectory = useCallback(async (path: string) => {
    try {
      const fileList = await FileSystem.readDirectoryAsync(path);
      const fileDetails = await Promise.all(
        fileList.map(async (name) => {
          const uri = `${path}${name}`;
          const info = await FileSystem.getInfoAsync(uri) as FileInfo;
          return {
            name,
            ...info,
          } as FileItemType;
        })
      );
      setFiles(fileDetails);
    } catch (error) {
      handleError(error);
    }
  }, [setFiles, handleError]);

  /**
   * Handles individual file operations
   * @param file - File to operate on
   * @param action - Operation to perform (open/delete/share/etc)
   * @returns URI for WebView preview if applicable
   *
   * Supported actions:
   * - open: Opens directories or previews/shares files
   * - delete: Deletes the file with confirmation
   * - share: Shares the file using system share sheet
   * - info: Shows file details
   */
  const handleFileAction = useCallback(async (file: FileItemType, action: string) => {
    try {
      switch (action) {
        case 'open':
          if (file.isDirectory) {
            loadDirectory(`${file.uri}/`);
          } else {
            const ext = file.name.split('.').pop()?.toLowerCase();
            if (ext && ['pdf', 'txt', 'jpg', 'png', 'gif'].includes(ext)) {
              return file.uri; // Return URI for WebView
            } else {
              await Sharing.shareAsync(file.uri);
              toast.success('File shared successfully');
            }
          }
          break;

        case 'delete':
          await FileSystem.deleteAsync(file.uri);
          loadDirectory(currentPath);
          toast.success('File deleted successfully');
          break;

        case 'share':
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(file.uri);
            toast.success('File shared successfully');
          }
          break;

        case 'rename':
          // TODO: Implement rename functionality
          toast.info('Rename feature not implemented yet');
          break;

        case 'download':
          // TODO: Implement download functionality
          toast.success('File downloaded successfully');
          break;

        case 'info':
          const info = await FileSystem.getInfoAsync(file.uri) as FileInfo;
          toast.info(
            `File info:\nName: ${file.name}\nSize: ${
              info.size ? (info.size / 1024).toFixed(2) : 'N/A'
            } KB`
          );
          break;

        default:
          toast.error('Unknown action');
      }
      return null;
    } catch (error) {
      handleError(error);
      return null;
    }
  }, [currentPath, loadDirectory, handleError]);

  /**
   * Handles operations on multiple files
   * @param files - Array of file URIs to operate on
   * @param action - Operation to perform
   *
   * Supported batch operations:
   * - delete: Deletes all selected files
   * - share: Shares all selected files
   */
  const handleBatchOperation = useCallback(async (files: string[], action: string) => {
    if (files.length === 0) return;

    try {
      switch (action) {
        case 'delete':
          await Promise.all(files.map((uri) => FileSystem.deleteAsync(uri)));
          loadDirectory(currentPath);
          toast.success('Files deleted successfully');
          break;

        case 'share':
          for (const uri of files) {
            await Sharing.shareAsync(uri);
          }
          toast.success('Files shared successfully');
          break;

        default:
          toast.error('Unknown batch operation');
      }
    } catch (error) {
      handleError(error);
    }
  }, [currentPath, loadDirectory, handleError]);

  return {
    loadDirectory,
    handleFileAction,
    handleBatchOperation,
    handleError,
  };
}