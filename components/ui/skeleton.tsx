import React from "react";
import { View } from "react-native";
import { cn } from "~/lib/utils";
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  Easing 
} from "react-native-reanimated";

interface SkeletonProps {
  className?: string;
  height?: number;
  width?: number;
}

export const Skeleton = ({ 
  className, 
  height, 
  width 
}: SkeletonProps) => {
  // 设置动画的初始透明度值
  const opacity = useSharedValue(0.5);

  // 创建动画样式
  const animatedStyles = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
    };
  });

  // 组件加载时启动动画
  React.useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, { 
        duration: 1000,
        easing: Easing.bezier(0.4, 0.0, 0.6, 1)
      }),
      -1, // 无限重复
      true // 反向动画
    );
  }, []);

  return (
    <Animated.View
      style={[
        animatedStyles,
        height !== undefined && { height },
        width !== undefined && { width },
      ]}
      className={cn("bg-muted/60 rounded", className)}
    />
  );
};
