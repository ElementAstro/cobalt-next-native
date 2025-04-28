import React, {
  useCallback,
  useEffect,
  useState,
  useMemo,
  useRef,
} from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  Keyboard,
  Platform,
  AccessibilityInfo,
} from "react-native";
import { CopilotStep } from "react-native-copilot";
import Animated, {
  useAnimatedStyle,
  withTiming,
  withSpring,
  FadeIn,
  SlideInUp,
  ZoomIn,
  useSharedValue,
  withSequence,
  withRepeat,
  Easing,
  withDelay,
  FadeOut,
  FadeInDown,
  cancelAnimation,
  LinearTransition,
  BounceIn,
  FlipInYRight,
  interpolateColor,
  interpolate,
  Extrapolate,
  runOnJS,
} from "react-native-reanimated";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Card, CardHeader, CardTitle, CardContent } from "~/components/ui/card";
import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";
import { Skeleton } from "~/components/ui/skeleton";
import { Button } from "~/components/ui/button";
import * as Haptics from "expo-haptics";
import { Badge } from "~/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "~/components/ui/alert";
import {
  AlertCircle,
  Signal,
  Wifi,
  WifiOff,
  Info,
  Server,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Copy,
  Link2,
} from "lucide-react-native";
import { z } from "zod";
import { toast } from "sonner-native";

// 创建 Animated 组件
const AnimatedCard = Animated.createAnimatedComponent(Card);
const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);
const AnimatedBadge = Animated.createAnimatedComponent(Badge);

// IP和端口号验证模式
const ipSchema = z
  .string()
  .regex(/^(\d{1,3}\.){3}\d{1,3}$/)
  .refine(
    (ip) => {
      const parts = ip.split(".");
      return parts.every(
        (part) => parseInt(part) >= 0 && parseInt(part) <= 255
      );
    },
    { message: "无效的IP地址格式" }
  );

const portSchema = z
  .string()
  .regex(/^\d{1,5}$/)
  .refine(
    (port) => {
      const num = parseInt(port);
      return num >= 0 && num <= 65535;
    },
    { message: "端口号必须在0-65535之间" }
  );

interface StatusCardProps {
  isConnected: boolean;
  activeMode: "hotspot" | "lan";
  ipAddress: string;
  port: string;
  handleIpChange: (value: string) => void;
  handlePortChange: (value: string) => void;
  onPress: () => void;
  isLoading?: boolean;
}

