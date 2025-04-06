import React, { memo, useMemo, useState, useCallback, useEffect, useRef } from "react";
import { View, Pressable, useWindowDimensions, Share, AccessibilityInfo } from "react-native";
import Animated, {
  FadeInLeft,
  Layout,
  SlideOutRight,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  interpolateColor,
  useSharedValue,
  Easing,
  withDelay,
  FadeIn,
  FadeOut,
  ZoomIn,
  ZoomOut,
  SlideInUp,
  SlideInDown,
  withRepeat,
} from "react-native-reanimated";
import { Label } from "~/components/ui/label";
import { Text } from "~/components/ui/text";
import { Card } from "~/components/ui/card";
import { Progress } from "~/components/ui/progress";
import { Skeleton } from "~/components/ui/skeleton";
import * as Haptics from "expo-haptics";
import {
  Globe,
  Lock,
  Shield,
  Server,
  AlertCircle,
  CheckCircle,
  Info,
  Database,
  GitBranch,
  Network,
  Zap,
  Terminal,
  Copy,
  Share2,
  MoreHorizontal,
  ChevronDown,
  ChevronUp,
  BarChart,
  Fingerprint,
  Layers,
  Clipboard as ClipboardCw,
} from "lucide-react-native";
import { toast } from "sonner-native";
import { Button } from "~/components/ui/button";
import * as Clipboard from "expo-clipboard";
import { useColorScheme } from "nativewind";

interface ScanResult {
  id?: string;
  port: number;
  status: "open" | "closed" | "error" | "filtered";
  service?: string;
  details?: string;
  isSelected?: boolean;
  protocol?: string;
  latency?: number;
  timestamp?: Date;
  banners?: string[];
  vulnerabilities?: Array<{
    id: string;
    severity: "low" | "medium" | "high" | "critical";
    name: string;
    description?: string;
  }>;
}

interface ScanResultItemProps {
  item: ScanResult;
  index: number;
  onPress?: (item: ScanResult) => void;
  onLongPress?: (item: ScanResult) => void;
  showDetails?: boolean;
  isHighlighted?: boolean;
  isLoading?: boolean;
}

const AnimatedCard = Animated.createAnimatedComponent(Card);
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const ServiceIcon = memo(
  ({ service, status }: { service?: string; status: string }) => {
    const Icon = useMemo(() => {
      if (status !== "open" && status !== "filtered") return null;

      switch (true) {
        case /http|web|nginx|apache/i.test(service || ""):
          return Globe;
        case /db|sql|mongo|redis|cassandra|postgres/i.test(service || ""):
          return Database;
        case /git|svn|repos/i.test(service || ""):
          return GitBranch;
        case /ssh|telnet|ftp|sftp|ftps/i.test(service || ""):
          return Server;
        case /dns|dhcp|ssdp|upnp/i.test(service || ""):
          return Network;
        case /shell|bash|cmd|powershell/i.test(service || ""):
          return Terminal;
        case /auth|ldap|kerberos/i.test(service || ""):
          return Fingerprint;
        case /cloud|s3|azure|aws/i.test(service || ""):
          return Layers;
        default:
          return Zap;
      }
    }, [service, status]);

    if (!Icon) return null;

    return (
      <Animated.View entering={ZoomIn.duration(300)}>
        <Icon
          size={16}
          className={
            status === "open"
              ? "text-primary"
              : status === "filtered"
              ? "text-amber-500"
              : status === "error"
              ? "text-destructive"
              : "text-muted-foreground"
          }
        />
      </Animated.View>
    );
  }
);

const StatusBadge = memo(
  ({ status, className = "" }: { status: string; className?: string }) => {
    const config = useMemo(
      () => ({
        open: {
          icon: CheckCircle,
          text: "开放",
          baseClass: "bg-success/10 text-success border-success/20",
        },
        closed: {
          icon: Lock,
          text: "关闭",
          baseClass: "bg-muted text-muted-foreground border-border",
        },
        error: {
          icon: AlertCircle,
          text: "错误",
          baseClass: "bg-destructive/10 text-destructive border-destructive/20",
        },
        filtered: {
          icon: Shield,
          text: "过滤",
          baseClass: "bg-amber-500/10 text-amber-500 border-amber-500/20",
        },
      }),
      []
    );

    const {
      icon: Icon,
      text,
      baseClass,
    } = config[status as keyof typeof config] || config.error;

    return (
      <Animated.View
        entering={SlideInUp.duration(300).springify()}
        className={`
          flex-row items-center space-x-1.5
          px-2 py-1 rounded-full
          border
          ${baseClass}
          ${className}
        `}
      >
        <Icon size={12} />
        <Label className="text-xs font-medium">{text}</Label>
      </Animated.View>
    );
  }
);

