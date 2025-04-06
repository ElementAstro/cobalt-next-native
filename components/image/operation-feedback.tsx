import React, { useEffect, useRef } from "react";
import { View, Pressable, Platform } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  Easing,
  FadeIn,
  FadeOut,
  SlideInUp,
  SlideOutDown,
  ZoomIn,
  ZoomOut,
  withRepeat,
} from "react-native-reanimated";
import {
  Check,
  X,
  Loader2,
  AlertCircle,
  Info,
  CheckCircle,
} from "lucide-react-native";
import { Text } from "~/components/ui/text";
import * as Haptics from "expo-haptics";

interface Props {
  type: "success" | "error" | "loading" | "info" | "warning";
  message: string;
  details?: string;
  visible: boolean;
  duration?: number;
  onHide: () => void;
  position?: "top" | "bottom";
  interactive?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const OperationFeedback: React.FC<Props> = ({
  type = "info",
  message,
  details,
  visible,
  duration = 3000,
  onHide,
  position = "bottom",
  interactive = true,
}) => {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(position === "bottom" ? 50 : -50);
  const scale = useSharedValue(0.95);
  const progress = useSharedValue(0);
  const pulseValue = useSharedValue(1);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 触发触觉反馈
  useEffect(() => {
    if (visible && Platform.OS !== "web") {
      switch (type) {
        case "success":
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
        case "error":
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          break;
        case "warning":
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case "info":
        case "loading":
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
      }
    }
  }, [visible, type]);

  // 控制显示/隐藏动画
  useEffect(() => {
    if (visible) {
      // 显示动画
      opacity.value = withTiming(1, { duration: 300 });
      translateY.value = withSpring(0, { damping: 12, stiffness: 100 });
      scale.value = withSpring(1, { damping: 15 });

      // 如果是loading类型，添加脉冲动画
      if (type === "loading") {
        pulseValue.value = withRepeat(
          withSequence(
            withTiming(1.05, {
              duration: 700,
              easing: Easing.inOut(Easing.ease),
            }),
            withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) })
          ),
          -1, // 无限重复
          true // 是否反转
        );
      }

      // 如果不是loading类型且不是交互式的，设置自动隐藏计时器
      if (type !== "loading" && !interactive) {
        if (timerRef.current) clearTimeout(timerRef.current);

        // 启动进度条
        progress.value = withTiming(100, { duration });

        // 设置自动隐藏计时器
        timerRef.current = setTimeout(onHide, duration);
      }

      return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
      };
    } else {
      // 隐藏动画
      opacity.value = withTiming(0, { duration: 200 });
      translateY.value = withTiming(position === "bottom" ? 50 : -50, {
        duration: 300,
      });
      progress.value = 0;
    }
  }, [visible, type, duration, interactive, position]);

  // 主容器动画样式
  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));

  // 进度条动画样式
  const progressStyle = useAnimatedStyle(() => ({
    width: `${progress.value}%`,
  }));

  // 脉冲动画样式
  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseValue.value }],
  }));

  // 获取对应图标和颜色
  const getIconAndColor = () => {
    switch (type) {
      case "success":
        return {
          icon: <CheckCircle size={22} className="text-success" />,
          color: "bg-success/10",
        };
      case "error":
        return {
          icon: <X size={22} className="text-destructive" />,
          color: "bg-destructive/10",
        };
      case "warning":
        return {
          icon: <AlertCircle size={22} className="text-warning" />,
          color: "bg-warning/10",
        };
      case "info":
        return {
          icon: <Info size={22} className="text-info" />,
          color: "bg-info/10",
        };
      case "loading":
        return {
          icon: <Loader2 size={22} className="text-primary animate-spin" />,
          color: "bg-primary/10",
        };
    }
  };

  const { icon, color } = getIconAndColor();

  // 处理点击
  const handlePress = () => {
    if (interactive) {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      onHide();
    }
  };

  if (!visible && opacity.value === 0) return null;

  return (
    <AnimatedPressable
      style={[containerStyle]}
      className={`absolute ${
        position === "bottom" ? "bottom-4" : "top-4"
      } left-4 right-4 bg-background/95 backdrop-blur-sm p-4 rounded-xl shadow-lg border border-border/50`}
      onPress={handlePress}
      accessible={interactive}
      accessibilityRole={interactive ? "button" : "none"}
      accessibilityLabel={message}
      accessibilityHint={interactive ? "点击关闭此消息" : undefined}
    >
      <View className="flex-row items-center space-x-3">
        <Animated.View
          style={type === "loading" ? pulseStyle : undefined}
          className={`rounded-full p-2 ${color}`}
        >
          {icon}
        </Animated.View>

        <View className="flex-1 space-y-1">
          <Text className="font-medium">{message}</Text>
          {details && (
            <Text className="text-sm text-muted-foreground">{details}</Text>
          )}
        </View>

        {interactive && (
          <Pressable
            onPress={onHide}
            className="h-8 w-8 items-center justify-center rounded-full hover:bg-muted"
            hitSlop={{ top: 10, left: 10, bottom: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel="关闭通知"
          >
            <X size={16} className="text-muted-foreground" />
          </Pressable>
        )}
      </View>

      {!interactive && type !== "loading" && (
        <Animated.View
          className="absolute bottom-0 left-0 h-1 bg-primary rounded-b-xl"
          style={progressStyle}
        />
      )}
    </AnimatedPressable>
  );
};
