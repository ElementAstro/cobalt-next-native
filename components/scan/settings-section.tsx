import React, { useState, useCallback, useEffect } from "react";
import { View, Pressable } from "react-native";
import { Label } from "~/components/ui/label";
import {
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Settings2,
  ChevronRight,
} from "lucide-react-native";
import Animated, {
  withTiming,
  useAnimatedStyle,
  withSpring,
  withSequence,
  FadeIn,
  FadeOut,
  Layout,
  interpolate,
  useSharedValue,
  runOnJS,
  Easing,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { toast } from "sonner-native";
import { useColorScheme } from "nativewind";

interface SettingsSectionProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  collapsible?: boolean;
  description?: string;
  isError?: boolean;
  icon?: React.ComponentType<any>;
  defaultCollapsed?: boolean;
  onToggle?: (collapsed: boolean) => void;
  animationDuration?: number;
  onErrorClick?: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const SettingsSection: React.FC<SettingsSectionProps> = ({
  title,
  children,
  className = "",
  collapsible = false,
  description,
  isError = false,
  icon: Icon = Settings2,
  defaultCollapsed = false,
  onToggle,
  animationDuration = 300,
  onErrorClick,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const animation = useSharedValue(defaultCollapsed ? 0 : 1);
  const pressed = useSharedValue(0);
  const errorAnimation = useSharedValue(0);
  const { colorScheme } = useColorScheme();

  // 错误动画效果增强
  useEffect(() => {
    if (isError) {
      errorAnimation.value = withSequence(
        withTiming(1, { duration: 300, easing: Easing.bounce }),
        withTiming(0.5, { duration: 100 }),
        withTiming(0.8, { duration: 200 })
      );
    } else {
      errorAnimation.value = withTiming(0);
    }
  }, [isError]);

  // 展开/折叠处理
  const toggleCollapse = useCallback(() => {
    if (collapsible) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      if (isError) {
        errorAnimation.value = withSequence(
          withSpring(1, { damping: 8 }),
          withSpring(0, { damping: 15 })
        );

        if (onErrorClick) {
          onErrorClick();
        } else {
          toast.error("存在配置错误，请检查设置", {
            duration: 2000,
            icon: "⚠️",
            action: {
              label: "查看",
              onClick: () => {
                // 错误详情处理逻辑
                Haptics.notificationAsync(
                  Haptics.NotificationFeedbackType.Warning
                );
              },
            },
          });
        }
      }

      const newCollapsedState = !isCollapsed;
      setIsCollapsed(newCollapsedState);
      animation.value = withSpring(
        newCollapsedState ? 0 : 1,
        {
          mass: 0.5,
          damping: 12,
          stiffness: 100,
        },
        () => {
          if (onToggle) {
            runOnJS(onToggle)(newCollapsedState);
          }
        }
      );
    }
  }, [collapsible, isError, isCollapsed, onErrorClick, onToggle]);

  // 容器动画样式
  const containerStyle = useAnimatedStyle(() => {
    const scale = interpolate(pressed.value, [0, 1], [1, 0.98]);
    const shake = interpolate(
      errorAnimation.value,
      [0, 0.25, 0.5, 0.75, 1],
      [0, -5, 5, -5, 0]
    );

    return {
      transform: [{ scale }, { translateX: shake }],
    };
  });

  // 内容动画样式
  const contentStyle = useAnimatedStyle(() => ({
    height: withSpring(isCollapsed ? 0 : "auto", {
      mass: 0.5,
      damping: 12,
    }),
    opacity: withTiming(isCollapsed ? 0 : 1, {
      duration: animationDuration,
    }),
    transform: [
      {
        scale: withSpring(isCollapsed ? 0.95 : 1, {
          mass: 0.5,
          damping: 12,
        }),
      },
    ],
  }));

  // 图标旋转动画
  const iconStyle = useAnimatedStyle(() => ({
    transform: [
      {
        rotate: `${interpolate(animation.value, [0, 1], [0, 180])}deg`,
      },
    ],
  }));

  // 适应主题色彩
  const cardBgClass = colorScheme === "dark" ? "bg-card/60" : "bg-card/90";

  const errorBorderClass = isError
    ? "border border-destructive/40"
    : "border border-border/30";

  return (
    <Animated.View
      entering={FadeIn.duration(300).springify()}
      exiting={FadeOut.duration(200)}
      layout={Layout.springify()}
      className={`
        rounded-xl
        overflow-hidden
        backdrop-blur-lg
        ${className}
        ${isError ? errorBorderClass : cardBgClass}
      `}
    >
      <AnimatedPressable
        onPressIn={() => {
          pressed.value = withSpring(1);
        }}
        onPressOut={() => {
          pressed.value = withSpring(0);
        }}
        onPress={toggleCollapse}
        style={containerStyle}
        className={`
          p-4
          ${collapsible ? "active:opacity-80" : ""}
        `}
        accessibilityRole="button"
        accessibilityState={{ expanded: !isCollapsed }}
        accessibilityHint={`点击${isCollapsed ? "展开" : "折叠"}设置区域`}
      >
        <View className="flex-row justify-between items-start">
          <View className="flex-1 space-y-1">
            <View className="flex-row items-center space-x-2">
              <Icon
                size={20}
                className={isError ? "text-destructive" : "text-primary"}
              />
              <Label className="text-lg font-semibold">{title}</Label>
              {isError && (
                <AlertTriangle size={16} className="text-destructive" />
              )}
            </View>
            {description && (
              <Label className="text-sm text-muted-foreground ml-7">
                {description}
              </Label>
            )}
          </View>
          {collapsible && (
            <Animated.View style={iconStyle}>
              <ChevronDown size={20} className="text-muted-foreground" />
            </Animated.View>
          )}
        </View>
      </AnimatedPressable>

      <Animated.View
        style={[
          contentStyle,
          {
            overflow: "hidden",
          },
        ]}
        className="pl-7 pr-4 pb-4"
      >
        {children}
      </Animated.View>
    </Animated.View>
  );
};

export default React.memo(SettingsSection);
