import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
  withSequence,
  interpolate,
  ZoomIn,
  cancelAnimation,
  FadeOut,
  LinearTransition,
  Extrapolate,
  withDelay,
} from "react-native-reanimated";
import { Text } from "~/components/ui/text";
import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";
import { Loader2, RefreshCw, Monitor } from "lucide-react-native";

interface WebViewSkeletonProps {
  message?: string;
  variant?: "default" | "detailed";
}

export const WebViewSkeleton: React.FC<WebViewSkeletonProps> = ({ 
  message = "加载中...",
  variant = "default"
}) => {
  // 多个动画控制器，分别处理不同的动画效果
  const shimmer = useSharedValue(0);
  const contentOpacity = useSharedValue(0.5);
  const loadingRotation = useSharedValue(0);
  const pulseAnimation = useSharedValue(0);
  const progressValue = useSharedValue(0);

  // 更复杂的动画效果
  useEffect(() => {
    // 闪烁动画 - 采用更自然的曲线
    shimmer.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1200, easing: Easing.bezier(0.4, 0, 0.6, 1) }),
        withTiming(0, { duration: 1200, easing: Easing.bezier(0.4, 0, 0.6, 1) })
      ),
      -1
    );

    // 内容透明度呼吸效果 - 增加更多变化
    contentOpacity.value = withRepeat(
      withSequence(
        withTiming(0.85, { duration: 1500, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.6, { duration: 1500, easing: Easing.inOut(Easing.quad) })
      ),
      -1
    );
    
    // 加载图标旋转
    loadingRotation.value = withRepeat(
      withTiming(360, { 
        duration: 1500, 
        easing: Easing.linear 
      }),
      -1
    );
    
    // 脉冲动画
    pulseAnimation.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 1000, easing: Easing.inOut(Easing.quad) })
      ),
      -1
    );
    
    // 进度条动画 - 给用户一种进度感
    progressValue.value = withSequence(
      withTiming(0.3, { duration: 1000, easing: Easing.out(Easing.quad) }),
      withTiming(0.6, { duration: 1500, easing: Easing.out(Easing.cubic) }),
      withTiming(0.8, { duration: 2000, easing: Easing.inOut(Easing.quad) }),
      withRepeat(
        withSequence(
          withTiming(0.85, { duration: 1000 }),
          withTiming(0.9, { duration: 1500 }),
          withTiming(0.95, { duration: 2000 })
        ),
        -1
      )
    );
    
    // 清理动画以防内存泄漏
    return () => {
      cancelAnimation(shimmer);
      cancelAnimation(contentOpacity);
      cancelAnimation(loadingRotation);
      cancelAnimation(pulseAnimation);
      cancelAnimation(progressValue);
    };
  }, []);

  // 动画样式
  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(shimmer.value, [0, 1], [-100, 100]) }],
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));
  
  const loadingIconStyle = useAnimatedStyle(() => ({
    transform: [{ rotateZ: `${loadingRotation.value}deg` }],
  }));
  
  const pulseStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      pulseAnimation.value,
      [0, 0.5, 1],
      [0.4, 0.9, 0.4],
      Extrapolate.CLAMP
    ),
    transform: [
      { 
        scale: interpolate(
          pulseAnimation.value,
          [0, 0.5, 1],
          [0.98, 1.02, 0.98],
          Extrapolate.CLAMP
        ) 
      }
    ],
  }));
  
  const progressBarStyle = useAnimatedStyle(() => ({
    width: `${progressValue.value * 100}%`,
  }));
  
  const progressOpacityStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      progressValue.value,
      [0, 0.2],
      [0, 1],
      Extrapolate.CLAMP
    ),
  }));

  return (
    <Animated.View 
      entering={FadeIn.duration(300)}
      exiting={FadeOut.duration(250)}
      layout={LinearTransition.springify()}
      className="flex-1 bg-background/90 backdrop-blur-lg rounded-2xl p-4 relative overflow-hidden"
    >
      {/* 进度条 */}
      <Animated.View 
        style={[progressOpacityStyle]}
        className="absolute top-0 left-0 right-0 h-1 bg-muted/20 z-10"
      >
        <Animated.View
          style={progressBarStyle}
          className="h-full bg-primary rounded-full"
        />
      </Animated.View>
      
      {/* 顶部栏骨架 */}
      <View className="flex-row items-center justify-between mb-4">
        <View className="h-6 w-32 bg-muted/60 rounded-lg overflow-hidden">
          <Animated.View
            style={shimmerStyle}
            className="w-full h-full bg-gradient-to-r from-transparent via-muted/90 to-transparent"
          />
        </View>
        
        <View className="flex-row items-center space-x-2">
          <Animated.View 
            style={pulseStyle}
            className="py-1 px-2 rounded-full bg-muted/60 flex-row items-center space-x-1"
          >
            <Monitor size={12} className="text-muted-foreground/70" />
            <Text className="text-xs text-muted-foreground/70">预览模式</Text>
          </Animated.View>
          
          <View className="h-8 w-8 bg-muted/60 rounded-full overflow-hidden">
            <Animated.View
              style={shimmerStyle}
              className="w-full h-full bg-gradient-to-r from-transparent via-muted/90 to-transparent"
            />
          </View>
        </View>
      </View>

      {/* 内容区域骨架 */}
      <Animated.View style={contentStyle} className="space-y-4 flex-1">
        {/* 主要内容块 - 可根据变体选择不同渲染 */}
        {variant === "detailed" ? (
          <View className="space-y-3">
            <View className="flex-row items-center space-x-2">
              <Skeleton className="h-10 w-10 rounded-full" />
              <View className="space-y-1">
                <Skeleton className="h-4 w-32 rounded-md" />
                <Skeleton className="h-3 w-24 rounded-md" />
              </View>
            </View>
            
            <View className="h-48 bg-muted/60 rounded-xl overflow-hidden">
              <Animated.View
                style={shimmerStyle}
                className="w-full h-full bg-gradient-to-r from-transparent via-muted/90 to-transparent"
              />
            </View>
          </View>
        ) : (
          <View className="h-40 bg-muted/60 rounded-xl overflow-hidden">
            <Animated.View
              style={shimmerStyle}
              className="w-full h-full bg-gradient-to-r from-transparent via-muted/90 to-transparent"
            />
          </View>
        )}
        
        {/* 次要内容块 - 卡片布局 */}
        <View className="flex-row space-x-3">
          <View className="flex-1 h-24 bg-muted/60 rounded-xl overflow-hidden">
            <Animated.View
              style={shimmerStyle}
              className="w-full h-full bg-gradient-to-r from-transparent via-muted/90 to-transparent"
            />
          </View>
          
          <View className="flex-1 h-24 bg-muted/60 rounded-xl overflow-hidden">
            <Animated.View
              style={shimmerStyle}
              className="w-full h-full bg-gradient-to-r from-transparent via-muted/90 to-transparent"
            />
          </View>
        </View>
        
        {/* 额外的内容区块 - 列表项样式 */}
        <View className="space-y-3">
          <View className="h-12 bg-muted/60 rounded-lg overflow-hidden">
            <Animated.View
              style={shimmerStyle}
              className="w-full h-full bg-gradient-to-r from-transparent via-muted/90 to-transparent"
            />
          </View>
          
          <View className="h-12 bg-muted/60 rounded-lg overflow-hidden">
            <Animated.View
              style={shimmerStyle}
              className="w-full h-full bg-gradient-to-r from-transparent via-muted/90 to-transparent"
            />
          </View>
          
          <View className="h-12 bg-muted/60 rounded-lg overflow-hidden">
            <Animated.View
              style={shimmerStyle}
              className="w-full h-full bg-gradient-to-r from-transparent via-muted/90 to-transparent"
            />
          </View>
        </View>
      </Animated.View>

      {/* 底部控制栏骨架 */}
      <View className="flex-row justify-end space-x-2 mt-4">
        <View className="h-10 w-10 bg-muted/60 rounded-lg overflow-hidden">
          <Animated.View
            style={shimmerStyle}
            className="w-full h-full bg-gradient-to-r from-transparent via-muted/90 to-transparent"
          />
        </View>
        <View className="h-10 w-10 bg-muted/60 rounded-lg overflow-hidden">
          <Animated.View
            style={shimmerStyle}
            className="w-full h-full bg-gradient-to-r from-transparent via-muted/90 to-transparent"
          />
        </View>
      </View>
      
      {/* 加载指示器 */}
      <Animated.View 
        entering={ZoomIn.duration(400).delay(300)} 
        style={pulseStyle} 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 items-center"
      >
        <View className="bg-background/80 backdrop-blur-md p-4 rounded-xl shadow-lg border border-border/30 items-center">
          <Animated.View style={loadingIconStyle}>
            {variant === "detailed" ? (
              <RefreshCw className="h-8 w-8 text-primary" />
            ) : (
              <Loader2 className="h-8 w-8 text-primary" />
            )}
          </Animated.View>
          <Text className="text-sm text-muted-foreground font-medium mt-2">
            {message}
          </Text>
        </View>
      </Animated.View>
    </Animated.View>
  );
};

export default React.memo(WebViewSkeleton);