const VulnerabilityBadge = memo(({ severity, count }: { severity: string; count?: number }) => {
  const config = {
    low: {
      color: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      text: "低",
    },
    medium: {
      color: "bg-amber-500/10 text-amber-500 border-amber-500/20",
      text: "中",
    },
    high: {
      color: "bg-orange-500/10 text-orange-500 border-orange-500/20",
      text: "高",
    },
    critical: {
      color: "bg-destructive/10 text-destructive border-destructive/20",
      text: "严重",
    },
  };

  const { color, text } = config[severity as keyof typeof config] || config.low;

  return (
    <Animated.View 
      entering={ZoomIn.duration(300)}
      className={`px-2 py-0.5 rounded-full border flex-row items-center space-x-1 ${color}`}
    >
      <Label className="text-xs font-medium">{text}</Label>
      {count !== undefined && (
        <View className="bg-background/30 px-1 rounded-full">
          <Text className="text-xs">{count}</Text>
        </View>
      )}
    </Animated.View>
  );
});

const ScanResultSkeleton = () => {
  return (
    <Card className="p-4 space-y-3 mx-1 mb-2 overflow-hidden opacity-60">
      <View className="flex-row justify-between items-center">
        <View className="flex-row items-center space-x-2">
          <Skeleton className="w-4 h-4 rounded-full" />
          <Skeleton className="w-24 h-5 rounded-md" />
        </View>
        <Skeleton className="w-16 h-6 rounded-full" />
      </View>
      
      <View className="space-y-2">
        <View className="flex-row items-center space-x-2">
          <Skeleton className="w-4 h-4 rounded-full" />
          <Skeleton className="w-32 h-4 rounded-md" />
        </View>
        <View className="flex-row items-center space-x-2">
          <Skeleton className="w-4 h-4 rounded-full" />
          <Skeleton className="w-40 h-4 rounded-md" />
        </View>
      </View>
      
      <View className="flex-row justify-between mt-2 pt-2 border-t border-border/20">
        <Skeleton className="w-16 h-8 rounded-md" />
        <View className="flex-row space-x-2">
          <Skeleton className="w-8 h-8 rounded-md" />
          <Skeleton className="w-8 h-8 rounded-md" />
          <Skeleton className="w-8 h-8 rounded-md" />
        </View>
      </View>
    </Card>
  );
};

