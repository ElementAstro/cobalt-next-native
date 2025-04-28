import React, { useCallback, useState, useRef, useEffect, useMemo } from 'react';
import { View, Dimensions, ViewStyle, Platform, AccessibilityInfo } from 'react-native';
import { FlashList, ListRenderItemInfo } from '@shopify/flash-list';
import Animated, {
  FadeIn,
  LinearTransition,
  SlideInRight,
  ZoomIn,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  FadeOut,
  Easing,
  withDelay,
  withSpring,
  interpolateColor,
  withSequence,
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
import { Button } from '~/components/ui/button';
import { Skeleton } from '~/components/ui/skeleton';
import { useColorScheme } from 'nativewind';
import { 
  Loader2, 
  ArrowUp,
  FolderOpen,
  RefreshCw,
  Grid,
  List as ListIcon,
  ImageIcon,
  SlidersHorizontal,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

interface FileListProps {
  files: FileItemType[];
  viewMode?: 'grid' | 'list';
  isLandscape?: boolean;
  onFileAction: (file: FileItemType, action: string) => void;
  onOrderChange?: (files: FileItemType[]) => void;
  selectedFiles?: string[];
  isDraggable?: boolean;
  isLoading?: boolean;
  onRefresh?: () => Promise<void>;
  onScrollEnd?: () => void;
  onViewModeChange?: (mode: 'grid' | 'list') => void;
  ListHeaderComponent?: React.ReactElement;
  ListEmptyComponent?: React.ReactElement;
  contentContainerStyle?: ViewStyle;
}

// 设备窗口尺寸
const windowDimensions = Dimensions.get('window');
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = windowDimensions;

// 根据屏幕宽度智能计算列数
const getColumnCount = (width: number, isLandscape: boolean) => {
  if (width > 1200) return isLandscape ? 5 : 4;
  if (width > 900) return isLandscape ? 4 : 3;
  if (width > 600) return isLandscape ? 3 : 2;
  return isLandscape ? 3 : 2;
};

const AnimatedFlashList = Animated.createAnimatedComponent(FlashList<FileItemType>);
const AnimatedCard = Animated.createAnimatedComponent(Card);

export const FileList: React.FC<FileListProps> = ({
  files,
  viewMode = 'grid',
  isLandscape = false,
  onFileAction,
  onOrderChange,
  selectedFiles = [],
  isDraggable = false,
  isLoading = false,
  onRefresh,
  onScrollEnd,
  onViewModeChange,
  ListHeaderComponent,
  ListEmptyComponent,
  contentContainerStyle,
}) => {
  // 状态与引用
  const [refreshing, setRefreshing] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false); // 滚动状态跟踪
  const [isScreenReaderEnabled, setIsScreenReaderEnabled] = useState(false); // 辅助功能状态
  const { colorScheme } = useColorScheme();
  
  // 动画值
  const scrollY = useSharedValue(0);
  const fabOpacity = useSharedValue(0);
  const activeViewMode = useSharedValue(viewMode === 'grid' ? 0 : 1);
  const switcherVisible = useSharedValue(1);
  
  // 引用
  const flashListRef = useRef<FlashList<FileItemType>>(null);
  const dragListRef = useRef<any>(null);

  // 智能列数计算
  const columnCount = useMemo(() => 
    getColumnCount(SCREEN_WIDTH, isLandscape), 
    [SCREEN_WIDTH, isLandscape]
  );
  
  // 屏幕阅读器检测
  useEffect(() => {
    let isMounted = true;
    const checkScreenReader = async () => {
      try {
        const isEnabled = await AccessibilityInfo.isScreenReaderEnabled();
        if (isMounted) {
          setIsScreenReaderEnabled(isEnabled);
        }
      } catch (error) {
        console.warn("Failed to check screen reader status:", error);
      }
    };
    
    checkScreenReader();
    const subscription = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      setIsScreenReaderEnabled
    );
    
    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);
  
  // 视图模式变更同步到动画值
  useEffect(() => {
    activeViewMode.value = withTiming(
      viewMode === 'grid' ? 0 : 1,
      { duration: 300, easing: Easing.inOut(Easing.quad) }
    );
  }, [viewMode, activeViewMode]);

  // 处理滚动事件
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      const prevScrollY = scrollY.value;
      scrollY.value = event.contentOffset.y;
      
      // 动态显示/隐藏视图模式切换器
      if (scrollY.value > prevScrollY + 5 && switcherVisible.value === 1) {
        // 向下滚动隐藏
        switcherVisible.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.quad) });
      } else if (scrollY.value < prevScrollY - 5 && switcherVisible.value === 0) {
        // 向上滚动显示
        switcherVisible.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.quad) });
      }
      
      // 控制回到顶部按钮显示
      if (event.contentOffset.y > SCREEN_HEIGHT * 0.3 && fabOpacity.value === 0) {
        fabOpacity.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.quad) });
      } else if (event.contentOffset.y <= SCREEN_HEIGHT * 0.3 && fabOpacity.value === 1) {
        fabOpacity.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.quad) });
      }
    },
    onBeginDrag: () => {
      setIsScrolling(true);
    },
    onEndDrag: (event) => {
      setIsScrolling(false);
      // 检测是否滚动到底部，触发加载更多
      const { contentOffset, contentSize, layoutMeasurement } = event;
      const distanceFromBottom = 
        contentSize.height - (contentOffset.y + layoutMeasurement.height);
        
      if (distanceFromBottom < 250 && onScrollEnd) {
        onScrollEnd();
      }
    },
  });
  
  // 按钮动画
  const fabStyle = useAnimatedStyle(() => {
    return {
      opacity: fabOpacity.value,
      transform: [
        { scale: fabOpacity.value },
        { translateY: (1 - fabOpacity.value) * 20 }
      ]
    };
  });
  
  // 视图模式切换器动画
  const switcherContainerStyle = useAnimatedStyle(() => {
    return {
      opacity: switcherVisible.value,
      transform: [
        { translateY: (1 - switcherVisible.value) * -20 },
        { scale: 0.8 + (switcherVisible.value * 0.2) }
      ]
    };
  });
  
  const switcherStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: withTiming(
        activeViewMode.value === 0 ? 
          (colorScheme === 'dark' ? 'rgba(30, 30, 30, 0.85)' : 'rgba(245, 245, 245, 0.85)') : 
          (colorScheme === 'dark' ? 'rgba(25, 25, 25, 0.85)' : 'rgba(230, 230, 230, 0.85)'),
        { duration: 250 }
      ),
    };
  });
  
  const gridIconStyle = useAnimatedStyle(() => {
    return {
      opacity: withTiming(1 - activeViewMode.value, { duration: 200 }),
      transform: [{ scale: withTiming(1 - activeViewMode.value * 0.3, { duration: 200 }) }]
    };
  });
  
  const listIconStyle = useAnimatedStyle(() => {
    return {
      opacity: withTiming(activeViewMode.value, { duration: 200 }),
      transform: [{ scale: withTiming(0.7 + activeViewMode.value * 0.3, { duration: 200 }) }]
    };
  });

  // 处理刷新事件
  const handleRefresh = async () => {
    if (!onRefresh || refreshing) return;
    
    setRefreshing(true);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    try {
      await onRefresh();
    } catch (error) {
      console.error("刷新失败:", error);
    } finally {
      setRefreshing(false);
    }
  };
  
  // 处理滚动到顶部
  const handleScrollToTop = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    // 添加视觉反馈
    fabOpacity.value = withSequence(
      withTiming(0.7, { duration: 100 }),
      withTiming(1, { duration: 200 })
    );
    
    if (isDraggable && dragListRef.current) {
      dragListRef.current.scrollToOffset({ offset: 0, animated: true });
    } else if (flashListRef.current) {
      flashListRef.current.scrollToOffset({ offset: 0, animated: true });
    }
  }, [isDraggable, fabOpacity]);
  
  // 处理视图模式切换
  const handleViewModeToggle = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    const newMode = viewMode === 'grid' ? 'list' : 'grid';
    onViewModeChange?.(newMode);
  }, [viewMode, onViewModeChange]);

  // 渲染可拖拽列表项
  const renderDraggableItem = useCallback(
    ({ item, drag, getIndex }: RenderItemParams<FileItemType>) => {
      const index = getIndex() ?? 0; // 提供默认值
      
      // 性能优化：条件包装组件
      const BaseComponent = isDraggable ? ScaleDecorator : React.Fragment;
      const WithShadow = isDraggable ? ShadowDecorator : React.Fragment;
      const WithOpacity = isDraggable ? OpacityDecorator : React.Fragment;
      
      return (
        <BaseComponent>
          <WithShadow>
            <WithOpacity>
              <Animated.View
                entering={SlideInRight.delay(Math.min((index * 30) % 1000, 500)).springify()}
                exiting={FadeOut.duration(200)}
                layout={LinearTransition.springify()}
              >
                <FileItem
                  file={item}
                  index={index}
                  isLandscape={isLandscape}
                  isSelected={selectedFiles.includes(item.uri)}
                  onFileAction={onFileAction}
                  onLongPress={isDraggable ? drag : undefined}
                  onPress={() => onFileAction(item, 'open')}
                  delayAnimation={Math.min(index * 20, 500)}
                />
              </Animated.View>
            </WithOpacity>
          </WithShadow>
        </BaseComponent>
      );
    },
    [isLandscape, selectedFiles, onFileAction, isDraggable]
  );

  // 渲染FlashList项
  const renderFlashListItem = useCallback(
    ({ item, index }: ListRenderItemInfo<FileItemType>) => (
      <Animated.View
        entering={SlideInRight.delay(Math.min(((index || 0) * 30) % 1000, 600)).springify()}
        exiting={FadeOut.duration(200)}
        layout={LinearTransition.springify()}
      >
        <FileItem
          file={item}
          index={index || 0} // 提供默认值，防止 index 为 undefined
          isLandscape={isLandscape}
          isSelected={selectedFiles.includes(item.uri)}
          onFileAction={onFileAction}
          onPress={() => onFileAction(item, 'open')}
          delayAnimation={Math.min((index || 0) * 20, 500)} // 提供默认值，防止 index 为 undefined
        />
      </Animated.View>
    ),
    [isLandscape, selectedFiles, onFileAction]
  );
  
  // 渲染加载骨架屏
  const renderSkeletonItem = useCallback(() => (
    <Animated.View
      entering={FadeIn.duration(300)}
      className="p-2"
    >
      <Skeleton className="w-full h-[180px] rounded-xl" />
      <View className="space-y-2 mt-2 px-1">
        <Skeleton className="w-3/4 h-4 rounded" />
        <Skeleton className="w-1/2 h-3 rounded" />
      </View>
    </Animated.View>
  ), []);
  
  // 渲染加载中状态 
  const renderLoadingState = useCallback(() => {
    const skeletonCount = Math.max(6, Math.floor((SCREEN_HEIGHT / 200) * columnCount));
    
    return (
      <View className="flex-row flex-wrap">
        {Array.from({ length: skeletonCount }).map((_, index) => (
          <View 
            key={`skeleton-${index}`} 
            style={{ 
              width: viewMode === 'grid' 
                ? `${100 / columnCount}%` 
                : '100%'
            }}
            className="p-2"
            accessibilityLabel="正在加载文件"
            accessibilityHint="请等待文件加载完成"
          >
            {renderSkeletonItem()}
          </View>
        ))}
      </View>
    );
  }, [viewMode, columnCount, renderSkeletonItem]);
  
  // 渲染空状态
  const defaultEmptyComponent = useMemo(() => (
    <AnimatedCard 
      entering={ZoomIn.duration(500).springify()} 
      className="mx-8 my-12 p-8 items-center space-y-4 bg-background/95 backdrop-blur border-border/30"
      accessibilityLabel={isLoading ? "正在加载文件" : "暂无文件"}
      accessibilityHint={isLoading ? "请等待加载完成" : "可以尝试上传新文件"}
    >
      {isLoading ? (
        <>
          <Animated.View 
            entering={FadeIn.duration(400)} 
            className="items-center"
          >
            <Loader2 className="h-12 w-12 text-primary animate-spin" />
            <Text className="text-lg font-medium mt-4">加载中...</Text>
            <Text className="text-sm text-muted-foreground text-center mt-2">
              正在获取文件列表，请稍候
            </Text>
          </Animated.View>
        </>
      ) : (
        <>
          <Animated.View 
            entering={ZoomIn.delay(150).duration(400)} 
            className="bg-muted/20 p-5 rounded-full"
          >
            <FolderOpen className="h-12 w-12 text-muted-foreground" />
          </Animated.View>
          <Text className="text-lg font-medium">暂无文件</Text>
          <Text className="text-sm text-muted-foreground text-center">
            当前文件夹为空，可以尝试上传一些文件
          </Text>
          {onRefresh && (
            <Button 
              className="mt-2" 
              onPress={handleRefresh}
              accessibilityLabel="刷新文件列表"
              accessibilityHint="点击刷新文件列表"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              <Text>刷新</Text>
            </Button>
          )}
        </>
      )}
    </AnimatedCard>
  ), [isLoading, onRefresh, handleRefresh]);
  
  // 返回"回到顶部"按钮
  const renderScrollToTopButton = useCallback(() => (
    <Animated.View
      style={[fabStyle]}
      className="absolute bottom-20 right-4 z-10"
      pointerEvents={fabOpacity.value === 0 ? 'none' : 'auto'}
    >
      <Button
        variant="secondary"
        size="icon"
        className="h-12 w-12 rounded-full shadow-xl bg-background/90 backdrop-blur-md border border-border/30"
        onPress={handleScrollToTop}
        accessibilityLabel="回到顶部"
        accessibilityHint="点击回到列表顶部"
      >
        <ArrowUp className="h-5 w-5" />
      </Button>
    </Animated.View>
  ), [fabStyle, handleScrollToTop]);
  
  // 返回视图模式切换按钮
  const renderViewModeSwitcher = useCallback(() => (
    onViewModeChange && (
      <Animated.View
        style={[switcherContainerStyle]}
        className="absolute top-4 right-4 z-10"
        pointerEvents="box-none"
      >
        <Animated.View
          style={[switcherStyle]}
          className="flex-row rounded-full overflow-hidden border border-border/10 shadow-lg"
        >
          <Button
            variant="ghost"
            className="h-10 w-10 rounded-full"
            onPress={handleViewModeToggle}
            accessibilityLabel="切换视图模式"
            accessibilityHint={`当前是${viewMode === 'grid' ? '网格' : '列表'}模式，点击切换到${viewMode === 'grid' ? '列表' : '网格'}模式`}
          >
            <Animated.View style={gridIconStyle} className="absolute inset-0 items-center justify-center">
              <Grid className="h-5 w-5" />
            </Animated.View>
            <Animated.View style={listIconStyle} className="absolute inset-0 items-center justify-center">
              <ListIcon className="h-5 w-5" />
            </Animated.View>
          </Button>
        </Animated.View>
      </Animated.View>
    )
  ), [
    onViewModeChange, 
    switcherContainerStyle, 
    switcherStyle, 
    gridIconStyle, 
    listIconStyle, 
    handleViewModeToggle,
    viewMode
  ]);

  // 渲染文件统计信息
  const renderFileStats = useCallback(() => {
    if (!files.length || isLoading) return null;
    
    const folderCount = files.filter(file => file.isDirectory).length;
    const fileCount = files.length - folderCount;
    
    return (
      <Animated.View 
        entering={FadeIn.delay(300).duration(400)}
        className="px-4 py-2 mb-2"
      >
        <Text className="text-xs text-muted-foreground">
          {folderCount > 0 && `${folderCount} 个文件夹`}
          {folderCount > 0 && fileCount > 0 && '，'}
          {fileCount > 0 && `${fileCount} 个文件`}
        </Text>
      </Animated.View>
    );
  }, [files, isLoading]);

  if (isLoading && files.length === 0) {
    return renderLoadingState();
  }

  // 渲染可拖拽列表
  if (isDraggable) {
    return (
      <View className="flex-1 relative">
        {renderViewModeSwitcher()}
        
        <DraggableFlatList
          ref={dragListRef}
          data={files}
          onDragBegin={() => {
            if (Platform.OS !== 'web') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }
          }}
          onDragEnd={({ data }) => {
            onOrderChange?.(data);
            if (Platform.OS !== 'web') {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
          }}
          renderItem={renderDraggableItem}
          keyExtractor={(item) => item.uri}
          numColumns={viewMode === 'grid' ? columnCount : 1}
          contentContainerStyle={[
            {
              paddingHorizontal: 12,
              paddingBottom: Platform.OS === 'ios' ? 120 : 100,
              paddingTop: 16,
            },
            contentContainerStyle,
          ]}
          onRefresh={onRefresh ? handleRefresh : undefined}
          refreshing={refreshing}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          ListHeaderComponent={
            <>
              {ListHeaderComponent}
              {renderFileStats()}
            </>
          }
          ListEmptyComponent={ListEmptyComponent || defaultEmptyComponent}
          showsVerticalScrollIndicator={false}
          // 辅助功能属性
          accessible={true}
          accessibilityLabel="可拖动的文件列表"
          accessibilityHint="长按文件可以拖动排序"
        />
        
        {renderScrollToTopButton()}
      </View>
    );
  }

  // 渲染FlashList
  return (
    <View className="flex-1 relative">
      {renderViewModeSwitcher()}
      
      <AnimatedFlashList
        ref={flashListRef}
        data={files}
        renderItem={renderFlashListItem}
        estimatedItemSize={viewMode === 'grid' ? 200 : 120}
        numColumns={viewMode === 'grid' ? columnCount : 1}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={[
          {
            paddingHorizontal: 12,
            paddingBottom: Platform.OS === 'ios' ? 120 : 100,
            paddingTop: 16,
          },
          contentContainerStyle,
        ]}
        ListHeaderComponent={
          <>
            {ListHeaderComponent}
            {renderFileStats()}
          </>
        }
        ListEmptyComponent={ListEmptyComponent || defaultEmptyComponent}
        onRefresh={onRefresh ? handleRefresh : undefined}
        refreshing={refreshing}
        onEndReached={onScrollEnd}
        onEndReachedThreshold={0.5}
        keyExtractor={(item) => item.uri}
        extraData={[viewMode, selectedFiles, isLandscape]}
        removeClippedSubviews={Platform.OS !== 'web'}
        // FlashList 优化属性
        drawDistance={800}
        maintainVisibleContentPosition={{
          minIndexForVisible: 0,
        }}
        showsVerticalScrollIndicator={false}
        // 辅助功能属性
        accessible={true}
        accessibilityLabel="文件列表"
      />
      
      {renderScrollToTopButton()}
    </View>
  );
};

export default React.memo(FileList);
