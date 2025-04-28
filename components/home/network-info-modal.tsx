import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  View,
  TouchableOpacity,
  useWindowDimensions,
  ScrollView,
  Platform,
  AccessibilityInfo,
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
  Copy,
  Smartphone,
  Activity,
  ArrowRight,
  BarChart3,
  Cpu,
  LineChart,
  Zap,
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
  withDelay,
  cancelAnimation,
  SlideInDown,
  SlideOutDown,
  Layout,
  LinearTransition,
  BounceIn,
  FlipInYLeft,
  ZoomIn,
  Extrapolate,
  runOnJS,
} from "react-native-reanimated";
import { useNetworkStore } from "~/stores/useNetworkStore";
import { useColorScheme } from "~/lib/useColorScheme";
import RNEChartsPro from "react-native-echarts-pro";
import { Dialog, DialogContent } from "~/components/ui/dialog";
import { Progress } from "~/components/ui/progress";
import { Text } from "~/components/ui/text";
import { Alert, AlertTitle, AlertDescription } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";
import { toast } from "sonner-native";
import { z } from "zod";
import * as Haptics from "expo-haptics";
import { Button } from "~/components/ui/button";

// 优化数据验证
const NetworkSpeedSchema = z.object({
  download: z.number().min(0),
  upload: z.number().min(0),
  quality: z.number().min(0).max(100),
});

// 创建动画组件
const AnimatedBadge = Animated.createAnimatedComponent(Badge);
const AnimatedProgress = Animated.createAnimatedComponent(Progress);
const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

