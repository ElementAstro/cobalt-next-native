import React, { useCallback, useState, useEffect, useRef } from "react";
import { View, Pressable, AccessibilityInfo } from "react-native";
import { Button } from "~/components/ui/button";
import {
  Scan,
  Loader2,
  StopCircle,
  AlertTriangle,
  AlertCircle,
  PauseCircle,
  PlayCircle,
  RotateCw,
  Settings,
  Radar,
  Wifi,
} from "lucide-react-native";
import Animated, {
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  useSharedValue,
  Easing,
  interpolate,
  withDelay,
  FadeIn,
  FadeOut,
  SlideInUp,
  Layout,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Text } from "~/components/ui/text";
import { Badge } from "~/components/ui/badge";
import { useColorScheme } from "nativewind";
import { toast } from "sonner-native";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "~/components/ui/tooltip";

export type ScanStatus = "idle" | "scanning" | "paused" | "error" | "completed";

interface ScanButtonProps {
  onScan: () => Promise<void>;
  onStop?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onSettings?: () => void;
  status?: ScanStatus;
  progress?: number;
  error?: string | null;
  className?: string;
  showProgress?: boolean;
  showSettings?: boolean;
  loading?: boolean;
  disabled?: boolean;
  label?: string;
  compactMode?: boolean;
  itemsScanned?: number;
  totalItems?: number;
  estimatedTimeRemaining?: number;
  networkName?: string;
}

