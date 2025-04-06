import React, { useCallback, useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  ViewStyle,
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
} from "react-native-reanimated";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "~/components/ui/card";
import * as Haptics from "expo-haptics";
import { useColorScheme } from "~/lib/useColorScheme";
import { usePrevious } from "~/hooks/usePrevious";
import { toast } from "sonner-native";
import {
  checkHotspotAvailability,
  checkLanAvailability,
} from "~/utils/network-utils";

const WalkthroughCard = walkthroughable(Card);

type ModeType = "hotspot" | "lan";

interface ModeSelectionProps {
  activeMode: ModeType;
  setActiveMode: (mode: ModeType) => void;
}

interface ModeValidation {
  hotspot: boolean;
  lan: boolean;
}

export const ModeSelectionCards: React.FC<ModeSelectionProps> = React.memo(
  ({ activeMode, setActiveMode }) => {
    const { isDarkColorScheme } = useColorScheme();
    const cardScale = useSharedValue(1);
    const iconScale = useSharedValue(1);
    const switchAnimProgress = useSharedValue(0);
    const contentOpacity = useSharedValue(1);

    // 优化弹簧动画配置
    const springConfig = useMemo(
      () => ({
        damping: 12,
        stiffness: 120,
        mass: 0.6,
      }),
      []
    );

    // 使用 useMemo 缓存断点检查
    const { isSmallScreen, cardPadding, titleSize } = useMemo(() => {
      const screenWidth = Dimensions.get("window").width;
      return {
        isSmallScreen: screenWidth < 350,
        cardPadding: screenWidth < 350 ? "px-3 py-4" : "p-4",
        titleSize: screenWidth < 350 ? "text-lg" : "text-xl",
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

    const validateModeAvailability = useCallback(async () => {
      try {
        const [hotspotAvailable, lanAvailable] = await Promise.all([
          checkHotspotAvailability(),
          checkLanAvailability(),
        ]);

        setModeAvailability({
          hotspot: hotspotAvailable,
          lan: lanAvailable,
        });
      } catch (error) {
        console.error("模式可用性检查失败:", error);
        toast.error("网络模式检查失败", {
          description: "请检查网络连接后重试",
        });
      }
    }, []);

    // 性能优化：使用 useCallback 包装事件处理器
    const handlePressIn = useCallback(() => {
      cardScale.value = withSpring(0.97, springConfig);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, [springConfig]);

    const handlePressOut = useCallback(() => {
      cardScale.value = withSpring(1, springConfig);
    }, [springConfig]);

    const handleModeChange = useCallback(
      async (mode: ModeType) => {
        if (mode === activeMode || !modeAvailability[mode] || isSwitching)
          return;

        setIsSwitching(true);
        contentOpacity.value = withSequence(
          withTiming(0.7, { duration: 150 }),
          withDelay(200, withTiming(1, { duration: 300 }))
        );

        // 优化切换动画
        switchAnimProgress.value = withTiming(0, { duration: 200 });
        iconScale.value = withSequence(
          withTiming(0.8, { duration: 150 }),
          withTiming(1.3, { duration: 200 }),
          withTiming(1, {
            duration: 300,
            easing: Easing.elastic(1.2),
          })
        );

        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success
        );
        setActiveMode(mode);

        setTimeout(() => setIsSwitching(false), 800);
      },
      [activeMode, modeAvailability, setActiveMode, isSwitching]
    );

    // 动画样式优化
    const cardAnimatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: withSpring(cardScale.value, springConfig) }],
      opacity: contentOpacity.value,
    }));

    const iconAnimatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: withSpring(iconScale.value, springConfig) }],
    }));

    const switchAnimStyle = useAnimatedStyle(() => ({
      opacity: interpolate(
        switchAnimProgress.value,
        [0, 1],
        [0.7, 1],
        Extrapolate.CLAMP
      ),
      transform: [
        {
          scale: interpolate(
            switchAnimProgress.value,
            [0, 0.5, 1],
            [0.95, 1.02, 1],
            Extrapolate.CLAMP
          ),
        },
      ],
    }));

    // 生命周期优化
    useEffect(() => {
      validateModeAvailability();

      const validateInterval = setInterval(validateModeAvailability, 30000);
      return () => clearInterval(validateInterval);
    }, []);

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
            <TouchableOpacity
              onPress={() => handleModeChange("hotspot")}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              className="w-full active:opacity-90"
              disabled={!modeAvailability.hotspot || isSwitching}
            >
              <WalkthroughCard
                className={`
                border-2 shadow-lg backdrop-blur-xl rounded-2xl
                transition-all duration-300 ease-in-out
                transform hover:scale-[1.02]
                ${
                  activeMode === "hotspot"
                    ? "border-primary bg-primary/15 dark:bg-primary/20 shadow-primary/20"
                    : "border-border/30 bg-card/90 hover:bg-card/95 hover:border-border/50"
                }
                ${
                  !modeAvailability.hotspot || isSwitching
                    ? "opacity-60 cursor-not-allowed"
                    : ""
                }
              `}
              >
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
                          <MaterialCommunityIcons
                            name="wifi"
                            size={26}
                            color={
                              activeMode === "hotspot" ? "#60a5fa" : "#94a3b8"
                            }
                          />
                        </View>
                      </Animated.View>
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
                    </View>

                    {!modeAvailability.hotspot && (
                      <Animated.View entering={ZoomIn.springify()}>
                        <View className="px-2 py-1 rounded-full bg-amber-500/20 border border-amber-500/30">
                          <Text className="text-xs font-medium text-amber-500">
                            不可用
                          </Text>
                        </View>
                      </Animated.View>
                    )}
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
            </TouchableOpacity>
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
            <TouchableOpacity
              onPress={() => handleModeChange("lan")}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              className="w-full active:opacity-90"
              disabled={!modeAvailability.lan || isSwitching}
            >
              <WalkthroughCard
                className={`
                border-2 shadow-lg backdrop-blur-xl rounded-2xl
                transition-all duration-300 ease-in-out
                ${
                  activeMode === "lan"
                    ? "border-primary bg-primary/15 dark:bg-primary/20"
                    : "border-border/30 bg-card/90 hover:bg-card/95"
                }
                ${!modeAvailability.lan || isSwitching ? "opacity-60" : ""}
              `}
              >
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
                          <MaterialCommunityIcons
                            name="lan"
                            size={26}
                            color={activeMode === "lan" ? "#60a5fa" : "#94a3b8"}
                          />
                        </View>
                      </Animated.View>
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
                    </View>

                    {!modeAvailability.lan && (
                      <Animated.View entering={ZoomIn.springify()}>
                        <View className="px-2 py-1 rounded-full bg-amber-500/20 border border-amber-500/30">
                          <Text className="text-xs font-medium text-amber-500">
                            不可用
                          </Text>
                        </View>
                      </Animated.View>
                    )}
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
            </TouchableOpacity>
          </Animated.View>
        </CopilotStep>
      </View>
    );
  }
);