interface NetworkDataCardProps {
  icon: LucideIcon;
  title: string;
  value: string | number;
  colorClass: string;
  suffix?: string;
  delay?: number;
  isLoading?: boolean;
  isError?: boolean;
  onPress?: () => void;
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
    isLoading = false,
    isError = false,
    onPress,
  }: NetworkDataCardProps) => {
    const scale = useSharedValue(1);
    const shimmerPosition = useSharedValue(-1);
    const [isScreenReaderEnabled, setIsScreenReaderEnabled] = useState(false);
    
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
    
    // 启动闪光动画
    useEffect(() => {
      if (isLoading) {
        shimmerPosition.value = withRepeat(
          withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
          -1,
          false
        );
      }
      
      return () => {
        cancelAnimation(shimmerPosition);
        cancelAnimation(scale);
      };
    }, [isLoading]);

    const handlePress = useCallback(() => {
      scale.value = withSequence(
        withSpring(0.95, {
          damping: 10,
          stiffness: 200,
        }),
        withSpring(1)
      );
      
      if (Platform.OS !== "web" && !isScreenReaderEnabled) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      
      onPress?.();
    }, [onPress, isScreenReaderEnabled]);

    const cardStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }));
    
    const shimmerStyle = useAnimatedStyle(() => ({
      transform: [{ 
        translateX: interpolate(
          shimmerPosition.value, 
          [-1, 1], 
          [-100, 150],
          Extrapolate.CLAMP
        ) 
      }],
    }));

    return (
      <Animated.View
        entering={SlideInUp.delay(delay).springify()}
        style={cardStyle}
        layout={LinearTransition.springify()}
        className="relative"
        accessible={true}
        accessibilityLabel={`${title}: ${isLoading ? '加载中' : isError ? '加载错误' : `${value}${suffix || ""}`}`}
        accessibilityRole="button"
        accessibilityHint={onPress ? "点击查看详情" : undefined}
        accessibilityState={{
          busy: isLoading,
          disabled: isError
        }}
      >
        <TouchableOpacity 
          onPress={handlePress} 
          disabled={isLoading || (!onPress && !isError)}
          className="active:opacity-90"
        >
          <View className={`
            flex-1 min-w-[140px] p-4 rounded-2xl backdrop-blur-lg 
            ${isError 
              ? "bg-destructive/10 border border-destructive/40" 
              : "bg-card/60 dark:bg-gray-800/60 border border-border/50"
            }
            ${isLoading ? "overflow-hidden" : ""}
          `}>
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center space-x-2">
                {isLoading ? (
                  <Skeleton className="h-5 w-5 rounded-full" />
                ) : (
                  <Icon size={18} className={isError ? "text-destructive" : colorClass} />
                )}
                {isLoading ? (
                  <Skeleton className="h-4 w-20 rounded-md" />
                ) : (
                  <Text className={`text-sm ${isError ? "text-destructive/90" : "text-muted-foreground"}`}>{title}</Text>
                )}
              </View>
              
              {onPress && !isLoading && !isError && (
                <ChevronRight size={14} className="text-muted-foreground/50" />
              )}
            </View>
            
            {isLoading ? (
              <View className="w-full">
                <Skeleton className="h-6 w-28 rounded-md" />
                <Animated.View
                  style={shimmerStyle}
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-card/40 to-transparent"
                />
              </View>
            ) : isError ? (
              <View className="flex-row items-center space-x-1">
                <AlertCircle size={14} className="text-destructive" />
                <Text className="text-base text-destructive">加载失败</Text>
              </View>
            ) : (
              <Text className={`text-lg font-semibold ${colorClass}`}>
                {value}
                {suffix && <Text className="text-sm ml-1">{suffix}</Text>}
              </Text>
            )}
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
  
  // 状态管理
  const [error, setError] = useState<string | null>(null);
  const [isScreenReaderEnabled, setIsScreenReaderEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'info' | 'speed'>('info');
  const errorTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasAttemptedLoad = useRef(false);
  const loadingTimeout = useRef<NodeJS.Timeout | null>(null);

  // 动画值
  const fadeAnim = useSharedValue(0);
  const slideAnim = useSharedValue(-300);
  const buttonScale = useSharedValue(1);
  const refreshIconRotate = useSharedValue(0);
  const infoTabScale = useSharedValue(1);
  const speedTabScale = useSharedValue(1);
  const cardPulse = useSharedValue(1);
  const speedIndicatorScale = useSharedValue(0);
  const speedTestProgress = useSharedValue(0);
  const statusQualityProgress = useSharedValue(0);
  
  // 初始进入动画
  useEffect(() => {
    if (visible) {
      // 开始加载数据
      if (!hasAttemptedLoad.current) {
        setIsLoading(true);
        hasAttemptedLoad.current = true;
        
        // 设置超时，确保加载状态至少显示一段时间
        loadingTimeout.current = setTimeout(() => {
          setIsLoading(false);
        }, 1500);
        
        // 加载数据
        fetchNetworkInfo().catch((err) => {
          console.error("Failed to fetch network info:", err);
          setError("网络信息加载失败，请重试");
          setIsLoading(false);
        });
      }
      
      // 打开动画
      fadeAnim.value = withTiming(1, { duration: 300 });
      slideAnim.value = withSpring(0, {
        damping: 15,
        stiffness: 100,
      });
      
      // 启动卡片脉冲动画 
      cardPulse.value = withRepeat(
        withSequence(
          withTiming(1.02, { duration: 1500, easing: Easing.inOut(Easing.quad) }),
          withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.quad) })
        ),
        -1,
        true
      );
    } else {
      // 关闭动画
      fadeAnim.value = withTiming(0, { duration: 300 });
      slideAnim.value = withSpring(-300, {
        damping: 15,
        stiffness: 100,
      });
      
      // 重置状态
      hasAttemptedLoad.current = false;
      
      // 清理超时
      if (loadingTimeout.current) {
        clearTimeout(loadingTimeout.current);
      }
      
      // 取消动画
      cancelAnimation(cardPulse);
    }
  }, [visible]);
  
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

  // 网络质量进度条动画
  useEffect(() => {
    if (!isLoading && networkSpeed?.quality !== undefined) {
      statusQualityProgress.value = withTiming(networkSpeed.quality / 100, { 
        duration: 1000,
        easing: Easing.out(Easing.cubic)
      });
    } else {
      statusQualityProgress.value = 0;
    }
    
    return () => {
      cancelAnimation(statusQualityProgress);
    };
  }, [isLoading, networkSpeed?.quality]);
  
  // 网络速度测试进度动画
  useEffect(() => {
    if (isTestingSpeed) {
      speedTestProgress.value = withSequence(
        withTiming(0.3, { duration: 500, easing: Easing.out(Easing.quad) }),
        withTiming(0.6, { duration: 800, easing: Easing.out(Easing.cubic) }),
        withTiming(0.9, { duration: 1200, easing: Easing.inOut(Easing.quad) })
      );
      
      speedIndicatorScale.value = withRepeat(
        withSequence(
          withTiming(1.2, { duration: 600, easing: Easing.out(Easing.quad) }),
          withTiming(1, { duration: 600, easing: Easing.in(Easing.quad) })
        ),
        -1,
        true
      );
    } else {
      speedTestProgress.value = withTiming(0, { duration: 300 });
      speedIndicatorScale.value = withTiming(0, { duration: 300 });
    }
    
    return () => {
      cancelAnimation(speedTestProgress);
      cancelAnimation(speedIndicatorScale);
    };
  }, [isTestingSpeed]);

  // 缓存重复使用的图表配置
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
          new Date(item.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
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
          formatter: '{value} Mbps',
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
          symbol: 'circle',
          symbolSize: 6,
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [{
                  offset: 0, 
                  color: isDarkColorScheme ? 'rgba(59,130,246,0.4)' : 'rgba(59,130,246,0.2)'
              }, {
                  offset: 1, 
                  color: isDarkColorScheme ? 'rgba(59,130,246,0.1)' : 'rgba(59,130,246,0.05)'
              }]
            }
          },
        },
        {
          name: "上传速度 (Mbps)",
          type: "line",
          smooth: true,
          data: networkHistory.map((item) => item.upload),
          lineStyle: { width: 2 },
          itemStyle: { color: "#10b981" },
          symbol: 'circle',
          symbolSize: 6,
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [{
                  offset: 0, 
                  color: isDarkColorScheme ? 'rgba(16,185,129,0.4)' : 'rgba(16,185,129,0.2)'
              }, {
                  offset: 1, 
                  color: isDarkColorScheme ? 'rgba(16,185,129,0.1)' : 'rgba(16,185,129,0.05)'
              }]
            }
          },
        },
      ],
    }),
    [networkHistory, isDarkColorScheme]
  );

  // 性能优化：使用 useCallback 包装事件处理器
  const handleRefresh = useCallback(async () => {
    try {
      setIsLoading(true);
      buttonScale.value = withSequence(withSpring(0.9), withSpring(1));

      refreshIconRotate.value = withSequence(
        withTiming(360, { duration: 1000 }),
        withTiming(0, { duration: 0 })
      );

      if (Platform.OS !== "web" && !isScreenReaderEnabled) {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      
      await fetchNetworkInfo();
      
      // 成功提示
      toast.success("网络信息已更新");
      
      // 延时关闭加载状态，确保有足够的视觉反馈
      setTimeout(() => setIsLoading(false), 500);
    } catch (error) {
      console.error("刷新网络信息失败:", error);
      setError("网络信息刷新失败，请检查网络连接");
      setIsLoading(false);
    }
  }, [fetchNetworkInfo, isScreenReaderEnabled]);

  const handleSpeedTest = useCallback(async () => {
    if (isTestingSpeed) return;

    try {
      buttonScale.value = withSequence(withSpring(0.9), withSpring(1));

      if (Platform.OS !== "web" && !isScreenReaderEnabled) {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      
      setActiveTab('speed');
      await testNetworkSpeed();
      
      // 测速完成后的触觉反馈
      if (Platform.OS !== "web" && !isScreenReaderEnabled) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error("网络测速失败:", error);
      setError("网络测速失败，请重试");
    }
  }, [isTestingSpeed, testNetworkSpeed, isScreenReaderEnabled]);
  
  // 标签切换处理
  const handleTabChange = useCallback((tab: 'info' | 'speed') => {
    if (tab === activeTab) return;
    
    // 标签动画
    if (tab === 'info') {
      infoTabScale.value = withSequence(
        withTiming(0.95, { duration: 100 }),
        withTiming(1.05, { duration: 100 }),
        withTiming(1, { duration: 150 })
      );
    } else {
      speedTabScale.value = withSequence(
        withTiming(0.95, { duration: 100 }),
        withTiming(1.05, { duration: 100 }),
        withTiming(1, { duration: 150 })
      );
    }
    
    // 触觉反馈
    if (Platform.OS !== "web" && !isScreenReaderEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    setActiveTab(tab);
  }, [activeTab, isScreenReaderEnabled]);
  
  // 复制IP地址到剪贴板
  const copyIpAddress = useCallback(() => {
    if (!ipAddress) return;
    
    // 这里会有实际复制到剪贴板的代码
    // 示例: Clipboard.setString(ipAddress);
    
    // 触觉反馈
    if (Platform.OS !== "web" && !isScreenReaderEnabled) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    
    // 通知提示
    toast.success("已复制", {
      description: `IP地址：${ipAddress}`,
    });
  }, [ipAddress, isScreenReaderEnabled]);

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
  
  const cardPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardPulse.value }],
  }));
  
  const infoTabStyle = useAnimatedStyle(() => ({
    transform: [{ scale: infoTabScale.value }],
    opacity: activeTab === 'info' ? withTiming(1) : withTiming(0.7),
  }));
  
  const speedTabStyle = useAnimatedStyle(() => ({
    transform: [{ scale: speedTabScale.value }],
    opacity: activeTab === 'speed' ? withTiming(1) : withTiming(0.7),
  }));
  
  const speedIndicatorStyle = useAnimatedStyle(() => ({
    transform: [{ scale: speedIndicatorScale.value }],
    opacity: isTestingSpeed ? withTiming(1) : withTiming(0),
  }));
  
  const progressStyle = useAnimatedStyle(() => ({
    width: `${speedTestProgress.value * 100}%`,
  }));
  
  const networkQualityStyle = useAnimatedStyle(() => ({
    width: `${statusQualityProgress.value * 100}%`
  }));

  // 错误处理和自动重试
  useEffect(() => {
    if (error) {
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
      
      // 3秒后自动清除错误
      errorTimeoutRef.current = setTimeout(() => setError(null), 5000);
    }
    
    return () => {
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
    };
  }, [error]);
  
  // 清理资源
  useEffect(() => {
    return () => {
      // 清理所有动画和超时
      cancelAnimation(fadeAnim);
      cancelAnimation(slideAnim);
      cancelAnimation(buttonScale);
      cancelAnimation(refreshIconRotate);
      cancelAnimation(cardPulse);
      cancelAnimation(infoTabScale);
      cancelAnimation(speedTabScale);
      
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
      
      if (loadingTimeout.current) {
        clearTimeout(loadingTimeout.current);
      }
    };
  }, []);

  // 网络状态指示器组件
  const NetworkStatusIndicator = () => (
    <Animated.View
      style={cardPulseStyle}
      className="mb-4 relative overflow-hidden"
    >
      {isLoading ? (
        // 骨架屏加载状态
        <View className="flex-row items-center space-x-3 bg-card/60 dark:bg-gray-800/60 p-4 rounded-2xl backdrop-blur-lg border border-border/50">
          <Skeleton className="h-8 w-8 rounded-full" />
          <View className="flex-1">
            <Skeleton className="h-5 w-32 rounded-md mb-2" />
            <Skeleton className="h-2 w-full rounded-md" />
          </View>
          <Skeleton className="h-6 w-20 rounded-full" />
        </View>
      ) : (
        <Animated.View
          entering={FadeIn.duration(500).springify()}
          className="flex-row items-center space-x-3 bg-card/60 dark:bg-gray-800/60 p-4 rounded-2xl backdrop-blur-lg border border-border/50"
        >
          <View className="relative">
            {networkState?.isConnected ? (
              <Wifi size={24} className="text-emerald-500" />
            ) : (
              <WifiOff size={24} className="text-rose-500" />
            )}
            
            {networkState?.isConnected && (
              <Animated.View 
                style={speedIndicatorStyle}
                className="absolute -top-1 -right-1"
              >
                <View className="bg-emerald-500 rounded-full w-3 h-3" />
              </Animated.View>
            )}
          </View>
          
          <View className="flex-1">
            <Text className="text-base font-medium text-foreground mb-1">
              {networkState?.type || "未知网络"}
            </Text>
            
            {/* 自定义进度条 */}
            <View className="h-1.5 w-full rounded-full bg-muted/30 overflow-hidden">
              <Animated.View 
                style={networkQualityStyle}
                className={`h-full rounded-full ${
                  (networkSpeed?.quality || 0) > 70
                    ? "bg-emerald-500"
                    : "bg-amber-500"
                }`}
              />
            </View>
          </View>
          
          <AnimatedBadge
            variant={networkState?.isConnected ? "default" : "destructive"}
            entering={ZoomIn.springify()}
            className="rounded-full px-3"
          >
            <Text className="text-current">
              {networkState?.isConnected ? "已连接" : "已断开"}
            </Text>
          </AnimatedBadge>
        </Animated.View>
      )}
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
          accessibilityLabel="网络信息面板"
        >
          {/* 标题栏 */}
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center space-x-3">
              <Signal size={24} className="text-primary" />
              <Text className="text-xl font-bold text-primary">网络信息</Text>
            </View>
            
            <View className="flex-row space-x-2">
              {ipAddress && (
                <AnimatedTouchable
                  style={buttonAnimStyle}
                  onPress={copyIpAddress}
                  className="p-2 rounded-full bg-primary/10 active:bg-primary/20"
                  disabled={isLoading || !ipAddress}
                  accessibilityLabel="复制IP地址"
                  accessibilityRole="button"
                >
                  <Copy size={20} className="text-primary" />
                </AnimatedTouchable>
              )}
              
              <AnimatedTouchable
                style={buttonAnimStyle}
                onPress={handleRefresh}
                className="p-2 rounded-full bg-primary/10 active:bg-primary/20"
                accessibilityLabel="刷新网络信息"
                accessibilityRole="button"
                accessibilityState={{ busy: isLoading }}
              >
                <Animated.View style={refreshIconStyle}>
                  {isLoading ? (
                    <Loader2 size={20} className="text-primary animate-spin" />
                  ) : (
                    <RefreshCw size={20} className="text-primary" />
                  )}
                </Animated.View>
              </AnimatedTouchable>
            </View>
          </View>

          {/* 错误提示 */}
          {error && (
            <Animated.View
              entering={SlideInUp.springify()}
              exiting={SlideOutDown}
              className="mb-4"
            >
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle className="font-semibold">出错了</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
                <View className="mt-2">
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    onPress={() => setError(null)}
                  >
                    关闭
                  </Button>
                </View>
              </Alert>
            </Animated.View>
          )}

          {/* 网络状态指示器 */}
          <NetworkStatusIndicator />
          
          {/* 选项卡 */}
          <View className="flex-row items-center p-1 mb-4 bg-muted/50 rounded-full">
            <AnimatedTouchable 
              style={infoTabStyle}
              onPress={() => handleTabChange('info')}
              className={`flex-1 py-2 rounded-full flex-row items-center justify-center space-x-2 ${activeTab === 'info' ? 'bg-card shadow' : ''}`}
              accessibilityRole="tab"
              accessibilityLabel="基本信息标签"
              accessibilityState={{ selected: activeTab === 'info' }}
            >
              <Cpu size={16} className={activeTab === 'info' ? "text-primary" : "text-muted-foreground"} />
              <Text className={activeTab === 'info' ? "text-sm font-medium text-primary" : "text-sm text-muted-foreground"}>
                基本信息
              </Text>
            </AnimatedTouchable>
            
            <AnimatedTouchable 
              style={speedTabStyle}
              onPress={() => handleTabChange('speed')}
              className={`flex-1 py-2 rounded-full flex-row items-center justify-center space-x-2 ${activeTab === 'speed' ? 'bg-card shadow' : ''}`}
              accessibilityRole="tab"
              accessibilityLabel="网络速度标签"
              accessibilityState={{ selected: activeTab === 'speed' }}
            >
              <Activity size={16} className={activeTab === 'speed' ? "text-primary" : "text-muted-foreground"} />
              <Text className={activeTab === 'speed' ? "text-sm font-medium text-primary" : "text-sm text-muted-foreground"}>
                网络速度
              </Text>
            </AnimatedTouchable>
          </View>

          {/* 网络信息卡片组 */}
          <Animated.View
            layout={LinearTransition.springify()}
            className="space-y-6"
          >
            {activeTab === 'info' ? (
              // 信息标签内容
              <View className="space-y-6">
                <View className="flex-row flex-wrap gap-3">
                  <NetworkDataCard
                    icon={Wifi}
                    title="IP 地址"
                    value={ipAddress || "--"}
                    colorClass="text-blue-500"
                    delay={100}
                    isLoading={isLoading}
                    onPress={copyIpAddress}
                  />
                  <NetworkDataCard
                    icon={Signal}
                    title="网络类型"
                    value={networkState?.type || "未知"}
                    colorClass="text-emerald-500"
                    delay={200}
                    isLoading={isLoading}
                  />
                  <NetworkDataCard
                    icon={Smartphone}
                    title="设备类型"
                    value={Platform.OS === 'ios' ? 'iOS' : Platform.OS === 'android' ? 'Android' : 'Web'}
                    colorClass="text-violet-500"
                    delay={300}
                    isLoading={isLoading}
                  />
                </View>
                
                {/* 网络状态详情 */}
                {!isLoading && networkState && (
                  <Animated.View 
                    entering={FadeIn.delay(400)}
                    className="p-4 bg-card/60 dark:bg-gray-800/60 rounded-2xl backdrop-blur-lg border border-border/50"
                  >
                    <View className="flex-row items-center justify-between mb-3">
                      <Text className="text-base font-semibold text-foreground">网络详情</Text>
                      <Badge variant="outline" className="px-2 py-0.5 rounded-full">
                        <Text className="text-xs">设备状态</Text>
                      </Badge>
                    </View>
                    
                    <View className="space-y-3">
                      {isAirplaneMode !== undefined && (
                        <View className="flex-row items-center justify-between">
                          <Text className="text-sm text-muted-foreground">飞行模式</Text>
                          <Badge 
                            variant={isAirplaneMode ? "secondary" : "outline"} 
                            className={`px-2 py-0.5 rounded-full ${isAirplaneMode ? 'bg-amber-500/20' : ''}`}
                          >
                            <Text className={`text-xs ${isAirplaneMode ? 'text-amber-600' : 'text-muted-foreground'}`}>
                              {isAirplaneMode ? "已开启" : "已关闭"}
                            </Text>
                          </Badge>
                        </View>
                      )}
                      
                      <View className="flex-row items-center justify-between">
                        <Text className="text-sm text-muted-foreground">连接状态</Text>
                        <Badge 
                          variant={networkState.isConnected ? "default" : "destructive"} 
                          className="px-2 py-0.5 rounded-full"
                        >
                          <Text className={`text-xs ${networkState.isConnected ? 'text-primary-foreground' : 'text-destructive-foreground'}`}>
                            {networkState.isConnected ? "已连接" : "已断开"}
                          </Text>
                        </Badge>
                      </View>
                      
                      <View className="flex-row items-center justify-between">
                        <Text className="text-sm text-muted-foreground">可连接互联网</Text>
                        <Badge 
                          variant={networkState.isInternetReachable === false ? "secondary" : "default"} 
                          className={`px-2 py-0.5 rounded-full ${networkState.isInternetReachable === false ? 'bg-rose-500/20 border-rose-500/30' : ''}`}
                        >
                          <Text className="text-xs">
                            {networkState.isInternetReachable === null 
                              ? "未知" 
                              : networkState.isInternetReachable 
                                ? "可连接" 
                                : "不可连接"
                            }
                          </Text>
                        </Badge>
                      </View>
                      
                      <View className="flex-row items-center justify-between">
                        <Text className="text-sm text-muted-foreground">连接细节</Text>
                        <Text className="text-sm font-medium text-foreground">{networkState.details?.isConnectionExpensive ? "计费网络" : "非计费网络"}</Text>
                      </View>
                    </View>
                  </Animated.View>
                )}
              </View>
            ) : (
              // 速度标签内容
              <View className="space-y-4">
                {/* 网络速度测试进度条 */}
                {isTestingSpeed && (
                  <Animated.View 
                    entering={SlideInDown.springify()}
                    exiting={SlideOutDown}
                    className="mb-2"
                  >
                    <Text className="text-sm text-muted-foreground mb-2">正在测试网络速度...</Text>
                    <View className="h-2 w-full bg-muted/30 rounded-full overflow-hidden">
                      <Animated.View
                        style={progressStyle}
                        className="h-full bg-primary rounded-full"
                      />
                    </View>
                  </Animated.View>
                )}
                
                {/* 网速测试按钮 */}
                <Button
                  variant="default"
                  size="sm"
                  onPress={handleSpeedTest}
                  disabled={isTestingSpeed}
                  className="w-full"
                  accessibilityLabel="开始测试网络速度"
                  accessibilityRole="button"
                  accessibilityHint="点击开始测试当前网络的上传和下载速度"
                >
                  {isTestingSpeed ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Zap className="h-4 w-4 mr-2" />
                  )}
                  <Text>
                    {isTestingSpeed ? "测试中..." : "开始速度测试"}
                  </Text>
                </Button>
                
                {/* 网络速度卡片 */}
                <View className="flex-row flex-wrap gap-3 mt-2">
                  <NetworkDataCard
                    icon={ArrowRight}
                    title="下载速度"
                    value={networkSpeed?.download || 0}
                    suffix="Mbps"
                    colorClass="text-blue-500"
                    isLoading={isLoading || !networkSpeed}
                    isError={!isLoading && !networkSpeed}
                  />
                  <NetworkDataCard
                    icon={ArrowRight}
                    title="上传速度"
                    value={networkSpeed?.upload || 0}
                    suffix="Mbps"
                    colorClass="text-emerald-500"
                    isLoading={isLoading || !networkSpeed}
                    isError={!isLoading && !networkSpeed}
                  />
                  <NetworkDataCard
                    icon={Signal}
                    title="网络质量"
                    value={networkSpeed?.quality || 0}
                    suffix="%"
                    colorClass="text-amber-500"
                    isLoading={isLoading || !networkSpeed}
                    isError={!isLoading && !networkSpeed}
                  />
                </View>

                {/* 历史数据图表 */}
                {!isLoading && networkHistory.length > 0 && (
                  <Animated.View
                    entering={FadeIn.delay(300)}
                    className="mt-4 p-4 rounded-2xl bg-card/60 backdrop-blur-lg border border-border/50"
                  >
                    <View className="flex-row items-center justify-between mb-3">
                      <View className="flex-row items-center space-x-2">
                        <LineChart size={16} className="text-primary" />
                        <Text className="text-base font-medium">速度历史</Text>
                      </View>
                      <Badge 
                        variant="outline" 
                        className="px-2 py-0.5 rounded-full"
                      >
                        <BarChart3 size={12} className="mr-1 text-muted-foreground" />
                        <Text className="text-xs">{networkHistory.length}项记录</Text>
                      </Badge>
                    </View>
                    
                    <RNEChartsPro
                      width={width - 64}
                      height={200}
                      option={chartOptions}
                    />
                  </Animated.View>
                )}
              </View>
            )}
          </Animated.View>
        </ScrollView>
      </DialogContent>
    </Dialog>
  );
};
