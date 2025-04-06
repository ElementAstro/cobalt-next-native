import React, { useCallback, useEffect, useState, useMemo } from "react";
import { View, Text, TouchableOpacity, Dimensions } from "react-native";
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
} from "react-native-reanimated";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Card, CardHeader, CardTitle, CardContent } from "~/components/ui/card";
import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";
import * as Haptics from "expo-haptics";
import { Badge } from "~/components/ui/badge";
import {
  AlertCircle,
  Signal,
  Wifi,
  WifiOff,
  Info,
  Server,
} from "lucide-react-native";

interface StatusCardProps {
  isConnected: boolean;
  activeMode: "hotspot" | "lan";
  ipAddress: string;
  port: string;
  handleIpChange: (value: string) => void;
  handlePortChange: (value: string) => void;
  onPress: () => void;
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
  }) => {
    const [isFocused, setIsFocused] = useState(false);

    // 共享动画值
    const cardScale = useSharedValue(1);
    const statusIconScale = useSharedValue(1);
    const inputContainerOpacity = useSharedValue(0);
    const contentOpacity = useSharedValue(0);

    // 响应式布局优化
    const { isSmallScreen, screenConfig } = useMemo(() => {
      const { width } = Dimensions.get("window");
      const isSmall = width < 350;
      return {
        isSmallScreen: isSmall,
        screenConfig: {
          padding: isSmall ? "px-3 py-4" : "p-4",
          titleSize: isSmall ? "text-lg" : "text-xl",
        },
      };
    }, []);

    // 处理动画
    const handlePressIn = useCallback(() => {
      cardScale.value = withSpring(0.98, {
        damping: 15,
        stiffness: 300,
      });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, []);

    const handlePressOut = useCallback(() => {
      cardScale.value = withSpring(1, {
        damping: 15,
        stiffness: 300,
      });
    }, []);

    const handleInputFocus = useCallback(() => {
      setIsFocused(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, []);

    const handleInputBlur = useCallback(() => {
      setIsFocused(false);
    }, []);

    // IP地址验证和格式化
    const handleIpChangeWithValidation = useCallback(
      (value: string) => {
        // 只允许数字和点
        const formattedValue = value.replace(/[^0-9.]/g, "");
        // 验证IP地址格式
        const isValidIP = /^(\d{1,3}\.){0,3}\d{1,3}$/.test(formattedValue);
        if (isValidIP) {
          handleIpChange(formattedValue);
        }
      },
      [handleIpChange]
    );

    // 端口号验证和格式化
    const handlePortChangeWithValidation = useCallback(
      (value: string) => {
        // 只允许数字
        const formattedValue = value.replace(/[^0-9]/g, "");
        // 验证端口号范围
        const port = parseInt(formattedValue, 10);
        if (!formattedValue || (port >= 0 && port <= 65535)) {
          handlePortChange(formattedValue);
        }
      },
      [handlePortChange]
    );

    // 动画样式
    const cardAnimatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: cardScale.value }],
    }));

    const statusIconStyle = useAnimatedStyle(() => ({
      transform: [{ scale: statusIconScale.value }],
    }));

    const contentStyle = useAnimatedStyle(() => ({
      opacity: contentOpacity.value,
    }));

    const inputContainerStyle = useAnimatedStyle(() => ({
      opacity: inputContainerOpacity.value,
    }));

    // 生命周期效果
    useEffect(() => {
      // 入场动画
      contentOpacity.value = withDelay(300, withSpring(1));
      inputContainerOpacity.value = withDelay(500, withSpring(1));

      // 连接状态变化动画
      statusIconScale.value = withSequence(
        withSpring(1.2, { stiffness: 300, damping: 10 }),
        withSpring(1, { stiffness: 300, damping: 15 })
      );
    }, [isConnected]);

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
        >
          <TouchableOpacity
            onPress={onPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            className="w-full active:opacity-90"
            accessible={true}
            accessibilityLabel={`连接状态：${
              isConnected ? "已连接" : "未连接"
            }`}
            accessibilityRole="button"
            accessibilityHint="点击查看详细网络信息"
          >
            <Card
              className="
            border-2 shadow-lg backdrop-blur-xl rounded-2xl
            bg-gradient-to-br from-card/95 to-card/90
            dark:from-gray-800/95 dark:to-gray-800/90
            border-border/30 hover:border-border/50
            transition-all duration-300
          "
            >
              <CardHeader
                className={`space-y-4 ${isSmallScreen ? "px-4 py-3" : "p-5"}`}
              >
                <View className="flex-row items-center justify-between w-full">
                  <View className="flex-row items-center space-x-3">
                    <Animated.View style={statusIconStyle}>
                      <View
                        className={`
                      p-2.5 rounded-xl
                      ${
                        isConnected
                          ? "bg-emerald-500/20 dark:bg-emerald-500/30"
                          : "bg-rose-500/20 dark:bg-rose-500/30"
                      }
                    `}
                      >
                        {isConnected ? (
                          <Wifi size={24} color="#10b981" />
                        ) : (
                          <WifiOff size={24} color="#ef4444" />
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
                      <Animated.View entering={ZoomIn.springify().delay(300)}>
                        <Badge
                          variant={isConnected ? "default" : "secondary"}
                          className={`
                          px-3 py-0.5 text-xs font-medium rounded-full
                          ${
                            isConnected ? "bg-emerald-500/90" : "bg-rose-500/90"
                          }
                          ${isConnected ? "text-emerald-50" : "text-rose-50"}
                        `}
                        >
                          {isConnected ? "已连接" : "未连接"}
                        </Badge>
                      </Animated.View>
                    </View>
                  </View>

                  <Animated.View entering={ZoomIn.springify().delay(400)}>
                    <Badge
                      variant="outline"
                      className="px-3 py-1 rounded-full border-primary/30"
                    >
                      <Text className="text-xs font-medium text-primary">
                        {activeMode === "hotspot" ? "热点模式" : "局域网模式"}
                      </Text>
                    </Badge>
                  </Animated.View>
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
                    </Label>

                    <Animated.View
                      style={inputContainerStyle}
                      className="flex-row items-center space-x-2"
                    >
                      <View className="flex-1 relative">
                        <Input
                          id="ip-address"
                          placeholder="请输入IP地址"
                          value={ipAddress}
                          onChangeText={handleIpChangeWithValidation}
                          onFocus={handleInputFocus}
                          onBlur={handleInputBlur}
                          keyboardType="numeric"
                          className={`
                          flex-1 h-12 px-4 rounded-xl
                          bg-muted/50 dark:bg-muted/30
                          border-2 transition-colors duration-200
                          ${
                            isFocused
                              ? "border-primary border-opacity-50 bg-muted/70"
                              : "border-border/50"
                          }
                          placeholder:text-muted-foreground/50
                        `}
                        />

                        {!ipAddress && (
                          <Animated.View
                            entering={FadeIn.delay(500).springify()}
                            className="absolute right-3 top-3"
                          >
                            <AlertCircle
                              size={18}
                              className="text-amber-500/70"
                            />
                          </Animated.View>
                        )}
                      </View>

                      <Text className="text-lg font-medium text-foreground">
                        :
                      </Text>

                      <Input
                        placeholder="端口"
                        value={port}
                        onChangeText={handlePortChangeWithValidation}
                        onFocus={handleInputFocus}
                        onBlur={handleInputBlur}
                        keyboardType="numeric"
                        className={`
                        w-24 h-12 px-4 rounded-xl text-center
                        bg-muted/50 dark:bg-muted/30
                        border-2 transition-colors duration-200
                        ${
                          isFocused
                            ? "border-primary border-opacity-50 bg-muted/70"
                            : "border-border/50"
                        }
                        placeholder:text-muted-foreground/50
                      `}
                      />
                    </Animated.View>

                    <Animated.View
                      entering={FadeIn.delay(600).springify()}
                      className="flex-row items-center space-x-1"
                    >
                      <Info size={12} className="text-muted-foreground/70" />
                      <Text className="text-xs text-muted-foreground/70">
                        点击卡片查看详细网络信息
                      </Text>
                    </Animated.View>
                  </View>
                </Animated.View>
              </CardContent>
            </Card>
          </TouchableOpacity>
        </Animated.View>
      </CopilotStep>
    );
  }
);
