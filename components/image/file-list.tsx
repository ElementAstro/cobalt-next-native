import React, { useCallback, useState, useRef } from 'react';
import { View, Dimensions, ViewStyle } from 'react-native';
import { FlashList, ListRenderItemInfo } from '@shopify/flash-list';
import Animated, {
  FadeIn,
  Layout,
  useAnimatedScrollHandler,
  useSharedValue,
} from 'react-native-reanimated';
import DraggableFlatList, {
  ScaleDecorator,
  ShadowDecorator,
  OpacityDecorator,
  RenderItemParams,
} from 'react-native-draggable-flatlist';
import { FileItem as FileItemType } from '~/stores/useImageStore';
import FileItem from './file-item';
import { Text } from '~/components/ui/text';
import { Card } from '~/components/ui/card';
import { Inbox } from 'lucide-react-native';

interface FileListProps {
  files: FileItemType[];
  viewMode?: 'grid' | 'list';
  isLandscape?: boolean;
  onFileAction: (file: FileItemType, action: string) => void;
  onOrderChange?: (files: FileItemType[]) => void;
  selectedFiles?: string[];
  isDraggable?: boolean;
  ListHeaderComponent?: React.ReactElement;
  ListEmptyComponent?: React.ReactElement;
  contentContainerStyle?: ViewStyle;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const AnimatedFlashList = Animated.createAnimatedComponent(FlashList<FileItemType>);

export const FileList: React.FC<FileListProps> = ({
  files,
  viewMode = 'grid',
  isLandscape = false,
  onFileAction,
  onOrderChange,
  selectedFiles = [],
  isDraggable = false,
  ListHeaderComponent,
  ListEmptyComponent,
  contentContainerStyle,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const scrollY = useSharedValue(0);
  const flashListRef = useRef<FlashList<FileItemType>>(null);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const renderDraggableItem = useCallback(
    ({ item, drag, isActive }: RenderItemParams<FileItemType>) => {
      const BaseComponent = isDraggable ? ScaleDecorator : React.Fragment;
      const WithShadow = isDraggable ? ShadowDecorator : React.Fragment;
      const WithOpacity = isDraggable ? OpacityDecorator : React.Fragment;

      return (
        <BaseComponent>
          <WithShadow>
            <WithOpacity>
              <Animated.View
                entering={FadeIn.delay((files.indexOf(item) * 50)).springify()}
                layout={Layout.springify()}
              >
                <FileItem
                  file={item}
                  index={files.indexOf(item)}
                  isLandscape={isLandscape}
                  isSelected={selectedFiles.includes(item.uri)}
                  onFileAction={onFileAction}
                  onLongPress={isDraggable ? drag : undefined}
                  onPress={() => onFileAction(item, 'open')}
                />
              </Animated.View>
            </WithOpacity>
          </WithShadow>
        </BaseComponent>
      );
    },
    [files, isLandscape, selectedFiles, onFileAction, isDraggable]
  );

  const renderFlashListItem = useCallback(
    ({ item }: ListRenderItemInfo<FileItemType>) => (
      <Animated.View
        entering={FadeIn.delay((files.indexOf(item) * 50)).springify()}
        layout={Layout.springify()}
      >
        <FileItem
          file={item}
          index={files.indexOf(item)}
          isLandscape={isLandscape}
          isSelected={selectedFiles.includes(item.uri)}
          onFileAction={onFileAction}
          onPress={() => onFileAction(item, 'open')}
        />
      </Animated.View>
    ),
    [files, isLandscape, selectedFiles, onFileAction]
  );

  const defaultEmptyComponent = (
    <View className="flex-1 items-center justify-center py-12">
      <Card className="p-6 items-center space-y-4 bg-background/95 backdrop-blur">
        <Inbox className="h-12 w-12 text-muted-foreground" />
        <Text className="text-lg font-medium">暂无文件</Text>
        <Text className="text-sm text-muted-foreground text-center">
          当前文件夹为空，可以尝试上传一些文件
        </Text>
      </Card>
    </View>
  );

  if (isDraggable) {
    return (
      <DraggableFlatList
        data={files}
        onDragBegin={() => setDragActive(true)}
        onDragEnd={({ data }) => {
          setDragActive(false);
          onOrderChange?.(data);
        }}
        renderItem={renderDraggableItem}
        keyExtractor={(item) => item.uri}
        numColumns={viewMode === 'grid' ? 2 : 1}
        contentContainerStyle={[
          {
            paddingHorizontal: 12,
            paddingBottom: 20,
          },
          contentContainerStyle,
        ]}
        ListHeaderComponent={ListHeaderComponent}
        ListEmptyComponent={ListEmptyComponent || defaultEmptyComponent}
      />
    );
  }

  return (
    <AnimatedFlashList
      ref={flashListRef}
      data={files}
      renderItem={renderFlashListItem}
      estimatedItemSize={viewMode === 'grid' ? 200 : 100}
      numColumns={viewMode === 'grid' ? 2 : 1}
      onScroll={scrollHandler}
      contentContainerStyle={[
        {
          paddingHorizontal: 12,
          paddingBottom: 20,
        },
        contentContainerStyle,
      ]}
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={ListEmptyComponent || defaultEmptyComponent}
      keyExtractor={(item) => item.uri}
      extraData={[viewMode, selectedFiles, isLandscape]}
    />
  );
};

export default React.memo(FileList);