export const StatusCard: React.FC<StatusCardProps> = React.memo(
  ({
    isConnected,
    activeMode,
    ipAddress,
    port,
    handleIpChange,
    handlePortChange,
    onPress,
    isLoading = false,
  }) => {
    // 状态管理
    const [isFocused, setIsFocused] = useState<"ip" | "port" | null>(null);
    const [ipError, setIpError] = useState<string | null>(null);
    const [portError, setPortError] = useState<string | null>(null);
    const [isScreenReaderEnabled, setIsScreenReaderEnabled] = useState(false);
    const [wasConnected, setWasConnected] = useState(isConnected);

    // refs
    const ipInputRef = useRef<any>(null);
    const portInputRef = useRef<any>(null);

    // 追踪连接状态变化
    const connectionChanged = wasConnected !== isConnected;

    // 共享动画值
    const cardScale = useSharedValue(1);
    const statusIconScale = useSharedValue(1);
    const inputContainerOpacity = useSharedValue(0);
    const contentOpacity = useSharedValue(0);
    const pulsateAnimation = useSharedValue(0);
    const connectionSuccess = useSharedValue(0);
    const ipValidAnimation = useSharedValue(0);
    const portValidAnimation = useSharedValue(0);
    const loadingProgress = useSharedValue(0);
    const shimmerPosition = useSharedValue(-1);

    // 高级弹簧配置
    const springConfig = useMemo(
      () => ({
        damping: 10,
        stiffness: 120,
        mass: 0.8,
        overshootClamping: false,
      }),
      []
    );

    const bounceConfig = useMemo(
      () => ({
        damping: 6,
        stiffness: 200,
        mass: 0.6,
        overshootClamping: false,
      }),
      []
    );

    // 响应式布局优化
    const { isSmallScreen, screenConfig } = useMemo(() => {
      const { width } = Dimensions.get("window");
      const isSmall = width < 350;
      return {
        isSmallScreen: isSmall,
        screenConfig: {
          padding: isSmall ? "px-3 py-4" : "p-4",
          titleSize: isSmall ? "text-lg" : "text-xl",
          iconSize: isSmall ? 22 : 24,
        },
      };
    }, []);

    // 复制连接信息到剪贴板
    const copyConnectionInfo = useCallback(() => {
      if (!ipAddress || !port) return;

      const connectionString = `${ipAddress}:${port}`;

      // 这里会有实际复制到剪贴板的代码
      // 示例: Clipboard.setString(connectionString);

      // 触觉反馈与动画
      if (Platform.OS !== "web" && !isScreenReaderEnabled) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      // 复制成功动画
      cardScale.value = withSequence(
        withTiming(0.98, { duration: 100 }),
        withTiming(1.02, { duration: 100 }),
        withTiming(1, { duration: 200 })
      );

      toast.success("已复制", {
        description: `连接信息：${connectionString}`,
        duration: 2000,
      });
    }, [ipAddress, port, isScreenReaderEnabled]);

    // 处理动画与反馈
    const handlePressIn = useCallback(() => {
      cardScale.value = withSpring(0.98, springConfig);

      if (Platform.OS !== "web" && !isScreenReaderEnabled) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }, [springConfig, isScreenReaderEnabled]);

    const handlePressOut = useCallback(() => {
      cardScale.value = withSpring(1, springConfig);
    }, [springConfig]);

    // 输入框焦点处理
    const handleInputFocus = useCallback(
      (field: "ip" | "port") => {
        setIsFocused(field);

        if (Platform.OS !== "web" && !isScreenReaderEnabled) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }

        // 聚焦动画
        if (field === "ip") {
          ipValidAnimation.value = withSequence(
            withTiming(0, { duration: 200 }),
            withTiming(1, { duration: 300 })
          );
        } else {
          portValidAnimation.value = withSequence(
            withTiming(0, { duration: 200 }),
            withTiming(1, { duration: 300 })
          );
        }
      },
      [isScreenReaderEnabled]
    );

    const handleInputBlur = useCallback(() => {
      setIsFocused(null);

      // 验证IP地址格式
      if (ipAddress) {
        try {
          ipSchema.parse(ipAddress);
          setIpError(null);
        } catch (error) {
          setIpError("无效的IP地址");
        }
      }

      // 验证端口号
      if (port) {
        try {
          portSchema.parse(port);
          setPortError(null);
        } catch (error) {
          setPortError("无效的端口号");
        }
      }
    }, [ipAddress, port]);

    // IP地址验证和格式化 - 增强版
    const handleIpChangeWithValidation = useCallback(
      (value: string) => {
        // 只允许数字和点
        const formattedValue = value.replace(/[^0-9.]/g, "");

        // 清除错误信息
        if (ipError) setIpError(null);

        // 验证IP地址格式
        const isValidFormat = /^(\d{1,3}\.){0,3}\d{1,3}$/.test(formattedValue);
        if (isValidFormat) {
          handleIpChange(formattedValue);

          // 验证完整IP地址格式
          if (/^(\d{1,3}\.){3}\d{1,3}$/.test(formattedValue)) {
            try {
              ipSchema.parse(formattedValue);
              // 有效时的动画
              ipValidAnimation.value = withSequence(
                withTiming(0.8, { duration: 100 }),
                withTiming(1.2, { duration: 150 }),
                withTiming(1, { duration: 200 })
              );
            } catch (error) {
              // 无效时不做额外动画
            }
          }
        }
      },
      [handleIpChange, ipError]
    );

    // 端口号验证和格式化 - 增强版
    const handlePortChangeWithValidation = useCallback(
      (value: string) => {
        // 只允许数字
        const formattedValue = value.replace(/[^0-9]/g, "");

        // 清除错误信息
        if (portError) setPortError(null);

        // 验证端口号范围
        if (!formattedValue || formattedValue.length <= 5) {
          handlePortChange(formattedValue);

          // 验证端口号
          if (formattedValue) {
            const port = parseInt(formattedValue, 10);
            if (port >= 0 && port <= 65535) {
              // 有效时的动画
              portValidAnimation.value = withSequence(
                withTiming(0.8, { duration: 100 }),
                withTiming(1.2, { duration: 150 }),
                withTiming(1, { duration: 200 })
              );
            }
          }
        }
      },
      [handlePortChange, portError]
    );

    // 焦点移到下一个输入框
    const moveToPortInput = useCallback(() => {
      if (portInputRef.current) {
        portInputRef.current.focus();
      }
    }, []);

    // 动画样式
    const cardAnimatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: cardScale.value }],
      shadowOpacity: interpolate(
        cardScale.value,
        [0.98, 1],
        [0.15, 0.1],
        Extrapolate.CLAMP
      ),
    }));

    const statusIconStyle = useAnimatedStyle(() => ({
      transform: [{ scale: statusIconScale.value }],
      opacity: interpolate(
        loadingProgress.value,
        [0, 0.5],
        [1, 0],
        Extrapolate.CLAMP
      ),
    }));

    const connectionSuccessStyle = useAnimatedStyle(() => ({
      transform: [
        {
          scale: interpolate(
            connectionSuccess.value,
            [0, 0.5, 1],
            [0, 1.2, 1],
            Extrapolate.CLAMP
          ),
        },
      ],
      opacity: connectionSuccess.value,
    }));

    const contentStyle = useAnimatedStyle(() => ({
      opacity: contentOpacity.value,
      transform: [
        {
          translateY: interpolate(
            contentOpacity.value,
            [0, 1],
            [10, 0],
            Extrapolate.CLAMP
          ),
        },
      ],
    }));

    const inputContainerStyle = useAnimatedStyle(() => ({
      opacity: inputContainerOpacity.value,
    }));

    // IP验证动画样式
    const ipValidStyle = useAnimatedStyle(() => {
      return {
        transform: [{ scale: ipValidAnimation.value }],
        opacity: interpolate(
          ipValidAnimation.value,
          [0.8, 1, 1.2],
          [0.7, 1, 1],
          Extrapolate.CLAMP
        ),
      };
    });

    // 端口验证动画样式
    const portValidStyle = useAnimatedStyle(() => {
      return {
        transform: [{ scale: portValidAnimation.value }],
        opacity: interpolate(
          portValidAnimation.value,
          [0.8, 1, 1.2],
          [0.7, 1, 1],
          Extrapolate.CLAMP
        ),
      };
    });

    // 闪烁加载动画
    const shimmerStyle = useAnimatedStyle(() => {
      return {
        transform: [
          {
            translateX: interpolate(
              shimmerPosition.value,
              [-1, 1],
              [-100, 300],
              Extrapolate.CLAMP
            ),
          },
        ],
      };
    });

    // 脉冲加载动画
    const pulsateStyle = useAnimatedStyle(() => {
      return {
        opacity: interpolate(
          pulsateAnimation.value,
          [0, 0.5, 1],
          [0.4, 1, 0.4],
          Extrapolate.CLAMP
        ),
      };
    });

    // 检查屏幕阅读器状态
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
        "screenReaderChanged",
        setIsScreenReaderEnabled
      );

      return () => {
        isMounted = false;
        subscription.remove();
      };
    }, []);

    // 生命周期效果
    useEffect(() => {
      // 入场动画
      contentOpacity.value = withDelay(
        300,
        withTiming(1, {
          duration: 500,
          easing: Easing.out(Easing.quad),
        })
      );

      inputContainerOpacity.value = withDelay(
        500,
        withTiming(1, {
          duration: 400,
          easing: Easing.inOut(Easing.quad),
        })
      );

      // 启动闪光加载动画
      shimmerPosition.value = withRepeat(
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        -1,
        false
      );

      // 清理动画
      return () => {
        cancelAnimation(contentOpacity);
        cancelAnimation(inputContainerOpacity);
        cancelAnimation(shimmerPosition);
        cancelAnimation(statusIconScale);
        cancelAnimation(cardScale);
        cancelAnimation(pulsateAnimation);
        cancelAnimation(connectionSuccess);
        cancelAnimation(ipValidAnimation);
        cancelAnimation(portValidAnimation);
      };
    }, []);

    // 连接状态变化动画
    useEffect(() => {
      // 保存上一个连接状态
      setWasConnected(isConnected);

      if (connectionChanged) {
        // 连接状态变化动画
        statusIconScale.value = withSequence(
          withTiming(0, { duration: 150 }),
          withTiming(1.3, { duration: 300, easing: Easing.bounce }),
          withTiming(1, { duration: 200 })
        );

        // 成功连接的脉冲效果
        if (isConnected) {
          connectionSuccess.value = withSequence(
            withTiming(0, { duration: 100 }),
            withDelay(
              300,
              withTiming(1, {
                duration: 600,
                easing: Easing.out(Easing.cubic),
              })
            )
          );

          // 触觉反馈
          if (Platform.OS !== "web" && !isScreenReaderEnabled) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        } else {
          // 连接断开动画
          connectionSuccess.value = withTiming(0, { duration: 300 });

          // 触觉反馈
          if (Platform.OS !== "web" && !isScreenReaderEnabled) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          }
        }
      }
    }, [isConnected, connectionChanged, isScreenReaderEnabled]);

    // 加载状态动画
    useEffect(() => {
      if (isLoading) {
        loadingProgress.value = withTiming(1, { duration: 300 });
        pulsateAnimation.value = withRepeat(
          withTiming(1, { duration: 1000 }),
          -1,
          true
        );
      } else {
        loadingProgress.value = withTiming(0, { duration: 300 });
        cancelAnimation(pulsateAnimation);
        pulsateAnimation.value = 0;
      }
    }, [isLoading]);

    // 渲染骨架屏加载状态
    if (isLoading) {
      return (
        <Animated.View
          style={[cardAnimatedStyle, pulsateStyle]}
          entering={FadeIn.duration(300).springify()}
          className="w-full"
        >
          <Card className="overflow-hidden border-2 border-border/30 rounded-2xl shadow-lg">
            <CardHeader className={screenConfig.padding}>
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center space-x-3">
                  <Skeleton className="w-10 h-10 rounded-xl" />
                  <View className="space-y-2">
                    <Skeleton className="w-24 h-6 rounded-md" />
                    <Skeleton className="w-16 h-4 rounded-full" />
                  </View>
                </View>
                <Skeleton className="w-20 h-6 rounded-full" />
              </View>
            </CardHeader>

            <CardContent className={`space-y-6 ${screenConfig.padding}`}>
              <View className="space-y-4">
                <View className="space-y-2">
                  <Skeleton className="w-32 h-5 rounded-md" />
                  <View className="flex-row items-center space-x-2">
                    <Skeleton className="flex-1 h-12 rounded-xl" />
                    <Skeleton className="w-5 h-5 rounded-md" />
                    <Skeleton className="w-24 h-12 rounded-xl" />
                  </View>
                </View>
              </View>
            </CardContent>
          </Card>

          {/* 闪光效果 */}
          <Animated.View
            style={shimmerStyle}
            className="absolute top-0 left-0 right-0 bottom-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
          />
        </Animated.View>
      );
    }

    return (
      <CopilotStep
        text="此处显示当前连接状态和IP地址"
        order={3}
        name="status"
        active={true}
      >
        <Animated.View
          style={cardAnimatedStyle}
          entering={FadeIn.delay(200).springify().duration(500)}
          layout={LinearTransition.springify()}
        >
          <AnimatedTouchable
            onPress={onPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            className="w-full active:opacity-95"
            accessible={true}
            accessibilityLabel={`连接状态：${
              isConnected ? "已连接" : "未连接"
            }，模式：${activeMode === "hotspot" ? "热点模式" : "局域网模式"}`}
            accessibilityRole="button"
            accessibilityHint="点击查看详细网络信息"
            accessibilityState={{ busy: isLoading }}
          >
            <AnimatedCard
              className={`
                relative overflow-hidden
                border-2 shadow-lg backdrop-blur-xl rounded-2xl
                bg-gradient-to-br from-card/95 to-card/90
                dark:from-gray-800/95 dark:to-gray-800/90
                border-border/30 hover:border-border/50
                transition-all duration-300
              `}
            >
              {/* 背景动画效果 - 仅在连接成功时显示 */}
              {isConnected && (
                <Animated.View
                  style={connectionSuccessStyle}
                  className="absolute inset-0 bg-emerald-500/5 dark:bg-emerald-500/10"
                />
              )}

              <CardHeader
                className={`space-y-4 ${isSmallScreen ? "px-4 py-3" : "p-5"}`}
              >
                <View className="flex-row items-center justify-between w-full">
                  <View className="flex-row items-center space-x-3">
                    <Animated.View
                      style={statusIconStyle}
                      layout={LinearTransition.springify()}
                    >
                      <View
                        className={`
                          relative p-2.5 rounded-xl
                          ${
                            isConnected
                              ? "bg-emerald-500/20 dark:bg-emerald-500/30"
                              : "bg-rose-500/20 dark:bg-rose-500/30"
                          }
                        `}
                      >
                        {isConnected ? (
                          <>
                            <Wifi
                              size={screenConfig.iconSize}
                              className="text-emerald-500"
                            />
                            <Animated.View
                              style={connectionSuccessStyle}
                              entering={ZoomIn.springify()}
                              className="absolute -top-1 -right-1"
                            >
                              <CheckCircle2
                                size={12}
                                className="text-emerald-500 fill-emerald-50"
                              />
                            </Animated.View>
                          </>
                        ) : (
                          <WifiOff
                            size={screenConfig.iconSize}
                            className="text-rose-500"
                          />
                        )}
                      </View>
                    </Animated.View>

                    <View className="space-y-1">
                      <CardTitle
                        className={`${
                          isSmallScreen ? "text-lg" : "text-xl"
                        } text-foreground`}
                      >
                        连接状态
                      </CardTitle>

                      <AnimatedBadge
                        variant={isConnected ? "default" : "secondary"}
                        entering={ZoomIn.springify().delay(300)}
                        layout={LinearTransition.springify()}
                        className={`
                          px-3 py-0.5 text-xs font-medium rounded-full
                          ${
                            isConnected ? "bg-emerald-500/90" : "bg-rose-500/90"
                          }
                          ${isConnected ? "text-emerald-50" : "text-rose-50"}
                        `}
                      >
                        <Text className="text-current">
                          {isConnected ? "已连接" : "未连接"}
                        </Text>
                      </AnimatedBadge>
                    </View>
                  </View>

                  <AnimatedBadge
                    variant="outline"
                    entering={ZoomIn.springify().delay(400)}
                    className="px-3 py-1 rounded-full border-primary/30"
                  >
                    <Signal size={12} className="mr-1 text-primary" />
                    <Text className="text-xs font-medium text-primary">
                      {activeMode === "hotspot" ? "热点模式" : "局域网模式"}
                    </Text>
                  </AnimatedBadge>
                </View>
              </CardHeader>

              <CardContent
                className={`space-y-6 ${
                  isSmallScreen ? "py-3 px-4" : "py-4 px-5"
                }`}
              >
                <Animated.View
                  style={contentStyle}
                  entering={SlideInUp.delay(300).springify()}
                  className="space-y-4"
                >
                  <View className="space-y-2">
                    <Label
                      className="text-base text-muted-foreground/90 flex-row items-center space-x-1"
                      htmlFor="ip-address"
                    >
                      <Server size={14} className="text-muted-foreground/90" />
                      <Text>IP地址配置</Text>

                      {/* 复制按钮 */}
                      {ipAddress && port && !ipError && !portError && (
                        <TouchableOpacity
                          onPress={copyConnectionInfo}
                          className="ml-2 p-1 rounded-md bg-primary/10"
                          accessibilityLabel="复制连接信息"
                          accessibilityHint="复制当前IP和端口到剪贴板"
                          accessibilityRole="button"
                        >
                          <Copy size={12} className="text-primary" />
                        </TouchableOpacity>
                      )}
                    </Label>

                    <Animated.View
                      style={inputContainerStyle}
                      className="flex-row items-center space-x-2"
                    >
                      <View className="flex-1 relative">
                        <Input
                          ref={ipInputRef}
                          id="ip-address"
                          placeholder="请输入IP地址"
                          value={ipAddress}
                          onChangeText={handleIpChangeWithValidation}
                          onFocus={() => handleInputFocus("ip")}
                          onBlur={handleInputBlur}
                          onSubmitEditing={moveToPortInput}
                          returnKeyType="next"
                          keyboardType="numeric"
                          className={`
                            flex-1 h-12 px-4 rounded-xl
                            bg-muted/50 dark:bg-muted/30
                            border-2 transition-colors duration-200
                            ${
                              isFocused === "ip"
                                ? "border-primary border-opacity-50 bg-muted/70"
                                : ipError
                                ? "border-destructive border-opacity-40"
                                : "border-border/50"
                            }
                            placeholder:text-muted-foreground/50
                          `}
                          accessibilityLabel="IP地址输入框"
                          accessibilityHint="输入服务器IP地址"
                        />

                        {!ipAddress ? (
                          <Animated.View
                            entering={FadeIn.delay(500).springify()}
                            className="absolute right-3 top-3.5"
                          >
                            <AlertCircle
                              size={18}
                              className="text-amber-500/70"
                            />
                          </Animated.View>
                        ) : !ipError && ipAddress.split(".").length === 4 ? (
                          <Animated.View
                            style={ipValidStyle}
                            className="absolute right-3 top-3.5"
                          >
                            <CheckCircle2
                              size={18}
                              className="text-emerald-500/80"
                            />
                          </Animated.View>
                        ) : ipError ? (
                          <Animated.View
                            entering={ZoomIn.springify()}
                            className="absolute right-3 top-3.5"
                          >
                            <XCircle
                              size={18}
                              className="text-destructive/80"
                            />
                          </Animated.View>
                        ) : null}
                      </View>

                      <Text className="text-lg font-medium text-foreground">
                        :
                      </Text>

                      <View className="relative">
                        <Input
                          ref={portInputRef}
                          placeholder="端口"
                          value={port}
                          onChangeText={handlePortChangeWithValidation}
                          onFocus={() => handleInputFocus("port")}
                          onBlur={handleInputBlur}
                          onSubmitEditing={() => Keyboard.dismiss()}
                          keyboardType="numeric"
                          className={`
                            w-24 h-12 px-4 rounded-xl text-center
                            bg-muted/50 dark:bg-muted/30
                            border-2 transition-colors duration-200
                            ${
                              isFocused === "port"
                                ? "border-primary border-opacity-50 bg-muted/70"
                                : portError
                                ? "border-destructive border-opacity-40"
                                : "border-border/50"
                            }
                            placeholder:text-muted-foreground/50
                          `}
                          accessibilityLabel="端口输入框"
                          accessibilityHint="输入服务器端口号"
                        />

                        {port && !portError && (
                          <Animated.View
                            style={portValidStyle}
                            className="absolute right-2 top-3.5"
                          >
                            <CheckCircle2
                              size={16}
                              className="text-emerald-500/80"
                            />
                          </Animated.View>
                        )}
                      </View>
                    </Animated.View>

                    {/* 错误提示 */}
                    {(ipError || portError) && (
                      <Animated.View
                        entering={FadeInDown.springify()}
                        className="mt-1.5 px-1"
                      >
                        <Text className="text-xs text-destructive">
                          {ipError || portError}
                        </Text>
                      </Animated.View>
                    )}

                    <Animated.View
                      entering={FadeIn.delay(600).springify()}
                      className="flex-row items-center justify-between mt-1"
                    >
                      <View className="flex-row items-center space-x-1">
                        <Info size={12} className="text-muted-foreground/70" />
                        <Text className="text-xs text-muted-foreground/70">
                          点击卡片查看详细网络信息
                        </Text>
                      </View>

                      {isConnected &&
                        !ipError &&
                        !portError &&
                        ipAddress &&
                        port && (
                          <AnimatedBadge
                            variant="outline"
                            entering={FadeIn.delay(300)}
                            className="px-2 py-0 rounded-full border-emerald-500/30"
                          >
                            <Link2
                              size={10}
                              className="mr-1 text-emerald-500"
                            />
                            <Text className="text-[10px] text-emerald-500">
                              连接就绪
                            </Text>
                          </AnimatedBadge>
                        )}
                    </Animated.View>
                  </View>
                </Animated.View>
              </CardContent>
            </AnimatedCard>
          </AnimatedTouchable>
        </Animated.View>
      </CopilotStep>
    );
  }
);

StatusCard.displayName = "StatusCard";

export default StatusCard;
