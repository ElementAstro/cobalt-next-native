import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  TouchableOpacity,
  useWindowDimensions,
  ScrollView,
} from "react-native";
import type { LucideIcon } from "lucide-react-native";
import {
  Wifi,
  Gauge,
  Signal,
  RefreshCw,
  History,
  WifiOff,
  AlertCircle,
  Loader2,
  ChevronRight,
} from "lucide-react-native";
import Animated, {
  useAnimatedStyle,
  withTiming,
  useSharedValue,
  withSpring,
  Easing,
  FadeIn,
  FadeOut,
  SlideInUp,
  withSequence,
  interpolate,
} from "react-native-reanimated";
import { useNetworkStore } from "~/stores/useNetworkStore";
import { useColorScheme } from "~/lib/useColorScheme";
import RNEChartsPro from "react-native-echarts-pro";
import { Dialog, DialogContent } from "~/components/ui/dialog";
import { Progress } from "~/components/ui/progress";
import { Text } from "~/components/ui/text";
import { Alert, AlertTitle, AlertDescription } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { toast } from "sonner-native";
import { z } from "zod";
import * as Haptics from "expo-haptics";
import { Button } from "~/components/ui/button";

// 优化数据验证
const NetworkSpeedSchema = z.object({
  download: z.number().min(0).max(1000),
  upload: z.number().min(0).max(1000),
  quality: z.number().min(0).max(100),
});

interface NetworkDataCardProps {
  icon: LucideIcon;
  title: string;
  value: string | number;
  colorClass: string;
  suffix?: string;
  delay?: number;
}

interface NetworkInfoModalProps {
  visible: boolean;
  onClose: () => void;
}

