import React, {
  useCallback,
  useState,
  useEffect,
  useMemo,
  useRef,
} from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  ViewStyle,
  AccessibilityInfo,
  Platform,
} from "react-native";
import { CopilotStep, walkthroughable } from "react-native-copilot";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withDelay,
  interpolate,
  FadeIn,
  SlideInRight,
  withTiming,
  Easing,
  BounceIn,
  ZoomIn,
  Extrapolate,
  FadeInDown,
  ZoomOut,
  cancelAnimation,
  withRepeat,
} from "react-native-reanimated";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
  CardContent,
} from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "~/components/ui/alert";
import { AlertCircle, Wifi, RefreshCw, Network } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useColorScheme } from "~/lib/useColorScheme";
import { usePrevious } from "~/hooks/usePrevious";
import { toast } from "sonner-native";
import {
  checkHotspotAvailability,
  checkLanAvailability,
} from "~/utils/network-utils";

const WalkthroughCard = walkthroughable(Card);
const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);
const AnimatedBadge = Animated.createAnimatedComponent(Badge);

type ModeType = "hotspot" | "lan";

interface ModeSelectionProps {
  activeMode: ModeType;
  setActiveMode: (mode: ModeType) => void;
}

interface ModeValidation {
  hotspot: boolean;
  lan: boolean;
  error?: string;
}