const ScanResultItem: React.FC<ScanResultItemProps> = memo(
  ({
    item,
    index,
    onPress,
    onLongPress,
    showDetails = false,
    isHighlighted = false,
    isLoading = false,
  }) => {
    const { width } = useWindowDimensions();
    const isLandscape = width > 768;
    const pressed = useSharedValue(0);
    const selected = useSharedValue(item.isSelected ? 1 : 0);
    const expanded = useSharedValue(showDetails ? 1 : 0);
    const { colorScheme } = useColorScheme();
    const [isExpanded, setIsExpanded] = useState(showDetails);
    const [screenReaderEnabled, setScreenReaderEnabled] = useState(false);
    const [isDetailsLoading, setIsDetailsLoading] = useState(false);
    const hasDetailsLoaded = useRef(false);

    // 适应主题色彩
    const darkMode = colorScheme === "dark";
    
    // 检查屏幕阅读器状态
    useEffect(() => {
      AccessibilityInfo.isScreenReaderEnabled().then(setScreenReaderEnabled);
      const subscription = AccessibilityInfo.addEventListener(
        "screenReaderChanged",
        setScreenReaderEnabled
      );
      return () => subscription.remove();
    }, []);

    // 选中状态动画更新
    useEffect(() => {
      selected.value = withTiming(item.isSelected ? 1 : 0, {
        duration: 300,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      });
      
      if (item.isSelected) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    }, [item.isSelected]);
    
    // 高亮状态动画
    const highlightPulse = useSharedValue(isHighlighted ? 1 : 0);
    
    useEffect(() => {
      if (isHighlighted) {
        highlightPulse.value = withRepeat(
          withSequence(
            withTiming(1, { duration: 1000 }),
            withTiming(0.5, { duration: 1000 })
          ),
          3,
          true,
          () => {
            highlightPulse.value = withTiming(1, { duration: 300 });
          }
        );
        
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        highlightPulse.value = withTiming(0, { duration: 300 });
      }
    }, [isHighlighted]);

    // 复制端口信息
    const copyToClipboard = useCallback(async () => {
      try {
        const textToCopy =
          `端口: ${item.port}\n` +
          `状态: ${item.status}\n` +
          `服务: ${item.service || "未知"}\n` +
          (item.protocol ? `协议: ${item.protocol}\n` : "") +
          (item.latency ? `延迟: ${item.latency}ms\n` : "") +
          (item.details ? `详情: ${item.details}\n` : "");

        await Clipboard.setStringAsync(textToCopy);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        toast.success("已复制到剪贴板", { 
          duration: 2000,
          icon: <ClipboardCw size={18} />
        });
      } catch (error) {
        toast.error("复制失败", { duration: 2000 });
      }
    }, [item]);

    // 分享端口信息
    const shareInfo = useCallback(async () => {
      try {
        const shareContent = {
          title: `端口 ${item.port} (${item.service || "未知服务"}) 扫描结果`,
          message:
            `端口: ${item.port}\n` +
            `状态: ${item.status}\n` +
            `服务: ${item.service || "未知"}\n` +
            (item.protocol ? `协议: ${item.protocol}\n` : "") +
            (item.latency ? `延迟: ${item.latency}ms\n` : "") +
            (item.details ? `详情: ${item.details}\n` : "") +
            `\n扫描时间: ${
              item.timestamp
                ? new Date(item.timestamp).toLocaleString()
                : "未知"
            }`,
        };

        await Share.share(shareContent);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (error) {
        toast.error("分享失败", { duration: 2000 });
      }
    }, [item]);

    // 模拟加载详情数据
    const loadDetails = useCallback(async () => {
      if (hasDetailsLoaded.current) return;
      
      setIsDetailsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 800));
      setIsDetailsLoading(false);
      hasDetailsLoaded.current = true;
    }, []);

    // 切换详情展示
    const toggleDetails = useCallback(() => {
      loadDetails();
      setIsExpanded(!isExpanded);
      expanded.value = withTiming(isExpanded ? 0 : 1, {
        duration: 300,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, [isExpanded, expanded, loadDetails]);

    const animatedStyle = useAnimatedStyle(() => {
      const backgroundColor = interpolateColor(
        selected.value,
        [0, 1],
        [
          darkMode ? "hsla(var(--card) / 0.7)" : "hsla(var(--card) / 0.8)",
          darkMode
            ? "hsla(var(--primary) / 0.15)"
            : "hsla(var(--primary) / 0.1)",
        ]
      );

      const borderColor = interpolateColor(
        selected.value,
        [0, 1],
        [
          darkMode ? "hsla(var(--border) / 0.6)" : "hsla(var(--border) / 0.5)",
          darkMode
            ? "hsla(var(--primary) / 0.6)"
            : "hsla(var(--primary) / 0.5)",
        ]
      );

      // 高亮效果
      const highlightBorderColor = interpolateColor(
        highlightPulse.value,
        [0, 1],
        [
          borderColor,
          darkMode
            ? "hsla(var(--success) / 0.7)"
            : "hsla(var(--success) / 0.6)"
        ]
      );

      return {
        backgroundColor,
        borderColor: isHighlighted ? highlightBorderColor : borderColor,
        transform: [{ scale: withSpring(1 - pressed.value * 0.02) }],
        opacity: isLoading ? withTiming(0.7, { duration: 300 }) : withTiming(1, { duration: 300 }),
      };
    });

    const detailsStyle = useAnimatedStyle(() => ({
      height: withSpring(expanded.value ? "auto" : 0, {
        mass: 0.5,
        damping: 12,
      }),
      opacity: withTiming(expanded.value ? 1 : 0, {
        duration: 250,
      }),
    }));
    
    const chevronStyle = useAnimatedStyle(() => ({
      transform: [
        { 
          rotate: withTiming(`${expanded.value * 180}deg`, { 
            duration: 300,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
          }) 
        }
      ],
    }));

    const handlePress = () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      if (item.status === "error") {
        toast.error(`端口 ${item.port} 扫描出错`, {
          description: item.details,
          icon: <AlertCircle size={18} />,
          duration: 3000,
        });
      } else if (item.status === "open") {
        toast.success(
          `端口 ${item.port} ${item.service ? `(${item.service})` : ""} 开放`,
          {
            description: item.latency ? `延迟: ${item.latency}ms` : undefined,
            icon: <CheckCircle size={18} />,
            duration: 2000,
            action: {
              label: "复制",
              onClick: copyToClipboard,
            },
          }
        );
      }

      onPress?.(item);
    };

    // 显示漏洞信息
    const renderVulnerabilities = () => {
      if (!item.vulnerabilities || item.vulnerabilities.length === 0)
        return null;

      // 按严重程度分组
      const groupedVuln = item.vulnerabilities.reduce((acc, vuln) => {
        acc[vuln.severity] = (acc[vuln.severity] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const hasCritical = groupedVuln.critical && groupedVuln.critical > 0;

      return (
        <View className="mt-3 pt-3 border-t border-border/30 space-y-2">
          <View className="flex-row items-center justify-between">
            <Label className="text-sm font-medium">可能的漏洞:</Label>
            {hasCritical && (
              <View className="bg-destructive/10 px-2 py-1 rounded-lg">
                <Text className="text-xs text-destructive font-medium">
                  需要立即注意
                </Text>
              </View>
            )}
          </View>
          
          <View className="flex-row flex-wrap gap-2">
            {Object.entries(groupedVuln).map(([severity, count]) => (
              <VulnerabilityBadge 
                key={severity} 
                severity={severity} 
                count={count}
              />
            ))}
          </View>
          
          <View className="space-y-2 mt-1">
            {item.vulnerabilities.map((vuln) => (
              <View key={vuln.id} className="bg-background/50 p-2 rounded-md border border-border/20">
                <View className="flex-row items-center justify-between">
                  <Text className="font-medium">{vuln.name}</Text>
                  <VulnerabilityBadge severity={vuln.severity} />
                </View>
                {vuln.description && (
                  <Text className="text-xs text-muted-foreground mt-1">
                    {vuln.description}
                  </Text>
                )}
              </View>
            ))}
          </View>
        </View>
      );
    };

    // 渲染Banner信息
    const renderBanners = () => {
      if (!item.banners || item.banners.length === 0) return null;

      return (
        <View className="mt-3 pt-3 border-t border-border/30">
          <Label className="text-sm font-medium mb-1">服务信息:</Label>
          <View className="bg-background/50 p-2 rounded-md">
            {item.banners.map((banner, idx) => (
              <Text key={idx} className="text-xs text-muted-foreground">
                {banner}
              </Text>
            ))}
          </View>
        </View>
      );
    };
    
    // 加载中状态
    if (isLoading) {
      return <ScanResultSkeleton />;
    }

    return (
      <Animated.View
        entering={FadeInLeft.delay(index * 50)
          .duration(300)
          .springify()}
        exiting={SlideOutRight.duration(200)}
        layout={Layout.springify()}
        className="mx-1 w-full mb-2"
      >
        <AnimatedPressable
          onPressIn={() => {
            pressed.value = withSpring(1);
          }}
          onPressOut={() => {
            pressed.value = withSpring(0);
          }}
          onPress={handlePress}
          onLongPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onLongPress?.(item);
          }}
          accessibilityRole="button"
          accessibilityLabel={`端口 ${item.port} ${item.service ? `(${item.service})` : ""} ${
            item.status === "open" 
              ? "开放" 
              : item.status === "closed"
              ? "关闭"
              : item.status === "error"
              ? "错误"
              : "过滤"
          }`}
          accessibilityHint="点击查看端口详情，长按打开更多选项"
          accessibilityState={{
            selected: item.isSelected,
            checked: item.status === "open",
          }}
          accessible={screenReaderEnabled}
        >
          <AnimatedCard
            style={[animatedStyle]}
            className={`
              backdrop-blur-lg
              overflow-hidden
              ${
                item.status === "error"
                  ? "border-destructive/30"
                  : isHighlighted
                  ? "border-success/40"
                  : "border-border/30"
              }
            `}
          >
            <View className="p-4 space-y-3">
              {/* 头部：端口和服务信息 */}
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center space-x-2">
                  <ServiceIcon service={item.service} status={item.status} />
                  <View>
                    <Label className="text-base font-medium">
                      端口 {item.port}
                    </Label>
                    {item.service && (
                      <Label className="text-sm text-muted-foreground">
                        {item.service}
                      </Label>
                    )}
                  </View>
                </View>
                <StatusBadge status={item.status} />
              </View>

              {/* 基础详细信息 */}
              {(item.details || item.protocol || item.latency) && (
                <View className="space-y-1.5 pt-1">
                  {item.protocol && (
                    <View className="flex-row items-center space-x-2">
                      <Shield size={14} className="text-muted-foreground" />
                      <Label className="text-sm text-muted-foreground">
                        {item.protocol}
                      </Label>
                    </View>
                  )}
                  {item.latency && (
                    <View className="flex-row items-center space-x-2">
                      <Network size={14} className="text-muted-foreground" />
                      <Label className="text-sm text-muted-foreground">
                        延迟: {item.latency}ms
                      </Label>
                      <Progress 
                        value={Math.min(100, (item.latency / 500) * 100)} 
                        className="w-16 h-1.5" 
                        indicatorClassName={item.latency > 300 ? "bg-amber-500" : "bg-primary"}
                      />
                    </View>
                  )}
                  {item.details && (
                    <View className="flex-row items-center space-x-2">
                      <Info size={14} className="text-muted-foreground" />
                      <Label className="text-sm text-muted-foreground">
                        {item.details}
                      </Label>
                    </View>
                  )}
                </View>
              )}

              {/* 快捷操作按钮 */}
              <View className="flex-row justify-between mt-2 pt-1 border-t border-border/20">
                <Button
                  variant="ghost"
                  size="sm"
                  onPress={toggleDetails}
                  className="flex-row items-center px-3 py-1"
                  accessibilityLabel={isExpanded ? "收起详情" : "显示详情"}
                  accessibilityHint={isExpanded ? "收起详细信息" : "显示更多详细信息"}
                >
                  <Animated.View style={chevronStyle}>
                    <ChevronDown size={14} className="mr-1" />
                  </Animated.View>
                  <Label className="text-xs">
                    {isExpanded ? "收起" : "详情"}
                  </Label>
                </Button>

                <View className="flex-row">
                  <Button
                    variant="ghost"
                    size="sm"
                    onPress={copyToClipboard}
                    className="px-3 py-1"
                    accessibilityLabel="复制信息"
                  >
                    <Copy size={14} />
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onPress={shareInfo}
                    className="px-3 py-1"
                    accessibilityLabel="分享信息"
                  >
                    <Share2 size={14} />
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onPress={() => onLongPress?.(item)}
                    className="px-2 py-1"
                    accessibilityLabel="更多选项"
                  >
                    <MoreHorizontal size={14} />
                  </Button>
                </View>
              </View>

              {/* 展开的详细信息区域 */}
              <Animated.View style={detailsStyle}>
                {isDetailsLoading ? (
                  <View className="space-y-3 py-2">
                    <Skeleton className="h-16 w-full rounded-md" />
                    <View className="flex-row space-x-2">
                      <Skeleton className="h-6 w-16 rounded-md" />
                      <Skeleton className="h-6 w-16 rounded-md" />
                    </View>
                    <Skeleton className="h-8 w-2/3 rounded-md" />
                  </View>
                ) : (
                  <>
                    {renderVulnerabilities()}
                    {renderBanners()}

                    {item.timestamp && (
                      <View className="mt-3 pt-3 border-t border-border/30">
                        <Label className="text-xs text-muted-foreground">
                          扫描时间: {new Date(item.timestamp).toLocaleString()}
                        </Label>
                      </View>
                    )}
                  </>
                )}
              </Animated.View>
              
              {/* 高亮指示器 */}
              {isHighlighted && (
                <Animated.View 
                  className="absolute top-0 right-0 w-3 h-3 rounded-full bg-success"
                  entering={ZoomIn.duration(300).springify()}
                  exiting={ZoomOut.duration(200)}
                />
              )}
            </View>
          </AnimatedCard>
        </AnimatedPressable>
      </Animated.View>
    );
  }
);

ServiceIcon.displayName = "ServiceIcon";
StatusBadge.displayName = "StatusBadge";
VulnerabilityBadge.displayName = "VulnerabilityBadge";
ScanResultItem.displayName = "ScanResultItem";

export default ScanResultItem;