const NetworkDataCard = React.memo(
  ({
    icon: Icon,
    title,
    value,
    colorClass,
    suffix,
    delay = 0,
  }: NetworkDataCardProps) => {
    const scale = useSharedValue(1);

    const handlePress = useCallback(async () => {
      scale.value = withSequence(
        withSpring(0.95, {
          damping: 10,
          stiffness: 200,
        }),
        withSpring(1)
      );
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, []);

    const cardStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }));

    return (
      <Animated.View
        entering={SlideInUp.delay(delay).springify()}
        style={cardStyle}
        accessible={true}
        accessibilityLabel={`${title}: ${value}${suffix || ""}`}
        accessibilityRole="button"
      >
        <TouchableOpacity onPress={handlePress} className="active:opacity-90">
          <View className="flex-1 min-w-[140px] bg-card/60 dark:bg-gray-800/60 p-4 rounded-2xl backdrop-blur-lg border border-border/50">
            <View className="flex-row items-center space-x-2 mb-2">
              <Icon size={18} className={colorClass} />
              <Text className="text-sm text-muted-foreground">{title}</Text>
            </View>
            <Text className={`text-lg font-semibold ${colorClass}`}>
              {value}
              {suffix && <Text className="text-sm ml-1">{suffix}</Text>}
            </Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  }
);
export const NetworkInfoModal: React.FC<NetworkInfoModalProps> = ({
  visible,
  onClose,
}) => {
  const {
    ipAddress,
    networkState,
    isAirplaneMode,
    networkSpeed,
    isTestingSpeed,
    networkHistory,
    fetchNetworkInfo,
    testNetworkSpeed,
  } = useNetworkStore();

  const { isDarkColorScheme } = useColorScheme();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  // 动画值
  const fadeAnim = useSharedValue(0);
  const slideAnim = useSharedValue(-300);
  const buttonScale = useSharedValue(1);
  const refreshIconRotate = useSharedValue(0);
  const [error, setError] = useState<string | null>(null);

  // 缓存重复使用的值
  const chartOptions = useMemo(
    () => ({
      tooltip: {
        trigger: "axis",
        backgroundColor: isDarkColorScheme
          ? "rgba(0,0,0,0.8)"
          : "rgba(255,255,255,0.9)",
        borderRadius: 8,
        textStyle: {
          color: isDarkColorScheme ? "#fff" : "#000",
        },
      },
      legend: {
        data: ["下载速度 (Mbps)", "上传速度 (Mbps)"],
        textStyle: { color: isDarkColorScheme ? "#fff" : "#000" },
        icon: "circle",
      },
      grid: {
        top: 40,
        left: 50,
        right: 20,
        bottom: 40,
      },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: networkHistory.map((item) =>
          new Date(item.timestamp).toLocaleTimeString()
        ),
        axisLine: {
          lineStyle: {
            color: isDarkColorScheme
              ? "rgba(255,255,255,0.2)"
              : "rgba(0,0,0,0.2)",
          },
        },
        axisLabel: {
          color: isDarkColorScheme ? "#fff" : "#000",
          fontSize: 10,
        },
      },
      yAxis: {
        type: "value",
        axisLine: {
          lineStyle: {
            color: isDarkColorScheme
              ? "rgba(255,255,255,0.2)"
              : "rgba(0,0,0,0.2)",
          },
        },
        axisLabel: {
          color: isDarkColorScheme ? "#fff" : "#000",
          fontSize: 10,
        },
        splitLine: {
          lineStyle: {
            color: isDarkColorScheme
              ? "rgba(255,255,255,0.1)"
              : "rgba(0,0,0,0.1)",
          },
        },
      },
      series: [
        {
          name: "下载速度 (Mbps)",
          type: "line",
          smooth: true,
          data: networkHistory.map((item) => item.download),
          lineStyle: { width: 2 },
          itemStyle: { color: "#3b82f6" },
          areaStyle: {
            color: isDarkColorScheme
              ? "rgba(59,130,246,0.2)"
              : "rgba(59,130,246,0.1)",
          },
        },
        {
          name: "上传速度 (Mbps)",
          type: "line",
          smooth: true,
          data: networkHistory.map((item) => item.upload),
          lineStyle: { width: 2 },
          itemStyle: { color: "#10b981" },
          areaStyle: {
            color: isDarkColorScheme
              ? "rgba(16,185,129,0.2)"
              : "rgba(16,185,129,0.1)",
          },
        },
      ],
    }),
    [networkHistory, isDarkColorScheme]
  );

  // 性能优化：使用 useCallback 包装事件处理器
  const handleRefresh = useCallback(async () => {
    try {
      buttonScale.value = withSequence(withSpring(0.9), withSpring(1));

      refreshIconRotate.value = withSequence(
        withTiming(360, { duration: 1000 }),
        withTiming(0, { duration: 0 })
      );

      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await fetchNetworkInfo();
    } catch (error) {
      console.error("刷新网络信息失败:", error);
      setError("网络信息刷新失败");
    }
  }, [fetchNetworkInfo]);

  const handleSpeedTest = useCallback(async () => {
    if (isTestingSpeed) return;

    try {
      buttonScale.value = withSequence(withSpring(0.9), withSpring(1));

      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await testNetworkSpeed();
    } catch (error) {
      console.error("网络测速失败:", error);
      setError("网络测速失败");
    }
  }, [isTestingSpeed, testNetworkSpeed]);

  // 动画样式
  const modalStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: slideAnim.value }],
    opacity: fadeAnim.value,
  }));

  const buttonAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const refreshIconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${refreshIconRotate.value}deg` }],
  }));

  // 生命周期处理
  useEffect(() => {
    if (visible) {
      fadeAnim.value = withTiming(1, { duration: 300 });
      slideAnim.value = withSpring(0, {
        damping: 15,
        stiffness: 100,
      });
      fetchNetworkInfo();
    } else {
      fadeAnim.value = withTiming(0, { duration: 300 });
      slideAnim.value = withSpring(-300, {
        damping: 15,
        stiffness: 100,
      });
    }
  }, [visible, fadeAnim, slideAnim, fetchNetworkInfo]);

  // 错误处理和自动重试
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // 修改网络状态指示器组件，添加动画效果
  const cardAnimStyle = useAnimatedStyle(() => ({
    opacity: withSpring(1, { damping: 10 }),
    transform: [{ scale: withSpring(1, { damping: 10 }) }],
  }));

  const NetworkStatusIndicator = () => (
    <Animated.View
      entering={FadeIn.duration(500).springify()}
      style={cardAnimStyle}
      className="flex-row items-center space-x-3 bg-card/60 dark:bg-gray-800/60 p-4 rounded-2xl backdrop-blur-lg border border-border/50"
    >
      {networkState?.isConnected ? (
        <Wifi size={24} className="text-emerald-500" />
      ) : (
        <WifiOff size={24} className="text-rose-500" />
      )}
      <View className="flex-1">
        <Text className="text-base font-medium text-foreground mb-1">
          {networkState?.type || "未知网络"}
        </Text>
        <Progress
          value={networkSpeed?.quality || 0}
          className="h-1.5"
          indicatorClassName={`${
            (networkSpeed?.quality || 0) > 70
              ? "bg-emerald-500"
              : "bg-amber-500"
          }`}
        />
      </View>
      <Badge
        variant={networkState?.isConnected ? "default" : "destructive"}
        className="rounded-full px-3"
      >
        {networkState?.isConnected ? "已连接" : "已断开"}
      </Badge>
    </Animated.View>
  );

  return (
    <Dialog open={visible} onOpenChange={onClose}>
      <DialogContent
        className="max-w-lg p-0 gap-0 bg-background/95 backdrop-blur-xl border-border/50"
        style={modalStyle}
      >
        <ScrollView
          className="max-h-[80vh]"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16 }}
        >
          {/* 标题栏 */}
          <View className="flex-row items-center justify-between mb-6">
            <View className="flex-row items-center space-x-3">
              <Signal size={24} className="text-primary" />
              <Text className="text-xl font-bold text-primary">网络信息</Text>
            </View>
            <Animated.View style={buttonAnimStyle}>
              <TouchableOpacity
                onPress={handleRefresh}
                className="p-2 rounded-full bg-primary/10 active:bg-primary/20"
                accessibilityLabel="刷新网络信息"
                accessibilityRole="button"
              >
                <Animated.View style={refreshIconStyle}>
                  <RefreshCw size={20} className="text-primary" />
                </Animated.View>
              </TouchableOpacity>
            </Animated.View>
          </View>

          {/* 错误提示 */}
          {error && (
            <Animated.View
              entering={SlideInUp.springify()}
              exiting={FadeOut}
              className="mb-4"
            >
              <Alert variant="destructive" icon={AlertCircle}>
                <AlertTitle className="font-semibold">出错了</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
                <TouchableOpacity
                  className="absolute right-3 top-3"
                  onPress={() => setError(null)}
                >
                  <Text className="text-destructive">✕</Text>
                </TouchableOpacity>
              </Alert>
            </Animated.View>
          )}

          {/* 网络状态指示器 */}
          <NetworkStatusIndicator />

          {/* 网络信息卡片组 */}
          <Animated.View
            className="space-y-6"
            entering={SlideInUp.delay(200).springify()}
          >
            <View className="flex-row flex-wrap gap-3">
              <NetworkDataCard
                icon={Wifi}
                title="IP 地址"
                value={ipAddress || "加载中..."}
                colorClass="text-blue-500"
                delay={300}
              />
              <NetworkDataCard
                icon={Signal}
                title="网络类型"
                value={networkState?.type || "未知"}
                colorClass="text-emerald-500"
                delay={400}
              />
              <NetworkDataCard
                icon={Gauge}
                title="连接状态"
                value={networkState?.isConnected ? "已连接" : "未连接"}
                colorClass={
                  networkState?.isConnected
                    ? "text-emerald-500"
                    : "text-rose-500"
                }
                delay={500}
              />
            </View>

            {/* 网络速度测试区域 */}
            {networkSpeed && (
              <Animated.View
                entering={SlideInUp.delay(600).springify()}
                className="space-y-4"
              >
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-lg font-semibold text-foreground">
                    网络速度
                  </Text>
                  <TouchableOpacity
                    onPress={handleSpeedTest}
                    className="flex-row items-center space-x-2 px-3 py-1.5 rounded-full bg-primary/10"
                  >
                    <Text className="text-sm font-medium text-primary">
                      测试速度
                    </Text>
                    <ChevronRight size={16} className="text-primary" />
                  </TouchableOpacity>
                </View>

                <View className="flex-row flex-wrap gap-3">
                  <NetworkDataCard
                    icon={RefreshCw}
                    title="下载速度"
                    value={networkSpeed.download}
                    suffix="Mbps"
                    colorClass="text-blue-500"
                  />
                  <NetworkDataCard
                    icon={RefreshCw}
                    title="上传速度"
                    value={networkSpeed.upload}
                    suffix="Mbps"
                    colorClass="text-emerald-500"
                  />
                  <NetworkDataCard
                    icon={Signal}
                    title="网络质量"
                    value={networkSpeed.quality}
                    suffix="%"
                    colorClass="text-amber-500"
                  />
                </View>

                {/* 历史数据图表 */}
                {networkHistory.length > 0 && (
                  <View className="mt-4 p-4 rounded-2xl bg-card/60 backdrop-blur-lg border border-border/50">
                    <Text className="text-base font-medium mb-4">历史记录</Text>
                    <RNEChartsPro
                      width={width - 64}
                      height={200}
                      option={chartOptions}
                    />
                  </View>
                )}
              </Animated.View>
            )}
          </Animated.View>
        </ScrollView>
      </DialogContent>
    </Dialog>
  );
};