export const ModeSelectionCards: React.FC<ModeSelectionProps> = React.memo(
  ({ activeMode, setActiveMode }) => {
    const { isDarkColorScheme } = useColorScheme();
    const cardScale = useSharedValue(1);
    const iconScale = useSharedValue(1);
    const switchAnimProgress = useSharedValue(0);
    const contentOpacity = useSharedValue(1);
    const hotspotWaveAnimation = useSharedValue(0);
    const lanWaveAnimation = useSharedValue(0);
    const pulseAnimation = useSharedValue(0);

    // 加载与错误状态管理
    const [isLoading, setIsLoading] = useState(true);
    const [isScreenReaderEnabled, setIsScreenReaderEnabled] = useState(false);
    const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // 优化弹簧动画配置 - 更流畅的弹性感
    const springConfig = useMemo(
      () => ({
        damping: 12,
        stiffness: 120,
        mass: 0.6,
        overshootClamping: false,
      }),
      []
    );

    const bounceConfig = useMemo(
      () => ({
        damping: 10,
        stiffness: 160,
        mass: 0.8,
        overshootClamping: false,
      }),
      []
    );

    // 使用 useMemo 缓存响应式断点
    const { isSmallScreen, cardPadding, titleSize, iconSize } = useMemo(() => {
      const screenWidth = Dimensions.get("window").width;
      return {
        isSmallScreen: screenWidth < 350,
        cardPadding: screenWidth < 350 ? "px-3 py-3" : "p-4",
        titleSize: screenWidth < 350 ? "text-lg" : "text-xl",
        iconSize: screenWidth < 350 ? 22 : 26,
      };
    }, []);

    // 模式切换状态
    const [isSwitching, setIsSwitching] = useState(false);
    const prevMode = usePrevious(activeMode);

    // 可用性状态验证
    const [modeAvailability, setModeAvailability] = useState<ModeValidation>({
      hotspot: true,
      lan: true,
    });

    // 验证网络模式可用性，添加错误处理和重试机制
    const validateModeAvailability = useCallback(async (showToast = false) => {
      try {
        setIsLoading(true);
        pulseAnimation.value = withRepeat(
          withTiming(1, { duration: 1000 }),
          -1,
          true
        );

        const [hotspotAvailable, lanAvailable] = await Promise.all([
          checkHotspotAvailability(),
          checkLanAvailability(),
        ]);

        setModeAvailability({
          hotspot: hotspotAvailable,
          lan: lanAvailable,
        });

        // 启动波浪动画效果
        if (hotspotAvailable) {
          hotspotWaveAnimation.value = withRepeat(
            withTiming(1, { duration: 3000, easing: Easing.out(Easing.ease) }),
            -1,
            false
          );
        }

        if (lanAvailable) {
          lanWaveAnimation.value = withRepeat(
            withTiming(1, { duration: 3000, easing: Easing.out(Easing.ease) }),
            -1,
            false
          );
        }

        if (showToast) {
          toast.success("网络模式已更新", {
            description: "连接状态已刷新",
          });
        }
      } catch (error) {
        console.error("模式可用性检查失败:", error);
        setModeAvailability((prev) => ({
          ...prev,
          error: "网络模式检查失败，请检查连接",
        }));

        if (showToast) {
          toast.error("网络模式检查失败", {
            description: "请检查网络连接后重试",
          });
        }
      } finally {
        cancelAnimation(pulseAnimation);
        pulseAnimation.value = 0;
        setIsLoading(false);
      }
    }, []);

    // 性能优化：缓存按下效果处理函数
    const handlePressIn = useCallback(
      (mode: ModeType) => {
        if (!modeAvailability[mode] || isSwitching) return;

        cardScale.value = withSpring(0.97, springConfig);
        if (Platform.OS !== "web" && !isScreenReaderEnabled) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      },
      [modeAvailability, isSwitching, springConfig, isScreenReaderEnabled]
    );

    const handlePressOut = useCallback(() => {
      cardScale.value = withSpring(1, springConfig);
    }, [springConfig]);

    // 优化模式切换逻辑，添加更丰富的动画和反馈
    const handleModeChange = useCallback(
      async (mode: ModeType) => {
        if (mode === activeMode || !modeAvailability[mode] || isSwitching)
          return;

        setIsSwitching(true);

        // 优化动画序列
        contentOpacity.value = withSequence(
          withTiming(0.85, { duration: 150 }),
          withDelay(200, withTiming(1, { duration: 300 }))
        );

        switchAnimProgress.value = withTiming(0, {
          duration: 200,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        });

        iconScale.value = withSequence(
          withTiming(0.8, { duration: 150 }),
          withTiming(1.3, { duration: 200 }),
          withTiming(1, {
            duration: 300,
            easing: Easing.elastic(1.2),
          })
        );

        // 触觉反馈 - 仅在非屏幕阅读器模式下
        if (Platform.OS !== "web" && !isScreenReaderEnabled) {
          await Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Success
          );
        }

        setActiveMode(mode);

        // 防止动画冲突，使用 setTimeout 延迟状态更新
        const timer = setTimeout(() => setIsSwitching(false), 800);
        refreshTimeoutRef.current = timer;

        // 添加成功切换的提示
        toast.success(`已切换到${mode === "hotspot" ? "热点" : "局域网"}模式`, {
          description:
            mode === "hotspot"
              ? "请连接到设备创建的WIFI热点"
              : "请确保设备在同一局域网",
        });

        return () => {
          if (refreshTimeoutRef.current) {
            clearTimeout(refreshTimeoutRef.current);
          }
        };
      },
      [activeMode, modeAvailability, isSwitching, isScreenReaderEnabled]
    );

    // 动画样式优化 - 更流畅的卡片动画
    const cardAnimatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: withSpring(cardScale.value, springConfig) }],
      opacity: contentOpacity.value,
    }));

    const iconAnimatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: withSpring(iconScale.value, bounceConfig) }],
    }));

    const switchAnimStyle = useAnimatedStyle(() => ({
      opacity: interpolate(
        switchAnimProgress.value,
        [0, 1],
        [0.85, 1],
        Extrapolate.CLAMP
      ),
      transform: [
        {
          scale: interpolate(
            switchAnimProgress.value,
            [0, 0.5, 1],
            [0.96, 1.03, 1],
            Extrapolate.CLAMP
          ),
        },
        {
          translateY: interpolate(
            switchAnimProgress.value,
            [0, 0.5, 1],
            [2, -3, 0],
            Extrapolate.CLAMP
          ),
        },
      ],
    }));

    // 为热点模式添加波浪效果动画
    const hotspotWaveStyle = useAnimatedStyle(() => {
      return {
        opacity: interpolate(
          hotspotWaveAnimation.value,
          [0, 0.5, 1],
          [0.2, 0.12, 0],
          Extrapolate.CLAMP
        ),
        transform: [
          {
            scale: interpolate(
              hotspotWaveAnimation.value,
              [0, 1],
              [1, 1.8],
              Extrapolate.CLAMP
            ),
          },
        ],
      };
    });

    // 为局域网模式添加波浪效果动画
    const lanWaveStyle = useAnimatedStyle(() => {
      return {
        opacity: interpolate(
          lanWaveAnimation.value,
          [0, 0.5, 1],
          [0.2, 0.12, 0],
          Extrapolate.CLAMP
        ),
        transform: [
          {
            scale: interpolate(
              lanWaveAnimation.value,
              [0, 1],
              [1, 1.8],
              Extrapolate.CLAMP
            ),
          },
        ],
      };
    });

    // 加载脉冲动画
    const pulseStyle = useAnimatedStyle(() => {
      return {
        opacity: interpolate(
          pulseAnimation.value,
          [0, 0.5, 1],
          [0.7, 1, 0.7],
          Extrapolate.CLAMP
        ),
      };
    });

    // 检查屏幕阅读器状态 - 提升无障碍体验
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

    // 生命周期优化 - 更安全的清理函数
    useEffect(() => {
      validateModeAvailability();

      const validateInterval = setInterval(validateModeAvailability, 30000);

      return () => {
        clearInterval(validateInterval);
        if (refreshTimeoutRef.current) {
          clearTimeout(refreshTimeoutRef.current);
        }

        // 清理所有动画，防止内存泄漏
        cancelAnimation(hotspotWaveAnimation);
        cancelAnimation(lanWaveAnimation);
        cancelAnimation(pulseAnimation);
        cancelAnimation(iconScale);
        cancelAnimation(cardScale);
        cancelAnimation(contentOpacity);
        cancelAnimation(switchAnimProgress);
      };
    }, []);

    // 优化模式切换动画
    useEffect(() => {
      if (activeMode && prevMode !== activeMode) {
        iconScale.value = withSequence(
          withTiming(1.3, { duration: 200 }),
          withTiming(1, { duration: 300, easing: Easing.elastic(1.2) })
        );

        switchAnimProgress.value = withDelay(
          200,
          withTiming(1, {
            duration: 800,
            easing: Easing.bezier(0.22, 1, 0.36, 1),
          })
        );
      }
    }, [activeMode, prevMode]);

    // 渲染骨架屏加载状态
    if (isLoading && !modeAvailability.hotspot && !modeAvailability.lan) {
      return (
        <Animated.View
          style={pulseStyle}
          className="flex flex-col space-y-4 p-2 w-full"
        >
          <Skeleton className="w-full h-48 rounded-2xl" />
          <Skeleton className="w-full h-48 rounded-2xl" />
        </Animated.View>
      );
    }

    // 渲染错误状态
    if (
      modeAvailability.error &&
      !modeAvailability.hotspot &&
      !modeAvailability.lan
    ) {
      return (
        <Animated.View
          entering={FadeInDown.springify()}
          className="flex flex-col space-y-4 p-2 w-full"
        >
          <Alert
            variant="destructive"
            className="border-2 border-destructive/40 rounded-xl"
          >
            <AlertCircle className="h-5 w-5" />
            <AlertTitle>网络模式不可用</AlertTitle>
            <AlertDescription>{modeAvailability.error}</AlertDescription>
            <Button
              className="mt-3"
              variant="destructive"
              onPress={() => validateModeAvailability(true)}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              <Text>重试</Text>
            </Button>
          </Alert>
        </Animated.View>
      );
    }

    return (
      <View className="flex flex-col space-y-4 p-2 w-full">
        {/* 热点模式卡片 */}
        <CopilotStep
          text="选择热点模式可以快速建立设备间连接"
          order={1}
          name="hotspot-mode"
        >
          <Animated.View
            style={[
              cardAnimatedStyle,
              activeMode === "hotspot" ? switchAnimStyle : undefined,
            ]}
            entering={SlideInRight.delay(200).springify()}
          >
            <AnimatedTouchable
              onPress={() => handleModeChange("hotspot")}
              onPressIn={() => handlePressIn("hotspot")}
              onPressOut={handlePressOut}
              className="w-full active:opacity-90"
              disabled={!modeAvailability.hotspot || isSwitching}
              accessible={true}
              accessibilityLabel={`热点模式${
                activeMode === "hotspot" ? "（当前已选）" : ""
              }`}
              accessibilityHint="点击切换到热点模式"
              accessibilityRole="button"
              accessibilityState={{
                disabled: !modeAvailability.hotspot || isSwitching,
                selected: activeMode === "hotspot",
              }}
            >
              <WalkthroughCard
                className={`
                relative overflow-hidden
                border-2 shadow-lg backdrop-blur-xl rounded-2xl
                transition-all duration-300 ease-in-out
                ${
                  activeMode === "hotspot"
                    ? "border-primary bg-primary/10 dark:bg-primary/20 shadow-primary/20"
                    : "border-border/30 bg-card/90 hover:bg-card/95 hover:border-border/50"
                }
                ${
                  !modeAvailability.hotspot || isSwitching
                    ? "opacity-60 cursor-not-allowed"
                    : ""
                }
              `}
              >
                {/* 波浪背景动画效果 */}
                {activeMode === "hotspot" && modeAvailability.hotspot && (
                  <Animated.View
                    style={hotspotWaveStyle}
                    className="absolute inset-0 rounded-full bg-primary"
                  />
                )}

                <CardHeader className={`space-y-3 ${cardPadding}`}>
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center space-x-3">
                      <Animated.View
                        style={
                          activeMode === "hotspot"
                            ? iconAnimatedStyle
                            : undefined
                        }
                        entering={
                          activeMode === "hotspot" ? BounceIn : undefined
                        }
                      >
                        <View
                          className={`
                          p-2.5 rounded-xl
                          ${
                            activeMode === "hotspot"
                              ? "bg-primary/20 dark:bg-primary/30"
                              : "bg-muted/80"
                          }
                        `}
                        >
                          <Wifi
                            size={iconSize}
                            className={
                              activeMode === "hotspot"
                                ? "text-blue-500"
                                : "text-muted-foreground"
                            }
                          />
                        </View>
                      </Animated.View>

                      <View>
                        <CardTitle
                          className={`
                          ${titleSize} font-bold transition-colors
                          ${
                            activeMode === "hotspot"
                              ? "text-primary dark:text-primary/90"
                              : "text-foreground"
                          }
                        `}
                        >
                          会议热点模式
                        </CardTitle>

                        {/* 添加方式标签 - 提升视觉层次 */}
                        <AnimatedBadge
                          variant="secondary"
                          entering={FadeIn.delay(300)}
                          className={`
                            mt-1 rounded-full px-2 py-0.5
                            ${
                              activeMode === "hotspot"
                                ? "bg-primary/20 border-primary/30"
                                : "bg-muted/50"
                            }
                          `}
                        >
                          <Text
                            className={`text-xs ${
                              activeMode === "hotspot"
                                ? "text-primary"
                                : "text-muted-foreground"
                            }`}
                          >
                            无线连接
                          </Text>
                        </AnimatedBadge>
                      </View>
                    </View>

                    {!modeAvailability.hotspot ? (
                      <Animated.View entering={ZoomIn.springify()}>
                        <Badge
                          variant="outline"
                          className="rounded-full px-2 py-1 bg-amber-500/20 border border-amber-500/30"
                        >
                          <Text className="text-xs font-medium text-amber-500">
                            不可用
                          </Text>
                        </Badge>
                      </Animated.View>
                    ) : activeMode === "hotspot" ? (
                      <Animated.View entering={ZoomIn.delay(200)}>
                        <Badge
                          variant="default"
                          className="rounded-full px-2 py-1 bg-primary/20 border border-primary/30"
                        >
                          <Text className="text-xs font-medium text-primary">
                            已选择
                          </Text>
                        </Badge>
                      </Animated.View>
                    ) : null}
                  </View>

                  <CardDescription className="text-muted-foreground/90 text-base leading-relaxed pl-1">
                    • 手机WiFi搜索附近WIFI并连接{"\n"}• 请确保设备在自动连接状态
                  </CardDescription>
                </CardHeader>

                <CardFooter className={`pt-2 ${cardPadding}`}>
                  <Text
                    className={`
                    text-sm font-medium px-3 py-1.5 rounded-full
                    transition-colors duration-200
                    ${
                      activeMode === "hotspot"
                        ? "bg-primary/15 text-primary dark:bg-primary/25"
                        : "bg-muted/50 text-muted-foreground"
                    }
                  `}
                  >
                    {activeMode === "hotspot" ? "当前模式" : "点击切换"}
                  </Text>
                </CardFooter>
              </WalkthroughCard>
            </AnimatedTouchable>
          </Animated.View>
        </CopilotStep>

        {/* 局域网模式卡片 */}
        <CopilotStep
          text="使用局域网模式在同一网络下连接设备"
          order={2}
          name="lan-mode"
        >
          <Animated.View
            style={[
              cardAnimatedStyle,
              activeMode === "lan" ? switchAnimStyle : undefined,
            ]}
            entering={SlideInRight.delay(400).springify()}
          >
            <AnimatedTouchable
              onPress={() => handleModeChange("lan")}
              onPressIn={() => handlePressIn("lan")}
              onPressOut={handlePressOut}
              className="w-full active:opacity-90"
              disabled={!modeAvailability.lan || isSwitching}
              accessible={true}
              accessibilityLabel={`局域网模式${
                activeMode === "lan" ? "（当前已选）" : ""
              }`}
              accessibilityHint="点击切换到局域网模式"
              accessibilityRole="button"
              accessibilityState={{
                disabled: !modeAvailability.lan || isSwitching,
                selected: activeMode === "lan",
              }}
            >
              <WalkthroughCard
                className={`
                relative overflow-hidden
                border-2 shadow-lg backdrop-blur-xl rounded-2xl
                transition-all duration-300 ease-in-out
                ${
                  activeMode === "lan"
                    ? "border-primary bg-primary/10 dark:bg-primary/20"
                    : "border-border/30 bg-card/90 hover:bg-card/95"
                }
                ${!modeAvailability.lan || isSwitching ? "opacity-60" : ""}
              `}
              >
                {/* 波浪背景动画效果 */}
                {activeMode === "lan" && modeAvailability.lan && (
                  <Animated.View
                    style={lanWaveStyle}
                    className="absolute inset-0 rounded-full bg-primary"
                  />
                )}

                <CardHeader className={`space-y-3 ${cardPadding}`}>
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center space-x-3">
                      <Animated.View
                        style={
                          activeMode === "lan" ? iconAnimatedStyle : undefined
                        }
                        entering={activeMode === "lan" ? BounceIn : undefined}
                      >
                        <View
                          className={`
                          p-2.5 rounded-xl
                          ${
                            activeMode === "lan"
                              ? "bg-primary/20 dark:bg-primary/30"
                              : "bg-muted/80"
                          }
                        `}
                        >
                          <Network
                            size={iconSize}
                            className={
                              activeMode === "lan"
                                ? "text-blue-500"
                                : "text-muted-foreground"
                            }
                          />
                        </View>
                      </Animated.View>

                      <View>
                        <CardTitle
                          className={`
                          ${titleSize} font-bold transition-colors
                          ${
                            activeMode === "lan"
                              ? "text-primary dark:text-primary/90"
                              : "text-foreground"
                          }
                        `}
                        >
                          局域网模式
                        </CardTitle>

                        {/* 添加方式标签 - 提升视觉层次 */}
                        <AnimatedBadge
                          variant="secondary"
                          entering={FadeIn.delay(300)}
                          className={`
                            mt-1 rounded-full px-2 py-0.5
                            ${
                              activeMode === "lan"
                                ? "bg-primary/20 border-primary/30"
                                : "bg-muted/50"
                            }
                          `}
                        >
                          <Text
                            className={`text-xs ${
                              activeMode === "lan"
                                ? "text-primary"
                                : "text-muted-foreground"
                            }`}
                          >
                            同网连接
                          </Text>
                        </AnimatedBadge>
                      </View>
                    </View>

                    {!modeAvailability.lan ? (
                      <Animated.View entering={ZoomIn.springify()}>
                        <Badge
                          variant="outline"
                          className="rounded-full px-2 py-1 bg-amber-500/20 border border-amber-500/30"
                        >
                          <Text className="text-xs font-medium text-amber-500">
                            不可用
                          </Text>
                        </Badge>
                      </Animated.View>
                    ) : activeMode === "lan" ? (
                      <Animated.View entering={ZoomIn.delay(200)}>
                        <Badge
                          variant="default"
                          className="rounded-full px-2 py-1 bg-primary/20 border border-primary/30"
                        >
                          <Text className="text-xs font-medium text-primary">
                            已选择
                          </Text>
                        </Badge>
                      </Animated.View>
                    ) : null}
                  </View>

                  <CardDescription className="text-muted-foreground/90 text-base leading-relaxed pl-1">
                    • 确保设备连接到同一个WiFi网络{"\n"}•
                    适用于固定场景的设备连接
                  </CardDescription>
                </CardHeader>

                <CardFooter className={`pt-2 ${cardPadding}`}>
                  <Text
                    className={`
                    text-sm font-medium px-3 py-1.5 rounded-full
                    transition-colors duration-200
                    ${
                      activeMode === "lan"
                        ? "bg-primary/15 text-primary dark:bg-primary/25"
                        : "bg-muted/50 text-muted-foreground"
                    }
                  `}
                  >
                    {activeMode === "lan" ? "当前模式" : "点击切换"}
                  </Text>
                </CardFooter>
              </WalkthroughCard>
            </AnimatedTouchable>
          </Animated.View>
        </CopilotStep>

        {/* 添加刷新选项 */}
        <Animated.View
          entering={FadeIn.delay(600)}
          className="items-center mt-2"
        >
          <Button
            variant="link"
            size="sm"
            onPress={() => validateModeAvailability(true)}
            disabled={isLoading}
            className="flex-row items-center"
            accessibilityLabel="刷新网络状态"
            accessibilityHint="检查网络连接模式的可用性"
          >
            <RefreshCw size={16} className="mr-1 text-muted-foreground" />
            <Text className="text-sm text-muted-foreground">
              {isLoading ? "检查中..." : "刷新网络状态"}
            </Text>
          </Button>
        </Animated.View>
      </View>
    );
  }
);

ModeSelectionCards.displayName = "ModeSelectionCards";

export default ModeSelectionCards;