const AnimatedButton = Animated.createAnimatedComponent(Button);
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const ScanButton: React.FC<ScanButtonProps> = ({
  onScan,
  onStop,
  onPause,
  onResume,
  onSettings,
  status = "idle",
  progress = 0,
  error = null,
  className = "",
  showProgress = true,
  showSettings = true,
  loading = false,
  disabled = false,
  label = "开始扫描",
  compactMode = false,
  itemsScanned = 0,
  totalItems = 0,
  estimatedTimeRemaining = 0,
  networkName,
}) => {
  const [confirmStop, setConfirmStop] = useState(false);
  const [confirmPause, setConfirmPause] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [screenReaderEnabled, setScreenReaderEnabled] = useState(false);
  const [hadError, setHadError] = useState(false);
  const [showRipple, setShowRipple] = useState(false);

  const buttonScale = useSharedValue(1);
  const rotation = useSharedValue(0);
  const pulseAnim = useSharedValue(1);
  const errorShake = useSharedValue(0);
  const progressOpacity = useSharedValue(1);
  const rippleScale = useSharedValue(0);
  const pulseOpacity = useSharedValue(0);
  const bgHueRotation = useSharedValue(0);
  const progressGlow = useSharedValue(0);

  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const confirmTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 检查屏幕阅读器状态
  useEffect(() => {
    AccessibilityInfo.isScreenReaderEnabled().then(setScreenReaderEnabled);
    const subscription = AccessibilityInfo.addEventListener(
      "screenReaderChanged",
      setScreenReaderEnabled
    );
    return () => subscription.remove();
  }, []);

  // 状态变化处理
  useEffect(() => {
    // 处理按钮动画效果
    switch (status) {
      case "scanning":
        // 扫描中动画效果
        pulseAnim.value = withRepeat(
          withSequence(
            withTiming(1.1, { duration: 800, easing: Easing.out(Easing.sin) }),
            withTiming(1.0, { duration: 800, easing: Easing.in(Easing.sin) })
          ),
          -1, // 无限循环
          true // 反向
        );

        rotation.value = withRepeat(
          withTiming(360, { duration: 3000, easing: Easing.linear }),
          -1, // 无限循环
          false // 不反向
        );

        bgHueRotation.value = withRepeat(
          withTiming(1, {
            duration: 3000,
            easing: Easing.inOut(Easing.cubic),
          }),
          -1,
          true
        );

        progressGlow.value = withRepeat(
          withSequence(
            withTiming(1, { duration: 1500 }),
            withTiming(0, { duration: 1500 })
          ),
          -1,
          true
        );

        // 显示波纹动画
        setShowRipple(true);
        pulseOpacity.value = withTiming(1, { duration: 500 });

        if (progress > 0 && progress < 100) {
          progressOpacity.value = withTiming(1, { duration: 300 });
        } else {
          progressOpacity.value = withTiming(0, { duration: 300 });
        }
        break;

      case "paused":
        // 暂停中动画效果
        pulseAnim.value = withRepeat(
          withSequence(
            withTiming(1.05, {
              duration: 1200,
              easing: Easing.out(Easing.sin),
            }),
            withTiming(1.0, { duration: 1200, easing: Easing.in(Easing.sin) })
          ),
          -1,
          true
        );

        rotation.value = withTiming(rotation.value, { duration: 300 }); // 停止旋转

        bgHueRotation.value = withTiming(0.3, {
          duration: 500,
          easing: Easing.out(Easing.quad),
        });

        progressGlow.value = withTiming(0.3, { duration: 500 });
        pulseOpacity.value = withTiming(0.5, { duration: 500 });

        if (progress > 0 && progress < 100) {
          progressOpacity.value = withTiming(1, { duration: 300 });
        } else {
          progressOpacity.value = withTiming(0, { duration: 300 });
        }
        break;

      case "error":
        // 错误状态动画效果
        pulseAnim.value = withTiming(1, { duration: 300 });
        buttonScale.value = withSequence(
          withTiming(0.95, { duration: 100 }),
          withTiming(1.05, { duration: 100 }),
          withTiming(1, { duration: 200 })
        );

        errorShake.value = withSequence(
          withTiming(-8, { duration: 100 }),
          withTiming(8, { duration: 100 }),
          withTiming(-5, { duration: 100 }),
          withTiming(5, { duration: 100 }),
          withTiming(0, { duration: 100 })
        );

        rotation.value = withTiming(0, { duration: 300 });
        bgHueRotation.value = withTiming(0.7, { duration: 300 });
        progressGlow.value = withTiming(0, { duration: 300 });
        pulseOpacity.value = withTiming(0, { duration: 300 });
        setShowRipple(false);

        // 记录错误状态
        setHadError(true);
        progressOpacity.value = withTiming(0, { duration: 300 });

        // 触发错误震动反馈
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        break;

      case "completed":
        // 完成状态动画效果
        pulseAnim.value = withSequence(
          withTiming(1.2, { duration: 300 }),
          withTiming(1, { duration: 500 })
        );

        rotation.value = withTiming(0, { duration: 300 });
        bgHueRotation.value = withTiming(0.2, { duration: 300 });
        progressGlow.value = withTiming(0, { duration: 300 });
        pulseOpacity.value = withTiming(0, { duration: 300 });
        setShowRipple(false);

        // 显示进度直到结束
        progressOpacity.value = withSequence(
          withTiming(1, { duration: 300 }),
          withDelay(1500, withTiming(0, { duration: 500 }))
        );

        // 触发完成震动反馈
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;

      case "idle":
      default:
        // 重置所有动画
        pulseAnim.value = withTiming(1, { duration: 300 });
        rotation.value = withTiming(0, { duration: 300 });
        bgHueRotation.value = withTiming(0, { duration: 300 });
        progressGlow.value = withTiming(0, { duration: 300 });
        pulseOpacity.value = withTiming(0, { duration: 300 });
        progressOpacity.value = withTiming(0, { duration: 300 });
        setShowRipple(false);

        // 重置确认状态
        if (status !== "idle") {
          setConfirmStop(false);
          setConfirmPause(false);
        }
        break;
    }
  }, [
    status,
    pulseAnim,
    rotation,
    buttonScale,
    errorShake,
    progressOpacity,
    rippleScale,
    pulseOpacity,
    bgHueRotation,
    progressGlow,
    progress,
  ]);

  // 错误变化处理
  useEffect(() => {
    if (error && status === "error") {
      errorShake.value = withSequence(
        withTiming(-5, { duration: 100 }),
        withTiming(5, { duration: 100 }),
        withTiming(-3, { duration: 100 }),
        withTiming(3, { duration: 100 }),
        withTiming(0, { duration: 100 })
      );

      toast.error("扫描错误", {
        description: error,
        duration: 4000,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [error, status, errorShake]);

  // 处理按下效果
  const handlePressIn = useCallback(() => {
    buttonScale.value = withTiming(0.95, { duration: 100 });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [buttonScale]);

  // 处理松开效果
  const handlePressOut = useCallback(() => {
    buttonScale.value = withTiming(1, { duration: 200 });
  }, [buttonScale]);

  // 开始扫描
  const handleScan = useCallback(async () => {
    // 已经在扫描状态，不重复处理
    if (status === "scanning" || isProcessing) return;

    // 暂停状态下恢复扫描
    if (status === "paused") {
      if (onResume) {
        onResume();
        toast.info("已恢复扫描", { duration: 2000 });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      return;
    }

    // 扫描完成或错误状态下重新开始扫描
    if (status === "completed" || status === "error") {
      buttonScale.value = withSequence(
        withTiming(0.9, { duration: 100 }),
        withTiming(1.1, { duration: 200 }),
        withTiming(1, { duration: 200 })
      );

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      if (hadError) {
        toast.info("正在重新扫描", { duration: 2000 });
        setHadError(false);
      }
    }

    // 播放按钮动画
    buttonScale.value = withSequence(
      withTiming(0.9, { duration: 100 }),
      withTiming(1.1, { duration: 200 }),
      withTiming(1, { duration: 200 })
    );

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      setIsProcessing(true);

      // 创建波纹效果
      rippleScale.value = 0;
      pulseOpacity.value = 0;

      // 延迟显示波纹
      await onScan();

      // 扫描开始时的波纹动画
      rippleScale.value = withRepeat(
        withSequence(
          withTiming(0, { duration: 0 }),
          withTiming(2.5, { duration: 2000, easing: Easing.out(Easing.cubic) })
        ),
        -1,
        false
      );
    } catch (err) {
      console.error("扫描错误:", err);

      // 显示错误状态动画
      if (status !== "error") {
        buttonScale.value = withSequence(
          withTiming(0.95, { duration: 100 }),
          withTiming(1.05, { duration: 100 }),
          withTiming(1, { duration: 200 })
        );

        errorShake.value = withSequence(
          withTiming(-5, { duration: 50 }),
          withTiming(5, { duration: 50 }),
          withTiming(0, { duration: 50 })
        );

        toast.error("启动扫描失败", {
          description: err instanceof Error ? err.message : "未知错误",
          duration: 3000,
        });

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } finally {
      setIsProcessing(false);
    }
  }, [
    status,
    isProcessing,
    onScan,
    onResume,
    buttonScale,
    errorShake,
    rippleScale,
    pulseOpacity,
    hadError,
  ]);

  // 停止扫描
  const handleStop = useCallback(() => {
    if (status !== "scanning" && status !== "paused") return;

    // 询问用户确认停止
    if (!confirmStop) {
      setConfirmStop(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // 设置确认超时
      if (confirmTimerRef.current) {
        clearTimeout(confirmTimerRef.current);
      }

      confirmTimerRef.current = setTimeout(() => {
        setConfirmStop(false);
      }, 3000);

      return;
    }

    // 用户确认停止
    if (onStop) {
      onStop();
      toast.info("已停止扫描", { duration: 2000 });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    setConfirmStop(false);

    if (confirmTimerRef.current) {
      clearTimeout(confirmTimerRef.current);
    }
  }, [status, confirmStop, onStop]);

  // 暂停扫描
  const handlePause = useCallback(() => {
    if (status !== "scanning") return;

    // 询问用户确认暂停
    if (!confirmPause) {
      setConfirmPause(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // 设置确认超时
      if (confirmTimerRef.current) {
        clearTimeout(confirmTimerRef.current);
      }

      confirmTimerRef.current = setTimeout(() => {
        setConfirmPause(false);
      }, 3000);

      return;
    }

    // 用户确认暂停
    if (onPause) {
      onPause();
      toast.info("已暂停扫描", { duration: 2000 });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    setConfirmPause(false);

    if (confirmTimerRef.current) {
      clearTimeout(confirmTimerRef.current);
    }
  }, [status, confirmPause, onPause]);

  // 重置状态
  const handleReset = useCallback(() => {
    setConfirmStop(false);
    setConfirmPause(false);

    if (confirmTimerRef.current) {
      clearTimeout(confirmTimerRef.current);
    }
  }, []);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (confirmTimerRef.current) {
        clearTimeout(confirmTimerRef.current);
      }
    };
  }, []);

  // 动画样式
  const buttonAnimStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: buttonScale.value },
        { translateX: errorShake.value },
      ],
    };
  });

  const iconRotationStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotation.value}deg` }],
    };
  });

  const pulseAnimStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: pulseAnim.value }],
      opacity: pulseOpacity.value,
    };
  });

  const progressAnimStyle = useAnimatedStyle(() => {
    return {
      opacity: progressOpacity.value,
    };
  });

  const rippleAnimStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: rippleScale.value }],
      opacity: interpolate(rippleScale.value, [0, 1, 2.5], [0.4, 0.2, 0]),
    };
  });

  const buttonBgStyle = useAnimatedStyle(() => {
    const baseColorLight = "rgba(0, 122, 255, 0.12)"; // 浅色模式下的基础颜色
    const baseColorDark = "rgba(10, 132, 255, 0.25)"; // 深色模式下的基础颜色

    const activeColorLight = "rgba(0, 122, 255, 0.25)"; // 活跃状态浅色
    const activeColorDark = "rgba(10, 132, 255, 0.4)"; // 活跃状态深色

    const errorColorLight = "rgba(255, 59, 48, 0.2)"; // 错误状态浅色
    const errorColorDark = "rgba(255, 69, 58, 0.3)"; // 错误状态深色

    const completedColorLight = "rgba(52, 199, 89, 0.2)"; // 完成状态浅色
    const completedColorDark = "rgba(48, 209, 88, 0.3)"; // 完成状态深色

    const pausedColorLight = "rgba(255, 204, 0, 0.2)"; // 暂停状态浅色
    const pausedColorDark = "rgba(255, 214, 10, 0.3)"; // 暂停状态深色

    let backgroundColor;

    if (status === "scanning") {
      backgroundColor = isDark ? activeColorDark : activeColorLight;
    } else if (status === "error") {
      backgroundColor = isDark ? errorColorDark : errorColorLight;
    } else if (status === "completed") {
      backgroundColor = isDark ? completedColorDark : completedColorLight;
    } else if (status === "paused") {
      backgroundColor = isDark ? pausedColorDark : pausedColorLight;
    } else {
      backgroundColor = isDark ? baseColorDark : baseColorLight;
    }

    return {
      backgroundColor: backgroundColor,
    };
  });

  const progressColor = useAnimatedStyle(() => {
    const baseColor = "hsl(var(--primary))";
    const pausedColor = "hsl(var(--warning))";
    const errorColor = "hsl(var(--destructive))";
    const successColor = "hsl(var(--success))";

    let color;
    if (status === "scanning") {
      color = baseColor;
    } else if (status === "paused") {
      color = pausedColor;
    } else if (status === "error") {
      color = errorColor;
    } else if (status === "completed") {
      color = successColor;
    } else {
      color = baseColor;
    }

    return {
      backgroundColor: color,
      shadowColor: color,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: interpolate(progressGlow.value, [0, 1], [0.3, 0.7]),
      shadowRadius: interpolate(progressGlow.value, [0, 1], [1, 3]),
      elevation: interpolate(progressGlow.value, [0, 1], [2, 4]),
    };
  });

  // 格式化剩余时间
  const formatRemainingTime = useCallback((seconds: number) => {
    if (seconds <= 0) return "未知";

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    if (minutes > 0) {
      return `${minutes}分${remainingSeconds}秒`;
    } else {
      return `${remainingSeconds}秒`;
    }
  }, []);

  // 根据状态获取按钮文本
  const getButtonText = useCallback(() => {
    switch (status) {
      case "scanning":
        return confirmStop
          ? "确认停止?"
          : confirmPause
          ? "确认暂停?"
          : "扫描中...";
      case "paused":
        return confirmStop ? "确认停止?" : "继续扫描";
      case "error":
        return "重新扫描";
      case "completed":
        return "再次扫描";
      case "idle":
      default:
        return loading ? "准备中..." : label;
    }
  }, [status, confirmStop, confirmPause, loading, label]);

  // 根据状态获取按钮图标
  const getButtonIcon = useCallback(() => {
    if (loading) {
      return <Loader2 size={20} className="mr-2 animate-spin" />;
    }

    switch (status) {
      case "scanning":
        if (confirmStop) {
          return <StopCircle size={20} className="mr-2 text-destructive" />;
        } else if (confirmPause) {
          return <PauseCircle size={20} className="mr-2 text-warning" />;
        } else {
          return (
            <Animated.View style={iconRotationStyle}>
              <Radar size={20} className="mr-2 text-primary" />
            </Animated.View>
          );
        }
      case "paused":
        if (confirmStop) {
          return <StopCircle size={20} className="mr-2 text-destructive" />;
        } else {
          return <PlayCircle size={20} className="mr-2 text-primary" />;
        }
      case "error":
        return <RotateCw size={20} className="mr-2 text-primary" />;
      case "completed":
        return <Scan size={20} className="mr-2 text-primary" />;
      case "idle":
      default:
        return <Scan size={20} className="mr-2 text-primary" />;
    }
  }, [status, loading, confirmStop, confirmPause, iconRotationStyle]);

  // 获取按钮变体
  const getButtonVariant = useCallback(() => {
    switch (status) {
      case "scanning":
        return confirmStop || confirmPause ? "destructive" : "default";
      case "paused":
        return confirmStop ? "destructive" : "default";
      case "error":
        return "default";
      case "completed":
        return "default";
      case "idle":
      default:
        return "default";
    }
  }, [status, confirmStop, confirmPause]);

  // 紧凑模式渲染
  if (compactMode) {
    return (
      <View className={`relative ${className}`}>
        {/* 波纹背景动画 */}
        {showRipple && (
          <Animated.View
            style={[
              {
                position: "absolute",
                width: 45,
                height: 45,
                borderRadius: 25,
                backgroundColor: isDark
                  ? "rgba(10, 132, 255, 0.2)"
                  : "rgba(0, 122, 255, 0.1)",
                top: 0,
                left: 0,
                zIndex: -1,
              },
              rippleAnimStyle,
            ]}
          />
        )}

        {/* 脉冲动画效果 */}
        <Animated.View
          style={[
            {
              position: "absolute",
              width: 45,
              height: 45,
              borderRadius: 25,
              backgroundColor: "transparent",
              borderWidth: 2,
              borderColor: isDark
                ? "rgba(10, 132, 255, 0.3)"
                : "rgba(0, 122, 255, 0.2)",
              top: 0,
              left: 0,
              zIndex: -1,
            },
            pulseAnimStyle,
          ]}
        />

        {/* 主按钮 */}
        <AnimatedPressable
          style={[
            {
              width: 45,
              height: 45,
              borderRadius: 25,
              justifyContent: "center",
              alignItems: "center",
            },
            buttonAnimStyle,
            buttonBgStyle,
          ]}
          onPress={status === "scanning" ? handlePause : handleScan}
          onLongPress={
            status === "scanning" || status === "paused"
              ? handleStop
              : undefined
          }
          delayLongPress={500}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={disabled || loading}
          accessibilityLabel={getButtonText()}
          accessibilityHint={
            status === "scanning"
              ? "长按停止扫描，轻按暂停"
              : status === "paused"
              ? "轻按继续扫描，长按停止"
              : "开始扫描"
          }
          accessibilityRole="button"
          accessibilityState={{ disabled, busy: status === "scanning" }}
        >
          {status === "scanning" ? (
            <Animated.View style={iconRotationStyle}>
              <Radar
                size={24}
                className={
                  confirmStop || confirmPause
                    ? "text-destructive"
                    : "text-primary"
                }
              />
            </Animated.View>
          ) : status === "paused" ? (
            <PlayCircle
              size={24}
              className={confirmStop ? "text-destructive" : "text-primary"}
            />
          ) : status === "error" ? (
            <AlertCircle size={24} className="text-destructive" />
          ) : status === "completed" ? (
            <Scan size={24} className="text-primary" />
          ) : loading ? (
            <Loader2 size={24} className="text-primary animate-spin" />
          ) : (
            <Scan size={24} className="text-primary" />
          )}
        </AnimatedPressable>

        {/* 进度条 */}
        {showProgress && status !== "idle" && (
          <Animated.View
            style={[
              {
                position: "absolute",
                bottom: -8,
                left: 0,
                right: 0,
                justifyContent: "center",
                alignItems: "center",
              },
              progressAnimStyle,
            ]}
            entering={FadeIn.duration(300)}
            exiting={FadeOut.duration(200)}
          >
            <View className="w-12 h-1.5 rounded-full overflow-hidden bg-muted/50">
              <Animated.View
                style={[
                  {
                    height: "100%",
                    width: `${progress}%`,
                  },
                  progressColor,
                ]}
              />
            </View>
          </Animated.View>
        )}
      </View>
    );
  }

  // 完整模式渲染
  return (
    <Animated.View
      className={`rounded-xl ${className}`}
      entering={FadeIn.duration(300)}
      exiting={FadeOut.duration(200)}
      layout={Layout.springify()}
    >
      <View className="relative">
        {/* 波纹背景动画 */}
        {showRipple && (
          <Animated.View
            style={[
              {
                position: "absolute",
                width: "100%",
                height: "100%",
                borderRadius: 12,
                backgroundColor: isDark
                  ? "rgba(10, 132, 255, 0.2)"
                  : "rgba(0, 122, 255, 0.1)",
                top: 0,
                left: 0,
                zIndex: -1,
              },
              rippleAnimStyle,
            ]}
          />
        )}

        {/* 脉冲动画效果 */}
        <Animated.View
          style={[
            {
              position: "absolute",
              width: "100%",
              height: "100%",
              borderRadius: 12,
              backgroundColor: "transparent",
              borderWidth: 2,
              borderColor: isDark
                ? "rgba(10, 132, 255, 0.3)"
                : "rgba(0, 122, 255, 0.2)",
              top: 0,
              left: 0,
              zIndex: -1,
            },
            pulseAnimStyle,
          ]}
        />

        {/* 主按钮 */}
        <AnimatedButton
          style={[buttonAnimStyle, buttonBgStyle]}
          onPress={status === "scanning" ? handlePause : handleScan}
          onLongPress={
            status === "scanning" || status === "paused"
              ? handleStop
              : undefined
          }
          delayLongPress={500}
          variant={getButtonVariant()}
          size="lg"
          className="overflow-hidden"
          disabled={disabled || loading}
          accessibilityLabel={getButtonText()}
          accessibilityHint={
            status === "scanning"
              ? "长按停止扫描，轻按暂停"
              : status === "paused"
              ? "轻按继续扫描，长按停止"
              : "开始扫描"
          }
          accessibilityRole="button"
          accessibilityState={{ disabled, busy: status === "scanning" }}
        >
          {getButtonIcon()}
          <Text className="font-medium">{getButtonText()}</Text>

          {/* 状态标志 */}
          {(status === "scanning" || status === "paused") &&
            !confirmStop &&
            !confirmPause && (
              <>
                {status === "scanning" ? (
                  <Badge
                    variant="secondary"
                    className="ml-2 bg-primary/20 dark:bg-primary/30"
                  >
                    <Text className="text-[10px] font-medium">扫描中</Text>
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="ml-2 bg-warning/10 border-warning/30"
                  >
                    <Text className="text-[10px] font-medium text-warning">
                      已暂停
                    </Text>
                  </Badge>
                )}
              </>
            )}
        </AnimatedButton>

        {/* 设置按钮 */}
        {showSettings && status === "idle" && onSettings && (
          <Tooltip>
            <TooltipTrigger>
              <AnimatedButton
                variant="outline"
                size="icon"
                className="absolute right-1 top-1 h-9 w-9 rounded-full"
                onPress={onSettings}
                accessibilityLabel="扫描设置"
                accessibilityHint="打开扫描设置"
              >
                <Settings size={16} className="text-muted-foreground" />
              </AnimatedButton>
            </TooltipTrigger>
            <TooltipContent>
              <Text>扫描设置</Text>
            </TooltipContent>
          </Tooltip>
        )}

        {/* 进度信息 */}
        {showProgress && (
          <Animated.View
            style={progressAnimStyle}
            className="mt-3 space-y-1"
            entering={SlideInUp.duration(300)}
          >
            {/* 进度条 */}
            <View className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted/50">
              <Animated.View
                style={[
                  {
                    position: "absolute",
                    height: "100%",
                    width: `${progress}%`,
                    borderRadius: 8,
                  },
                  progressColor,
                ]}
              />
            </View>

            {/* 进度文本信息 */}
            <View className="flex-row justify-between items-center px-1">
              {/* 网络名称 */}
              {networkName && (
                <View className="flex-row items-center">
                  <Wifi size={12} className="text-muted-foreground mr-1" />
                  <Text className="text-xs text-muted-foreground">
                    {networkName}
                  </Text>
                </View>
              )}

              {/* 进度状态 */}
              {totalItems > 0 && (
                <Text className="text-xs text-muted-foreground text-center">
                  {status === "completed"
                    ? `已完成 ${totalItems} 项`
                    : `${itemsScanned} / ${totalItems} (${Math.round(
                        progress
                      )}%)`}
                </Text>
              )}

              {/* 剩余时间 */}
              {status === "scanning" && estimatedTimeRemaining > 0 && (
                <View className="flex-row items-center">
                  <Text className="text-xs text-muted-foreground text-right">
                    剩余 {formatRemainingTime(estimatedTimeRemaining)}
                  </Text>
                </View>
              )}
            </View>

            {/* 错误提示 */}
            {error && status === "error" && (
              <View className="mt-1 flex-row items-center bg-destructive/10 px-2 py-1 rounded-md">
                <AlertTriangle size={14} className="text-destructive mr-1" />
                <Text className="text-xs text-destructive">{error}</Text>
              </View>
            )}
          </Animated.View>
        )}
      </View>
    </Animated.View>
  );
};

export default React.memo(ScanButton);
