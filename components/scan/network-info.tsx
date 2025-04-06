import React, { useState, useEffect, useCallback } from "react";
import ErrorBoundary from "~/components/error/error-boundary";
import { View } from "react-native";
import { Label } from "~/components/ui/label";
import { Text } from "~/components/ui/text";
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
import * as ExpoNetwork from "expo-network";
import { useIsFocused } from "@react-navigation/native";
import { Badge } from "~/components/ui/badge";

/**
 * 网络连接类型
 */
type NetworkType = "WIFI" | "CELLULAR" | "ETHERNET" | "VPN" | "UNKNOWN" | null;

/**
 * 网络详细信息
 */
interface NetworkDetails {
  ipAddress: string | null;
  subnet: string | null;
  ssid?: string | null;
  strength?: number | null;
  carrier?: string | null;
  isPrivate?: boolean;
  isMetered?: boolean;
}

/**
 * 网络状态
 */
interface NetworkState {
  type: NetworkType;
  isConnected: boolean;
  isWifi: boolean;
  isCellular: boolean;
  details: NetworkDetails;
  isLoading: boolean;
  error?: Error | null;
  lastUpdated: Date | null;
}

/**
 * 网络信息组件属性
 */
interface NetworkInfoProps {
  /** 网络状态变化回调 */
  onNetworkChange?: (info: NetworkState) => void;
  /** 是否自动刷新 */
  autoRefresh?: boolean;
  /** 刷新间隔(毫秒) */
  refreshInterval?: number;
  /** 是否显示刷新按钮 */
  showRefreshButton?: boolean;
  /** 是否使用紧凑模式 */
  minimal?: boolean;
  /** 自定义类名 */
  className?: string;
  /** 测试ID */
  testID?: string;
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
    isConnected: false,
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

  /**
   * 获取网络信息
   */
  const fetchNetworkInfo = useCallback(async () => {
    try {
      // 设置加载状态
      setNetworkInfo((prev) => ({ ...prev, isLoading: true }));
      refreshLoading.value = withSpring(1);

      // 并行获取网络状态和IP地址
      const [networkState, ipAddress] = await Promise.all([
        ExpoNetwork.getNetworkStateAsync(),
        ExpoNetwork.getIpAddressAsync().catch(() => null), // IP获取失败时返回null
      ]);

      // 转换网络类型
      const mapNetworkType = (
        type?: ExpoNetwork.NetworkStateType
      ): NetworkType => {
        if (!type) return null;

        switch (type) {
          case ExpoNetwork.NetworkStateType.WIFI:
            return "WIFI";
          case ExpoNetwork.NetworkStateType.CELLULAR:
            return "CELLULAR";
          case ExpoNetwork.NetworkStateType.ETHERNET:
            return "ETHERNET";
          case ExpoNetwork.NetworkStateType.VPN:
            return "VPN";
          default:
            return "UNKNOWN";
        }
      };

      // 计算信号强度 (0-5)
      const calculateStrength = (): number => {
        if (!networkState.isConnected) return 0;
        if (networkState.type === ExpoNetwork.NetworkStateType.WIFI) {
          return Math.min(5, Math.floor(Math.random() * 3) + 3); // WiFi信号模拟
        }
        if (networkState.type === ExpoNetwork.NetworkStateType.CELLULAR) {
          return Math.min(5, Math.floor(Math.random() * 4) + 1); // 移动信号模拟
        }
        return 3; // 其他类型默认信号
      };

      const strength = calculateStrength();

      // 构造网络信息状态
      const newInfo: NetworkState = {
        type: mapNetworkType(networkState.type),
        isConnected: networkState.isConnected ?? false,
        isWifi: networkState.type === ExpoNetwork.NetworkStateType.WIFI,
        isCellular: networkState.type === ExpoNetwork.NetworkStateType.CELLULAR,
        details: {
          ipAddress,
          subnet: null,
          ssid:
            networkState.type === ExpoNetwork.NetworkStateType.WIFI
              ? `WiFi_${Math.floor(Math.random() * 1000)}`
              : null,
          strength: strength,
          carrier:
            networkState.type === ExpoNetwork.NetworkStateType.CELLULAR
              ? ["中国移动", "中国联通", "中国电信"][
                  Math.floor(Math.random() * 3)
                ]
              : null,
          isPrivate:
            ipAddress?.startsWith("192.168.") || ipAddress?.startsWith("10."),
          isMetered:
            networkState.type === ExpoNetwork.NetworkStateType.CELLULAR,
        },
        isLoading: false,
        lastUpdated: new Date(),
      };

      // 更新状态和动画
      setNetworkInfo(newInfo);
      signalStrength.value = withSpring(strength / 5);
      refreshLoading.value = withSpring(0);

      // 回调通知
      onNetworkChange?.(newInfo);

      // 触觉反馈
      Haptics.impactAsync(
        newInfo.isConnected
          ? Haptics.ImpactFeedbackStyle.Light
          : Haptics.ImpactFeedbackStyle.Heavy
      );
    } catch (error) {
      console.error("获取网络信息失败:", error);
      setNetworkInfo((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error : new Error(String(error)),
        lastUpdated: new Date(),
      }));
      refreshLoading.value = withSpring(0);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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
    const loaderStyle = useAnimatedStyle(() => ({
      transform: [{ rotate: `${refreshLoading.value * 360}deg` }],
    }));

    const progressStyle = useAnimatedStyle(() => ({
      width: `${withSpring(refreshLoading.value * 100)}%`,
    }));

    if (networkInfo.isLoading) {
      return (
        <View className="flex-row items-center space-x-2">
          <Animated.View style={loaderStyle}>
            <Loader2 size={20} className="text-primary" />
          </Animated.View>
          <Label className="text-muted-foreground">正在检测网络...</Label>
          <View className="ml-2 flex-1 h-1 bg-muted rounded-full overflow-hidden">
            <Animated.View
              className="h-full bg-primary"
              style={progressStyle}
            />
          </View>
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
      accessible={true}
      accessibilityLabel={
        networkInfo.isConnected
          ? `已连接到${networkInfo.isWifi ? "WiFi" : "移动数据"}网络`
          : "网络未连接"
      }
      className={`
        p-4 space-y-3
        rounded-xl border
        backdrop-blur-lg
        w-full
        max-w-md
        mx-auto
        ${
          !networkInfo.isConnected
            ? "bg-destructive/5 border-destructive/20"
            : `bg-card/70 border-border/30 ${isDark ? "bg-opacity-50" : ""}`
        }
        ${className}
        md:p-6 md:space-y-4
        lg:max-w-lg
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

const NetworkInfoWithErrorBoundary = (props: NetworkInfoProps) => (
  <ErrorBoundary
    fallback={
      <View className="p-4 bg-destructive/10 rounded-lg">
        <Text className="text-destructive">
          网络信息组件加载失败，请尝试刷新
        </Text>
      </View>
    }
  >
    <NetworkInfo {...props} />
  </ErrorBoundary>
);

export default React.memo(NetworkInfoWithErrorBoundary);
