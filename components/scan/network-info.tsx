import React, { useState, useEffect, useCallback } from "react";
import { View } from "react-native";
import { Label } from "~/components/ui/label";
import {
  Wifi,
  Network,
  Loader2,
  Globe,
  AlertTriangle,
} from "lucide-react-native";
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  useSharedValue,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Button } from "~/components/ui/button";
import { useColorScheme } from "nativewind";
import * as ExpoNetwork from "expo-network"; // 替换为 expo-network
import { useIsFocused } from "@react-navigation/native";
import { Badge } from "~/components/ui/badge";

// 定义网络信息状态
interface NetworkState {
  type: string | null;
  isConnected: boolean | null;
  isWifi: boolean;
  isCellular: boolean;
  details: {
    ipAddress: string | null;
    subnet: string | null;
    ssid?: string | null;
    strength?: number | null;
    carrier?: string | null;
  };
  isLoading: boolean;
  lastUpdated: Date | null;
}

interface NetworkInfoProps {
  onNetworkChange?: (info: NetworkState) => void;
  autoRefresh?: boolean;
  refreshInterval?: number;
  showRefreshButton?: boolean;
  minimal?: boolean;
  className?: string;
}

const NetworkInfo: React.FC<NetworkInfoProps> = ({
  onNetworkChange,
  autoRefresh = true,
  refreshInterval = 5000,
  showRefreshButton = true,
  minimal = false,
  className = "",
}) => {
  const [networkInfo, setNetworkInfo] = useState<NetworkState>({
    type: null,
    isConnected: null,
    isWifi: false,
    isCellular: false,
    details: {
      ipAddress: null,
      subnet: null,
    },
    isLoading: true,
    lastUpdated: null,
  });
  const isFocused = useIsFocused();
  const isDark = useColorScheme().colorScheme === "dark"; // 修复 colorScheme 未使用问题
  const signalStrength = useSharedValue(0);
  const pulseAnimation = useSharedValue(1);
  const refreshLoading = useSharedValue(0);

  // 获取网络信息
  const fetchNetworkInfo = useCallback(async () => {
    try {
      setNetworkInfo((prev) => ({ ...prev, isLoading: true }));
      refreshLoading.value = withSpring(1);

      // 替换为 expo-network API
      const networkState = await ExpoNetwork.getNetworkStateAsync();
      const ipAddress = await ExpoNetwork.getIpAddressAsync();

      // 构造网络信息状态
      const newInfo: NetworkState = {
        type: networkState.type || null,
        isConnected: networkState.isConnected || false,
        isWifi: networkState.type === "WIFI", // expo-network 使用大写
        isCellular: networkState.type === "CELLULAR", // expo-network 使用大写
        details: {
          ipAddress: ipAddress || null,
          subnet: null, // expo-network 不提供子网掩码
          ssid: null, // expo-network 不直接提供 SSID
          strength: 3, // 默认信号强度
          carrier: null, // expo-network 不提供运营商信息
        },
        isLoading: false,
        lastUpdated: new Date(),
      };

      setNetworkInfo(newInfo);
      signalStrength.value = withSpring(
        newInfo.details.strength ? newInfo.details.strength / 5 : 0
      );
      refreshLoading.value = withSpring(0);

      if (onNetworkChange) {
        onNetworkChange(newInfo);
      }

      // 触觉反馈
      if (newInfo.isConnected) {
        Haptics.selectionAsync();
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
    } catch (error) {
      console.error("Error fetching network info:", error);
      setNetworkInfo((prev) => ({
        ...prev,
        isLoading: false,
        lastUpdated: new Date(),
      }));
      refreshLoading.value = withSpring(0);
    }
  }, [onNetworkChange]);

  // 初始化和定时刷新
  useEffect(() => {
    fetchNetworkInfo();

    // expo-network 不提供事件监听，只能通过定时器模拟
    let refreshTimer: NodeJS.Timeout | null = null;
    if (autoRefresh && isFocused) {
      refreshTimer = setInterval(() => {
        fetchNetworkInfo();
      }, refreshInterval);
    }

    // 脉冲动画
    pulseAnimation.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 1000 }),
        withTiming(1, { duration: 1000 })
      ),
      -1,
      true
    );

    return () => {
      if (refreshTimer) {
        clearInterval(refreshTimer);
      }
    };
  }, [
    isFocused,
    autoRefresh,
    refreshInterval,
    fetchNetworkInfo,
    pulseAnimation,
  ]);

  // 动画样式
  const containerStyle = useAnimatedStyle(() => ({
    opacity: withSpring(networkInfo.isLoading ? 0.7 : 1),
    transform: [
      {
        scale: withSpring(refreshLoading.value ? 0.98 : 1, {
          mass: 0.5,
          damping: 10,
        }),
      },
    ],
  }));

  const signalStyle = useAnimatedStyle(() => ({
    opacity: signalStrength.value,
    transform: [
      {
        scale: pulseAnimation.value,
      },
    ],
  }));

  // 网络连接状态组件
  const ConnectionStatus = () => {
    if (networkInfo.isLoading) {
      return (
        <View className="flex-row items-center space-x-2">
          <Loader2 size={16} className="text-primary animate-spin" />
          <Label className="text-muted-foreground">正在检测网络...</Label>
        </View>
      );
    }

    if (!networkInfo.isConnected) {
      return (
        <View className="flex-row items-center space-x-2">
          <AlertTriangle size={16} className="text-destructive" />
          <Label className="text-destructive">无网络连接</Label>
        </View>
      );
    }

    return (
      <View className="flex-row items-center space-x-2">
        <Animated.View style={signalStyle}>
          {networkInfo.isWifi ? (
            <Wifi size={16} className="text-success" />
          ) : networkInfo.isCellular ? (
            <Network size={16} className="text-success" />
          ) : (
            <Globe size={16} className="text-success" />
          )}
        </Animated.View>
        <Label className="text-success">
          已{networkInfo.isWifi ? "WiFi" : "移动数据"}连接
          {networkInfo.details.ssid
            ? ` (${networkInfo.details.ssid})`
            : networkInfo.details.carrier
            ? ` (${networkInfo.details.carrier})`
            : ""}
        </Label>
      </View>
    );
  };

  // 紧凑模式显示
  if (minimal) {
    return (
      <Animated.View
        style={containerStyle}
        entering={FadeIn.duration(300)}
        className={`
          flex-row items-center justify-between
          ${className}
        `}
      >
        <ConnectionStatus />
        {showRefreshButton && !networkInfo.isLoading && (
          <Button
            variant="ghost"
            size="sm"
            onPress={fetchNetworkInfo}
            className="h-8 w-8 p-0 rounded-full"
          >
            <Loader2 size={16} className="text-muted-foreground" />
          </Button>
        )}
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={containerStyle}
      entering={FadeIn.duration(300)}
      exiting={FadeOut.duration(200)}
      className={`
        p-4 space-y-3
        rounded-xl border
        backdrop-blur-lg
        ${
          !networkInfo.isConnected
            ? "bg-destructive/5 border-destructive/20"
            : `bg-card/70 border-border/30 ${isDark ? "bg-opacity-50" : ""}`
        }
        ${className}
      `}
    >
      {/* 连接状态 */}
      <View className="flex-row justify-between items-center">
        <ConnectionStatus />
        {showRefreshButton && !networkInfo.isLoading && (
          <Button
            variant="ghost"
            size="sm"
            onPress={fetchNetworkInfo}
            className="h-8 w-8 p-0 rounded-full"
          >
            <Loader2 size={16} className="text-muted-foreground" />
          </Button>
        )}
      </View>

      {/* 网络详细信息 */}
      <View className="space-y-2">
        {networkInfo.details.ipAddress && (
          <View className="flex-row items-center justify-between">
            <Label className="text-xs text-muted-foreground">IP 地址</Label>
            <Badge variant="outline" className="bg-background/70">
              <Label className="text-xs">{networkInfo.details.ipAddress}</Label>
            </Badge>
          </View>
        )}

        {networkInfo.details.subnet && (
          <View className="flex-row items-center justify-between">
            <Label className="text-xs text-muted-foreground">子网掩码</Label>
            <Badge variant="outline" className="bg-background/70">
              <Label className="text-xs">{networkInfo.details.subnet}</Label>
            </Badge>
          </View>
        )}

        <View className="flex-row items-center justify-between">
          <Label className="text-xs text-muted-foreground">连接类型</Label>
          <Badge variant="outline" className="bg-background/70">
            <Label className="text-xs">
              {networkInfo.isWifi
                ? "WiFi"
                : networkInfo.isCellular
                ? "移动数据"
                : networkInfo.type || "未知"}
            </Label>
          </Badge>
        </View>

        {networkInfo.lastUpdated && (
          <View className="flex-row items-center justify-between">
            <Label className="text-xs text-muted-foreground">最后更新</Label>
            <Badge variant="outline" className="bg-background/70">
              <Label className="text-xs">
                {networkInfo.lastUpdated.toLocaleTimeString()}
              </Label>
            </Badge>
          </View>
        )}
      </View>
    </Animated.View>
  );
};

export default React.memo(NetworkInfo);
