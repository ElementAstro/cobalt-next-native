import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  TouchableOpacity,
  useWindowDimensions,
  ScrollView,
} from "react-native";
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
import {
  useAnimatedStyle,
  withTiming,
  useSharedValue,
  withSpring,
  Easing,
  FadeIn,
  FadeOut,
  SlideInUp,
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

const NetworkSpeedSchema = z.object({
  download: z.number().min(0),
  upload: z.number().min(0),
  quality: z.number().min(0).max(100),
});

interface NetworkInfoModalProps {
  visible: boolean;
  onClose: () => void;
}

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

  const fadeAnim = useSharedValue(0);
  const slideAnim = useSharedValue(-300);
  const buttonScale = useSharedValue(1);
  const refreshIconRotate = useSharedValue(0);

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

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

  const chartOptions = {
    tooltip: {
      trigger: "axis",
      backgroundColor: isDarkColorScheme ? "rgba(0,0,0,0.8)" : "rgba(255,255,255,0.9)",
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
          color: isDarkColorScheme ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)",
        },
      },
      axisLabel: {
        color: isDarkColorScheme ? "rgba(255,255,255,0.8)" : "rgba(0,0,0,0.8)",
        fontSize: 10,
      },
    },
    yAxis: {
      type: "value",
      splitLine: {
        lineStyle: {
          color: isDarkColorScheme ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
        },
      },
      axisLabel: {
        color: isDarkColorScheme ? "rgba(255,255,255,0.8)" : "rgba(0,0,0,0.8)",
      },
    },
    series: [
      {
        name: "下载速度 (Mbps)",
        type: "line",
        data: networkHistory.map((item) => item.download),
        smooth: true,
        symbol: "circle",
        symbolSize: 6,
        lineStyle: {
          width: 3,
          color: "#3b82f6",
        },
        itemStyle: {
          color: "#3b82f6",
        },
        areaStyle: {
          color: isDarkColorScheme 
            ? "rgba(59,130,246,0.15)" 
            : "rgba(59,130,246,0.1)",
        },
      },
      {
        name: "上传速度 (Mbps)",
        type: "line",
        data: networkHistory.map((item) => item.upload),
        smooth: true,
        symbol: "circle",
        symbolSize: 6,
        lineStyle: {
          width: 3,
          color: "#10b981",
        },
        itemStyle: {
          color: "#10b981",
        },
        areaStyle: {
          color: isDarkColorScheme 
            ? "rgba(16,185,129,0.15)" 
            : "rgba(16,185,129,0.1)",
        },
      },
    ],
  };

  const handleSpeedTest = async () => {
    try {
      setIsLoading(true);
      setError(null);
      buttonScale.value = withSpring(0.95);
      await Haptics.impactAsync();
      
      const result = await testNetworkSpeed();
      const validated = NetworkSpeedSchema.parse(result);

      buttonScale.value = withSpring(1);
      toast.success("网络速度测试完成");
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      buttonScale.value = withSpring(1);
      setError(err instanceof Error ? err.message : "网络测试失败");
      toast.error("网络速度测试失败");
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      refreshIconRotate.value = withTiming(refreshIconRotate.value + 360, {
        duration: 1000,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
      });
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await fetchNetworkInfo();
      toast.success("刷新成功");
    } catch (error) {
      toast.error("刷新失败");
    }
  };

  const NetworkStatusIndicator = () => (
    <View className="flex-row items-center space-x-3 bg-card/60 dark:bg-gray-800/60 p-4 rounded-2xl backdrop-blur-lg border border-border/50">
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
    </View>
  );

  const NetworkDataCard = ({ 
    icon: Icon, 
    title, 
    value, 
    suffix,
    colorClass = "text-blue-500",
  }: {
    icon: any;
    title: string;
    value: string | number;
    suffix?: string;
    colorClass?: string;
  }) => (
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
  );

  return (
    <Dialog open={visible} onOpenChange={onClose}>
      <DialogContent
        className="w-full min-w-full bg-background/95 dark:bg-gray-900/95 rounded-t-3xl native:rounded-t-[32px] native:max-h-[94%] native:min-h-[60%] backdrop-blur-xl border-t border-border/50"
        style={modalStyle}
      >
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            padding: 16,
            gap: 20,
          }}
        >
          {error && (
            <Alert 
              className="rounded-2xl bg-destructive/10 border-destructive/20" 
              variant="destructive"
              icon={AlertCircle}
            >
              <AlertTitle className="font-semibold">出错了</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
              <TouchableOpacity
                className="absolute right-3 top-3"
                onPress={() => setError(null)}
              >
                <Text className="text-destructive">✕</Text>
              </TouchableOpacity>
            </Alert>
          )}

          <NetworkStatusIndicator />

          {/* 网络信息卡片组 */}
          <View className="space-y-6">
            <View className="flex-row flex-wrap gap-3">
              <NetworkDataCard
                icon={Wifi}
                title="IP 地址"
                value={ipAddress || "加载中..."}
                colorClass="text-blue-500"
              />
              <NetworkDataCard
                icon={Signal}
                title="网络类型"
                value={networkState?.type || "未知"}
                colorClass="text-emerald-500"
              />
              <NetworkDataCard
                icon={Gauge}
                title="飞行模式"
                value={isAirplaneMode ? "开启" : "关闭"}
                colorClass="text-amber-500"
              />
            </View>

            {/* 网络速度卡片组 */}
            {networkSpeed && (
              <View className="space-y-4">
                <View className="flex-row items-center justify-between">
                  <Text className="text-lg font-semibold text-foreground">
                    网络速度
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowHistory(!showHistory)}
                    className="flex-row items-center space-x-1 py-1 px-2 rounded-lg bg-muted/50"
                  >
                    <Text className="text-sm text-muted-foreground">
                      {showHistory ? "隐藏历史" : "查看历史"}
                    </Text>
                    <ChevronRight size={16} className="text-muted-foreground" />
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
              </View>
            )}

            {/* 操作按钮组 */}
            <View className="space-y-3 pt-2">
              <Button
                className="w-full h-12 rounded-xl bg-primary/90 hover:bg-primary active:scale-98 transition-all duration-200"
                onPress={handleSpeedTest}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 size={20} className="animate-spin text-primary-foreground" />
                ) : (
                  <>
                    <RefreshCw size={18} className="mr-2 text-primary-foreground" />
                    <Text className="text-primary-foreground font-medium">
                      测试网络速度
                    </Text>
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                className="w-full h-12 rounded-xl border-2 hover:bg-secondary/80 active:scale-98 transition-all duration-200"
                onPress={handleRefresh}
              >
                <History size={18} className="mr-2 text-foreground" />
                <Text className="text-foreground font-medium">
                  刷新网络信息
                </Text>
              </Button>
            </View>
          </View>

          {/* 网络历史图表 */}
          {showHistory && networkHistory.length > 0 && (
            <View className="space-y-4 pt-4">
              <Text className="text-lg font-semibold text-foreground mb-2">
                网络历史
              </Text>
              <View className="h-64 w-full bg-card/60 dark:bg-gray-800/60 rounded-2xl p-4 backdrop-blur-lg border border-border/50">
                <RNEChartsPro
                  height={220}
                  option={chartOptions}
                  backgroundColor="transparent"
                />
              </View>
            </View>
          )}
        </ScrollView>
      </DialogContent>
    </Dialog>
  );
};
