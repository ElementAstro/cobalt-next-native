import React from 'react';
import { View } from 'react-native';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Text } from '../ui/text';
import { FileItemType } from './types';

interface FileDetailsDialogProps {
  file: FileItemType | null;
  open: boolean;
  onClose: () => void;
}

export default function FileDetailsDialog({ file, open, onClose }: FileDetailsDialogProps) {
  if (!file) return null;

  const formatSize = (size?: number) => {
    if (!size) return 'N/A';
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`;
    return `${(size / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleString();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{file.name}</DialogTitle>
        </DialogHeader>
        <View className="space-y-4">
          <View>
            <Text className="text-sm font-medium">Type</Text>
            <Text className="text-muted-foreground">
              {file.isDirectory ? 'Folder' : (file.mimeType || 'File')}
            </Text>
          </View>
          <View>
            <Text className="text-sm font-medium">Size</Text>
            <Text className="text-muted-foreground">
              {formatSize(file.size)}
            </Text>
          </View>
          <View>
            <Text className="text-sm font-medium">Modified</Text>
            <Text className="text-muted-foreground">
              {formatDate(file.modificationTime)}
            </Text>
          </View>
          <View>
            <Text className="text-sm font-medium">Location</Text>
            <Text className="text-muted-foreground" numberOfLines={1}>
              {file.uri}
            </Text>
          </View>
          {file.isFavorite && (
            <View>
              <Text className="text-sm font-medium">Status</Text>
              <Text className="text-muted-foreground">Favorited</Text>
            </View>
          )}
        </View>
      </DialogContent>
    </Dialog>
  );
}