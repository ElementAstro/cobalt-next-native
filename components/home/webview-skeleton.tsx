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
} from "react-native-reanimated";

export const WebViewSkeleton = () => {
  const shimmer = useSharedValue(0);
  const contentOpacity = useSharedValue(0.5);

  useEffect(() => {
    // 闪烁动画
    shimmer.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1000, easing: Easing.bezier(0.4, 0, 0.6, 1) }),
        withTiming(0, { duration: 1000, easing: Easing.bezier(0.4, 0, 0.6, 1) })
      ),
      -1
    );

    // 内容透明度呼吸效果
    contentOpacity.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: 1500 }),
        withTiming(0.5, { duration: 1500 })
      ),
      -1
    );
  }, []);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(shimmer.value, [0, 1], [-100, 100]) }],
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  return (
    <Animated.View 
      entering={FadeIn.duration(300)}
      className="flex-1 bg-background/90 backdrop-blur-lg rounded-2xl p-4"
    >
      {/* 顶部栏骨架 */}
      <View className="flex-row items-center justify-between mb-4">
        <View className="h-6 w-32 bg-muted/60 rounded-lg overflow-hidden">
          <Animated.View
            style={shimmerStyle}
            className="w-full h-full bg-gradient-to-r from-transparent via-muted/90 to-transparent"
          />
        </View>
        <View className="h-6 w-6 bg-muted/60 rounded-full overflow-hidden">
          <Animated.View
            style={shimmerStyle}
            className="w-full h-full bg-gradient-to-r from-transparent via-muted/90 to-transparent"
          />
        </View>
      </View>

      {/* 内容区域骨架 */}
      <Animated.View style={contentStyle} className="space-y-4 flex-1">
        {/* 主要内容块 */}
        <View className="h-40 bg-muted/60 rounded-xl overflow-hidden">
          <Animated.View
            style={shimmerStyle}
            className="w-full h-full bg-gradient-to-r from-transparent via-muted/90 to-transparent"
          />
        </View>
        
        {/* 次要内容块 */}
        <View className="h-24 bg-muted/60 rounded-xl overflow-hidden">
          <Animated.View
            style={shimmerStyle}
            className="w-full h-full bg-gradient-to-r from-transparent via-muted/90 to-transparent"
          />
        </View>
        
        {/* 卡片内容块 */}
        <View className="h-32 bg-muted/60 rounded-xl overflow-hidden">
          <Animated.View
            style={shimmerStyle}
            className="w-full h-full bg-gradient-to-r from-transparent via-muted/90 to-transparent"
          />
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
    </Animated.View>
  );
};