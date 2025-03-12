import React, { useCallback, useEffect, useState } from "react";
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

export const StatusCard: React.FC<StatusCardProps> = ({
  isConnected,
  activeMode,
  ipAddress,
  port,
  handleIpChange,
  handlePortChange,
  onPress,
}) => {
  const scale = useSharedValue(1);
  const statusIconScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.7);
  const wiggleRotation = useSharedValue(0);

  // 添加新的动画值
  const inputScale = useSharedValue(1);
  const badgeRotation = useSharedValue(0);
  const contentOpacity = useSharedValue(0);

  // 添加输入状态
  const [isFocused, setIsFocused] = useState(false);

  // 屏幕尺寸响应式布局
  const screenWidth = Dimensions.get("window").width;
  const isSmallScreen = screenWidth < 350;

  useEffect(() => {
    // 连接状态改变时添加动画
    if (isConnected) {
      statusIconScale.value = withSequence(
        withTiming(1.3, { duration: 300 }),
        withTiming(1, { duration: 500, easing: Easing.elastic(1.2) })
      );

      // 连接成功时的脉冲效果
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1000 }),
          withTiming(0.7, { duration: 1000 })
        ),
        3,
        false
      );
    } else {
      // 未连接时的摇晃效果
      wiggleRotation.value = withRepeat(
        withSequence(
          withTiming(-5, { duration: 200 }),
          withTiming(5, { duration: 200 }),
          withTiming(0, { duration: 200 })
        ),
        2,
        false
      );
    }
  }, [isConnected]);

  useEffect(() => {
    // 内容渐入动画
    contentOpacity.value = withTiming(1, {
      duration: 800,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
    });

    // 连接状态改变时的徽章动画
    if (isConnected) {
      badgeRotation.value = withSequence(
        withTiming(15, { duration: 150 }),
        withTiming(-15, { duration: 150 }),
        withTiming(0, { duration: 150 })
      );
    }
  }, [isConnected]);

  const statusIconStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: statusIconScale.value },
      { rotate: `${wiggleRotation.value}deg` },
    ],
    opacity: pulseOpacity.value,
  }));

  const cardScale = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // 处理输入框动画
  const handleInputFocus = useCallback(() => {
    setIsFocused(true);
    inputScale.value = withSpring(1.02, {
      damping: 15,
      stiffness: 120,
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleInputBlur = useCallback(() => {
    setIsFocused(false);
    inputScale.value = withSpring(1);
  }, []);

  // 添加新的动画样式
  const inputContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: inputScale.value }],
  }));

  const badgeStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${badgeRotation.value}deg` }],
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  const handlePress = useCallback(async () => {
    scale.value = withSequence(
      withSpring(0.97, { damping: 15, stiffness: 120 }),
      withSpring(1, { damping: 15, stiffness: 120 })
    );
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }, [onPress]);

  return (
    <CopilotStep text="此处显示当前连接状态和IP地址" order={3} name="status">
      <Animated.View
        style={cardScale}
        entering={FadeIn.delay(200).springify().duration(500)}
      >
        <TouchableOpacity
          onPress={handlePress}
          className="w-full active:opacity-90"
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
                            isConnected
                              ? "bg-emerald-500/90 hover:bg-emerald-500"
                              : "bg-rose-500/90 hover:bg-rose-500"
                          }
                        `}
                      >
                        {isConnected ? "已连接" : "未连接"}
                      </Badge>
                    </Animated.View>
                  </View>
                </View>

                <Animated.View
                  style={badgeStyle}
                  entering={SlideInUp.delay(300).springify()}
                >
                  <Badge
                    variant="outline"
                    className="
                      px-3 py-1 rounded-full border-2
                      bg-primary/5 dark:bg-primary/10
                      border-primary/20 dark:border-primary/30
                    "
                  >
                    <View className="flex-row items-center space-x-1.5">
                      {activeMode === "hotspot" ? (
                        <Signal size={14} className="text-primary" />
                      ) : (
                        <Server size={14} className="text-primary" />
                      )}
                      <Text className="text-sm font-medium text-primary">
                        {activeMode === "hotspot" ? "热点模式" : "局域网模式"}
                      </Text>
                    </View>
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
                        onChangeText={handleIpChange}
                        onFocus={handleInputFocus}
                        onBlur={handleInputBlur}
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
                      onChangeText={handlePortChange}
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
};
