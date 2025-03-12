import React, { useMemo } from "react";
import { View } from "react-native";
import {
  ArrowLeft,
  Home,
  RefreshCcw,
  Grid,
  List,
  Settings,
} from "lucide-react-native";
import Animated, {
  FadeIn,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { Button } from "~/components/ui/button";
import { Text } from "~/components/ui/text";

interface FileHeaderProps {
  onNavigateUp: () => void;
  onRefresh?: () => void;
  onViewModeChange?: (mode: 'grid' | 'list') => void;
  onHomePress?: () => void;
  onSettingsPress?: () => void;
  isDisabled: boolean;
  isLandscape: boolean;
  currentPath?: string;
  viewMode?: 'grid' | 'list';
}

const FileHeader: React.FC<FileHeaderProps> = ({
  onNavigateUp,
  onRefresh,
  onViewModeChange,
  onHomePress,
  onSettingsPress,
  isDisabled,
  isLandscape,
  currentPath,
  viewMode = 'grid',
}) => {
  // 处理路径导航
  const pathSegments = useMemo(() => {
    if (!currentPath) return [];
    return currentPath.split('/').filter(Boolean);
  }, [currentPath]);

  // 动画样式
  const headerStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: withSpring(0, {
          damping: 15,
          stiffness: 100,
        }),
      },
    ],
  }));

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      style={[headerStyle]}
      className={`
        border-b border-border/50 bg-background/95 backdrop-blur
        ${isLandscape ? "py-2" : "py-3"}
      `}
    >
      <View className="px-4 flex-row items-center justify-between">
        <View className="flex-row items-center space-x-3">
          <Button
            variant="ghost"
            size="icon"
            onPress={onNavigateUp}
            disabled={isDisabled}
            className={`${isLandscape ? "h-10 w-10" : "h-12 w-12"} rounded-2xl`}
          >
            <ArrowLeft className={isLandscape ? "h-5 w-5" : "h-6 w-6"} />
          </Button>
          
          <View>
            <Text 
              className={`font-bold ${isLandscape ? "text-lg" : "text-xl"}`}
            >
              文件管理器
            </Text>
            {currentPath && (
              <Animated.View
                entering={FadeIn.delay(200)}
                className="flex-row items-center mt-0.5"
              >
                <Text
                  numberOfLines={1}
                  className="text-xs text-muted-foreground max-w-[200px]"
                >
                  {pathSegments.length > 2
                    ? `.../${pathSegments.slice(-2).join('/')}`
                    : currentPath}
                </Text>
              </Animated.View>
            )}
          </View>
        </View>

        <View className="flex-row items-center space-x-2">
          {onHomePress && (
            <Button
              variant="ghost"
              size="icon"
              onPress={onHomePress}
              className={`${isLandscape ? "h-10 w-10" : "h-12 w-12"} rounded-2xl`}
            >
              <Home className={isLandscape ? "h-5 w-5" : "h-6 w-6"} />
            </Button>
          )}

          {onRefresh && (
            <Button
              variant="ghost"
              size="icon"
              onPress={onRefresh}
              className={`${isLandscape ? "h-10 w-10" : "h-12 w-12"} rounded-2xl`}
            >
              <RefreshCcw className={isLandscape ? "h-5 w-5" : "h-6 w-6"} />
            </Button>
          )}

          {onViewModeChange && (
            <Button
              variant="ghost"
              size="icon"
              onPress={() => onViewModeChange(viewMode === 'grid' ? 'list' : 'grid')}
              className={`${isLandscape ? "h-10 w-10" : "h-12 w-12"} rounded-2xl`}
            >
              {viewMode === 'grid' ? (
                <Grid className={isLandscape ? "h-5 w-5" : "h-6 w-6"} />
              ) : (
                <List className={isLandscape ? "h-5 w-5" : "h-6 w-6"} />
              )}
            </Button>
          )}

          {onSettingsPress && (
            <Button
              variant="ghost"
              size="icon"
              onPress={onSettingsPress}
              className={`${isLandscape ? "h-10 w-10" : "h-12 w-12"} rounded-2xl`}
            >
              <Settings className={isLandscape ? "h-5 w-5" : "h-6 w-6"} />
            </Button>
          )}
        </View>
      </View>
    </Animated.View>
  );
};

export default React.memo(FileHeader);
