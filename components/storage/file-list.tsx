import React, { useCallback } from 'react';
import { View, RefreshControl } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Text } from '../ui/text';
import { useColorScheme } from 'nativewind';
import { FileItemType } from './types';
import FileItem from './file-item';

/**
 * Props for the FileList component
 */
interface FileListProps {
  files: FileItemType[];
  viewMode: 'grid' | 'list';
  isLandscape: boolean;
  onFileAction: (file: FileItemType, action: string) => Promise<void>;
  onRefresh: () => Promise<void>;
  isRefreshing: boolean;
  estimatedItemSize?: number;
}

/**
 * FileList component handles the rendering of files and folders in a list or grid layout.
 * Features:
 * - Smooth animations for item entry and exit
 * - Pull to refresh functionality
 * - Empty state handling
 * - List/Grid view modes
 * - Responsive layout for landscape mode
 */
export default function FileList({
  files,
  viewMode,
  isLandscape,
  onFileAction,
  onRefresh,
  isRefreshing,
  estimatedItemSize = 80,
}: FileListProps) {
  /**
   * Visual separator between list items
   * Only shown in list view mode
   */
  const Separator = () => (
    <View className="h-[1px] bg-border" />
  );
  const { colorScheme } = useColorScheme();
  const listAnimation = useSharedValue(0);

  React.useEffect(() => {
    listAnimation.value = withSpring(1);
  }, []);

  /**
   * Renders individual file/folder items with animation
   * - Entry animation scales and fades in based on name length
   * - Exit animation fades out
   * - Layout transitions are smooth using LinearTransition
   */
  const renderItem = useCallback(
    ({ item }: { item: FileItemType }) => (
      <Animated.View
        entering={FadeIn.delay(item.name.length * 30)
          .springify()
          .duration(600)}
        exiting={FadeOut.duration(200)}
        layout={LinearTransition}
        className="bg-transparent"
      >
        <FileItem
          file={item}
          index={files.indexOf(item)}
          isLandscape={isLandscape}
          onFileAction={onFileAction}
        />
      </Animated.View>
    ),
    [isLandscape, onFileAction, files]
  );

  /**
   * Renders empty state when no files are found
   * - Centered message with descriptive text
   * - Consistent styling with the rest of the UI
   */
  const renderEmpty = useCallback(
    () => (
      <View className="flex-1 items-center justify-center py-8">
        <Text className="text-muted-foreground">No files found</Text>
      </View>
    ),
    []
  );

  /**
   * Animation style for the entire list container
   * - Fades in on mount
   * - Slides up from bottom
   * - Uses spring animation for natural feel
   */
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: listAnimation.value,
    transform: [
      {
        translateY: withSpring((1 - listAnimation.value) * 50),
      },
    ],
  }));

  /**
   * Main render:
   * - Animated container for the entire list
   * - FlashList for efficient rendering of large lists
   * - Pull to refresh functionality
   * - Empty state handling
   * - Dynamic separator based on view mode
   */
  return (
    <Animated.View style={animatedStyle} className="flex-1">
      <FlashList<FileItemType>
        data={files}
        numColumns={viewMode === 'grid' ? 2 : 1}
        estimatedItemSize={viewMode === 'grid' ? 200 : estimatedItemSize}
        renderItem={renderItem}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={colorScheme === 'dark' ? '#fff' : '#000'}
          />
        }
        ItemSeparatorComponent={viewMode === 'list' ? Separator : undefined}
      />
    </Animated.View>
  );
}