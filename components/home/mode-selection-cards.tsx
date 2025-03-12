import React, { useCallback, useState, useEffect } from "react";
import { View, Text, TouchableOpacity, Dimensions } from "react-native";
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

export const ModeSelectionCards: React.FC<ModeSelectionProps> = ({
  activeMode,
  setActiveMode,
}) => {
  const { isDarkColorScheme } = useColorScheme();
  const cardScale = useSharedValue(1);
  const iconScale = useSharedValue(1);
  const switchAnimProgress = useSharedValue(0);
  const springConfig = {
    damping: 12,
    stiffness: 120,
    mass: 0.6,
  };
  
  // 模式切换状态
  const [isSwitching, setIsSwitching] = useState(false);

  async function checkHotspotAvailability(): Promise<boolean> {
    try {
      // 这里实现热点可用性检查逻辑
      return true;
    } catch (error) {
      console.error("热点可用性检查失败:", error);
      return false;
    }
  }

  async function checkLanAvailability(): Promise<boolean> {
    try {
      // 这里实现局域网可用性检查逻辑
      return true;
    } catch (error) {
      console.error("局域网可用性检查失败:", error);
      return false;
    }
  }

  const [modeAvailability, setModeAvailability] = useState<ModeValidation>({
    hotspot: true,
    lan: true,
  });

  const validateModeAvailability = useCallback(async () => {
    try {
      const hotspotAvailable = await checkHotspotAvailability();
      const lanAvailable = await checkLanAvailability();
      setModeAvailability({
        hotspot: hotspotAvailable,
        lan: lanAvailable,
      });
    } catch (error) {
      console.error("模式可用性检查失败:", error);
    }
  }, []);

  useEffect(() => {
    validateModeAvailability();
    
    // 为激活模式添加动画效果
    if (activeMode) {
      iconScale.value = withSequence(
        withTiming(1.3, { duration: 200 }),
        withTiming(1, { duration: 300, easing: Easing.elastic(1.2) })
      );
      
      // 使用withDelay添加延迟切换动画
      switchAnimProgress.value = withDelay(
        200, 
        withTiming(1, { duration: 800, easing: Easing.bezier(0.22, 1, 0.36, 1) })
      );
    }
  }, [activeMode]);

  const handlePressIn = useCallback(() => {
    cardScale.value = withSpring(0.97, springConfig);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handlePressOut = useCallback(() => {
    cardScale.value = withSpring(1, springConfig);
  }, []);

  const handleModeChange = useCallback(
    async (mode: ModeType) => {
      if (mode === activeMode || !modeAvailability[mode] || isSwitching) return;
      
      setIsSwitching(true);
      switchAnimProgress.value = 0;
      switchAnimProgress.value = withTiming(1, {
        duration: 600,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
      });

      iconScale.value = withSequence(
        withTiming(1.3, { duration: 200 }),
        withTiming(1, { duration: 300, easing: Easing.elastic(1.2) })
      );

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setActiveMode(mode);
      
      // 添加短延迟后重置切换状态
      setTimeout(() => setIsSwitching(false), 800);
    },
    [activeMode, modeAvailability, setActiveMode, isSwitching]
  );

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: cardScale.value },
      {
        translateX: interpolate(cardScale.value, [0.97, 1], [2, 0]),
      },
    ],
  }));
  
  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));
  
  // 使用switchAnimProgress创建切换动画效果
  const switchAnimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(switchAnimProgress.value, [0, 1], [0.7, 1]),
    transform: [
      { 
        scale: interpolate(switchAnimProgress.value, [0, 0.5, 1], [0.95, 1.02, 1])
      },
    ]
  }));

  // 响应式布局调整
  const screenWidth = Dimensions.get('window').width;
  const isSmallScreen = screenWidth < 350;
  const cardPadding = isSmallScreen ? "px-3 py-4" : "p-4";
  const titleSize = isSmallScreen ? "text-lg" : "text-xl";

  return (
    <View className="flex flex-col space-y-4 p-2 w-full">
      {/* 热点模式卡片 */}
      <CopilotStep
        text="选择热点模式可以快速建立设备间连接"
        order={1}
        name="hotspot-mode"
      >
        <Animated.View
          style={[cardAnimatedStyle, activeMode === "hotspot" ? switchAnimStyle : undefined]}
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
                ${!modeAvailability.hotspot || isSwitching ? "opacity-60 cursor-not-allowed" : ""}
              `}
            >
              <CardHeader className={`space-y-3 ${cardPadding}`}>
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center space-x-3">
                    <Animated.View 
                      style={activeMode === "hotspot" ? iconAnimatedStyle : undefined}
                      entering={activeMode === "hotspot" ? BounceIn : undefined}
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
                          color={activeMode === "hotspot" ? "#60a5fa" : "#94a3b8"}
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
                        <Text className="text-xs font-medium text-amber-500">不可用</Text>
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
          style={[cardAnimatedStyle, activeMode === "lan" ? switchAnimStyle : undefined]}
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
                      style={activeMode === "lan" ? iconAnimatedStyle : undefined}
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
                        <Text className="text-xs font-medium text-amber-500">不可用</Text>
                      </View>
                    </Animated.View>
                  )}
                </View>
                <CardDescription className="text-muted-foreground/90 text-base leading-relaxed pl-1">
                  • 确保设备连接到同一个WiFi网络{"\n"}• 适用于固定场景的设备连接
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
};
