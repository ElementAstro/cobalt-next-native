import React, { useMemo, useCallback } from "react";
import {
  FlatList,
  View,
  type FlatListProps,
  type ListRenderItem,
} from "react-native";
import type { AccessibleComponentProps } from "~/types/common";
import Animated, {
  FadeInDown,
  FadeOutUp,
  Layout,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { Text } from "~/components/ui/text";
import { Card } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { cn } from "~/lib/utils";
import type { OptimizedListItemProps } from "~/types/common";

interface OptimizedListProps<T>
  extends Omit<FlatListProps<T>, "renderItem" | "data"> {
  data: T[];
  renderItem: ListRenderItem<T>;
  loading?: boolean;
  loadingCount?: number;
  itemHeight?: number;
  optimizeForPerformance?: boolean;
  enablePullToRefresh?: boolean;
  onRefresh?: () => Promise<void>;
  emptyStateComponent?: React.ReactElement | null;
  headerComponent?: React.ReactElement | null;
  footerComponent?: React.ReactElement | null;
  className: string;
}

/**
 * Optimized list component following 2025 React Native performance best practices
 * Features: Virtualization, smooth animations, pull-to-refresh, skeleton loading
 */
export function OptimizedList<T extends { id: string | number }>({
  data,
  renderItem,
  loading = false,
  loadingCount = 5,
  itemHeight = 80,
  optimizeForPerformance = true,
  enablePullToRefresh = false,
  onRefresh,
  emptyStateComponent,
  headerComponent,
  footerComponent,
  className,
  ...props
}: OptimizedListProps<T>) {
  const [refreshing, setRefreshing] = React.useState(false);

  // Memoized render item with performance optimizations
  const memoizedRenderItem = useCallback<ListRenderItem<T>>(
    ({ item, index }) => {
      const isLast = index === data.length - 1;

      return (
        <AnimatedListItem
          key={item.id}
          item={item}
          index={index}
          isLast={isLast}
          renderContent={renderItem}
        />
      );
    },
    [data.length, renderItem]
  );

  // Optimized item separator
  const ItemSeparator = useCallback(() => <View className="h-2" />, []);

  // Pull to refresh handler
  const handleRefresh = useCallback(async () => {
    if (!onRefresh) return;

    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);

  // Memoized key extractor
  const keyExtractor = useCallback((item: T) => item.id.toString(), []);

  // Performance optimizations
  const getItemLayout = useMemo(() => {
    if (!optimizeForPerformance || !itemHeight) return undefined;

    return (_: any, index: number) => ({
      length: itemHeight,
      offset: itemHeight * index,
      index,
    });
  }, [optimizeForPerformance, itemHeight]);

  // Loading skeleton
  const loadingData = useMemo(
    () =>
      Array.from({ length: loadingCount }, (_, i) => ({ id: `loading-${i}` })),
    [loadingCount]
  );

  const renderLoadingItem = useCallback(
    () => (
      <Card className="p-4 m-2">
        <Skeleton className="h-4 w-3/4 mb-2" />
        <Skeleton className="h-3 w-1/2 mb-1" />
        <Skeleton className="h-3 w-2/3" />
      </Card>
    ),
    []
  );

  // Empty state
  const renderEmptyComponent = useCallback(() => {
    if (loading) return null;

    return (
      emptyStateComponent || (
        <View className="flex-1 justify-center items-center p-8">
          <Text className="text-lg font-semibold text-center mb-2">
            No items found
          </Text>
          <Text className="text-muted-foreground text-center">
            Try adjusting your search or filters
          </Text>
        </View>
      )
    );
  }, [loading, emptyStateComponent]);

  if (loading) {
    return (
      <FlatList<{ id: string }>
        data={loadingData}
        renderItem={renderLoadingItem}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={ItemSeparator}
        showsVerticalScrollIndicator={false}
        className={className || ""}
      />
    );
  }

  return (
    <FlatList<T>
      data={data}
      renderItem={memoizedRenderItem}
      keyExtractor={keyExtractor}
      ItemSeparatorComponent={ItemSeparator}
      ListEmptyComponent={renderEmptyComponent}
      ListHeaderComponent={headerComponent}
      ListFooterComponent={footerComponent}
      getItemLayout={getItemLayout}
      // Performance optimizations
      removeClippedSubviews={optimizeForPerformance}
      maxToRenderPerBatch={optimizeForPerformance ? 5 : 10}
      updateCellsBatchingPeriod={optimizeForPerformance ? 50 : 100}
      initialNumToRender={optimizeForPerformance ? 8 : 10}
      windowSize={optimizeForPerformance ? 5 : 10}
      // Pull to refresh
      refreshing={refreshing}
      onRefresh={enablePullToRefresh ? handleRefresh : undefined}
      // Styling
      showsVerticalScrollIndicator={false}
      contentInsetAdjustmentBehavior="automatic"
      className={className}
      {...props}
    />
  );
}

// Animated list item wrapper
interface AnimatedListItemProps<T extends { id: string | number }> {
  item: T;
  renderContent: ListRenderItem<T>;
  index: number;
  isLast: boolean;
}

function AnimatedListItem<T extends { id: string | number }>(
  props: AnimatedListItemProps<T>
) {
  const { item, index, isLast, renderContent } = props;
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    "worklet";
    scale.value = withSpring(0.98, {
      damping: 15,
      stiffness: 300,
    });
  };

  const handlePressOut = () => {
    "worklet";
    scale.value = withSpring(1, {
      damping: 15,
      stiffness: 300,
    });
  };

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 50).springify()}
      exiting={FadeOutUp}
      layout={Layout.springify()}
      style={animatedStyle}
      onTouchStart={handlePressIn}
      onTouchEnd={handlePressOut}
      onTouchCancel={handlePressOut}
    >
      {renderContent({
        item,
        index,
        separators: {
          highlight: () => {},
          unhighlight: () => {},
          updateProps: () => {},
        },
      })}
    </Animated.View>
  );
}

// Optimized list item component for common use cases
interface ListItemProps {
  title: string;
  subtitle?: string;
  description?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onPress?: () => void;
  className?: string;
}

export function OptimizedListItem({
  title,
  subtitle,
  description,
  leftIcon,
  rightIcon,
  onPress,
  className,
}: ListItemProps) {
  return (
    <Card className={cn("p-4 mx-2", className)}>
      <View className="flex-row items-center space-x-3">
        {leftIcon && (
          <View className="w-10 h-10 items-center justify-center">
            {leftIcon}
          </View>
        )}

        <View className="flex-1">
          <Text className="font-medium text-base">{title}</Text>
          {subtitle && (
            <Text className="text-sm text-muted-foreground mt-1">
              {subtitle}
            </Text>
          )}
          {description && (
            <Text className="text-xs text-muted-foreground mt-1">
              {description}
            </Text>
          )}
        </View>

        {rightIcon && (
          <View className="w-6 h-6 items-center justify-center">
            {rightIcon}
          </View>
        )}
      </View>
    </Card>
  );
}
