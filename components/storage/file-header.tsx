import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { Text } from '../ui/text';
import { documentDirectory } from 'expo-file-system';

interface FileHeaderProps {
  onNavigateUp: () => void;
  isDisabled: boolean;
  isLandscape: boolean;
  currentPath: string;
}

export default function FileHeader({
  onNavigateUp,
  isDisabled,
  isLandscape,
  currentPath,
}: FileHeaderProps) {
  const formatPath = (path: string) => {
    if (path === documentDirectory) return 'Home';
    return path
      .replace(documentDirectory || '', '')
      .split('/')
      .filter(Boolean)
      .join(' / ');
  };

  return (
    <View
      className={`
        flex-row items-center px-4 py-2 
        ${isLandscape ? 'border-b border-border' : ''}
      `}
    >
      <TouchableOpacity
        onPress={onNavigateUp}
        disabled={isDisabled}
        className={`
          mr-2 p-2 rounded-full
          ${isDisabled ? 'opacity-50' : 'active:opacity-70'}
        `}
      >
        <ChevronLeft
          className={isDisabled ? 'text-muted-foreground' : 'text-foreground'}
        />
      </TouchableOpacity>

      <View className="flex-1">
        <Text
          className="text-base font-medium"
          numberOfLines={1}
          ellipsizeMode="middle"
        >
          {formatPath(currentPath)}
        </Text>
      </View>
    </View>
  );
}
