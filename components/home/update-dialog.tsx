import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  View,
  Pressable,
  ScrollView,
  Platform,
  AccessibilityInfo,
  Linking,
} from "react-native";
import * as Updates from "expo-updates";
import type { Manifest as ExpoManifest } from "expo-updates";
import { useUpdateStore } from "../../stores/useUpdateStore";
import { toast } from "sonner-native";
import {
  Download,
  RefreshCw,
  AlertCircle,
  Check,
  Play,
  Pause,
  X,
  Package,
  Clock,
  Info,
  ChevronRight,
  FileText,
  Calendar,
  Shield,
  CheckCircle2,
  XCircle,
  Sparkles,
  ArrowRight,
  FileDown,
  RotateCw,
} from "lucide-react-native";
import { Alert, AlertTitle, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Progress } from "~/components/ui/progress";
import { Text } from "~/components/ui/text";
import { Badge } from "~/components/ui/badge";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
} from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeIn,
  FadeOut,
  SlideInUp,
  SlideInRight,
  SlideOutRight,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  useSharedValue,
  withRepeat,
  withDelay,
  Easing,
  interpolate,
  Extrapolate,
  cancelAnimation,
  BounceIn,
  BounceOut,
  SlideInDown,
  SlideOutDown,
  LinearTransition,
  ZoomIn,
} from "react-native-reanimated";

// 创建动画组件
const AnimatedCard = Animated.createAnimatedComponent(Card);
const AnimatedButton = Animated.createAnimatedComponent(Button);
const AnimatedProgress = Animated.createAnimatedComponent(Progress);
const AnimatedView = Animated.createAnimatedComponent(View);
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// 更新的变更日志类型（对于版本描述）
interface ChangelogItem {
  type: "feature" | "fix" | "improvement" | "security";
  description: string;
}

// 将会展示在更新对话框的更新信息
interface UpdateDetails {
  title: string;
  description: string;
  releaseDate: string;
  version: string;
  changelog: ChangelogItem[];
  isRequired?: boolean;
  releaseNotes?: string;
}

export default function UpdateDialog() {
  const {
    isChecking,
    isDownloading,
    downloadProgress,
    lastCheckTime,
    error,
    currentlyRunning,
    available,
    setChecking,
    setDownloading,
    setProgress,
    setError,
    setLastCheckTime,
    setAvailableUpdate,
  } = useUpdateStore();

  // 本地状态
  const [activeSection, setActiveSection] = useState<"overview" | "details">(
    "overview"
  );
  const [showChangelog, setShowChangelog] = useState(false);
  const [isScreenReaderEnabled, setIsScreenReaderEnabled] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [hasCompletedDownload, setHasCompletedDownload] = useState(false);

  // 动画参考
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 动画值
  const cardScale = useSharedValue(1);
  const buttonScale = useSharedValue(1);
  const progressWidth = useSharedValue(0);
  const refreshRotation = useSharedValue(0);
  const errorShake = useSharedValue(0);
  const expandAnimation = useSharedValue(0);
  const progressColor = useSharedValue(0);
  const downloadCompleteScale = useSharedValue(0);
  const changelogHeight = useSharedValue(0);
  const badgeScale = useSharedValue(1);
  const buttonOpacity = useSharedValue(1);
  const buttonY = useSharedValue(0);
  const checkmarkScale = useSharedValue(0);
  const checkmarkOpacity = useSharedValue(0);
  const contentHeight = useSharedValue("auto");

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

  // 清理资源
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      cancelAnimation(cardScale);
      cancelAnimation(buttonScale);
      cancelAnimation(progressWidth);
      cancelAnimation(refreshRotation);
      cancelAnimation(errorShake);
      cancelAnimation(expandAnimation);
      cancelAnimation(progressColor);
      cancelAnimation(downloadCompleteScale);
      cancelAnimation(changelogHeight);
      cancelAnimation(badgeScale);
    };
  }, []);

  // 优化性能：使用 useMemo 缓存计算值
  const updateInfo = useMemo(
    () => ({
      hasUpdate: available !== null,
      isNewer:
        available?.runtimeVersion && currentlyRunning.runtimeVersion
          ? available.runtimeVersion > currentlyRunning.runtimeVersion
          : false,
      versionName:
        available?.manifest?.version ||
        available?.manifest?.metadata?.expoClient?.version ||
        "未知",
    }),
    [available, currentlyRunning]
  );

  // 构造模拟的更新详情（实际应用中应从服务器获取）
  const updateDetails = useMemo<UpdateDetails | null>(() => {
    if (!available) return null;

    return {
      title: `版本 ${updateInfo.versionName} 更新`,
      description:
        "此更新包含了多项功能改进和错误修复，提升了应用的稳定性和性能。",
      releaseDate: new Date().toLocaleDateString("zh-CN"),
      version: updateInfo.versionName,
      isRequired: false,
      changelog: [
        { type: "feature", description: "新增暗色主题支持" },
        { type: "improvement", description: "提升了应用启动速度" },
        { type: "fix", description: "修复了某些设备上的崩溃问题" },
        { type: "security", description: "增强了数据加密安全性" },
      ],
      releaseNotes: "感谢您使用我们的应用，我们一直在努力提供更好的体验。",
    };
  }, [available, updateInfo.versionName]);

  // 动画样式
  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }, { translateX: errorShake.value }],
    shadowOpacity: interpolate(
      cardScale.value,
      [0.95, 1.02],
      [0.1, 0.3],
      Extrapolate.CLAMP
    ),
  }));

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
    backgroundColor: interpolate(
      progressColor.value,
      [0, 0.5, 1],
      ["#3b82f6", "#8b5cf6", "#10b981"],
      Extrapolate.CLAMP
    ),
  }));

  const rotateStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${refreshRotation.value}deg` }],
  }));

  const expandStyle = useAnimatedStyle(() => ({
    height: expandAnimation.value,
    opacity: interpolate(
      expandAnimation.value,
      [0, 50],
      [0, 1],
      Extrapolate.CLAMP
    ),
  }));

  const downloadCompleteStyle = useAnimatedStyle(() => ({
    transform: [{ scale: downloadCompleteScale.value }],
    opacity: downloadCompleteScale.value,
  }));

  const changelogStyle = useAnimatedStyle(() => ({
    height: showChangelog ? "auto" : 0,
    opacity: interpolate(
      changelogHeight.value,
      [0, 1],
      [0, 1],
      Extrapolate.CLAMP
    ),
  }));

  const badgeAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgeScale.value }],
  }));

  const actionButtonsStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
    transform: [{ translateY: buttonY.value }],
  }));

  const checkmarkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkmarkScale.value }],
    opacity: checkmarkOpacity.value,
  }));

  const contentStyle = useAnimatedStyle(() => ({
    height: contentHeight.value,
  }));

  // 错误动画 - 增强显示更好的视觉反馈
  const triggerErrorAnimation = useCallback(() => {
    errorShake.value = withSequence(
      withSpring(10, { damping: 8, stiffness: 500 }),
      withSpring(-10, { damping: 8, stiffness: 500 }),
      withSpring(6, { damping: 8, stiffness: 500 }),
      withSpring(-6, { damping: 8, stiffness: 500 }),
      withSpring(0, { damping: 5, stiffness: 300 })
    );

    cardScale.value = withSequence(
      withTiming(0.98, { duration: 100 }),
      withSpring(1, { damping: 20, stiffness: 200 })
    );

    if (Platform.OS !== "web" && !isScreenReaderEnabled) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [isScreenReaderEnabled]);

  // 处理按钮点击 - 增强手势反馈
  const handleButtonPress = useCallback(
    async (action: () => Promise<void>) => {
      try {
        buttonScale.value = withSequence(
          withSpring(0.95, { mass: 0.5, damping: 8, stiffness: 200 }),
          withSpring(1, { mass: 0.5, damping: 8, stiffness: 200 })
        );

        if (Platform.OS !== "web" && !isScreenReaderEnabled) {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }

        await action();
      } catch (error: any) {
        console.error("Update action failed:", error);
        setError(error.message || "操作失败，请重试");
        triggerErrorAnimation();

        toast.error("操作失败", {
          description: error.message || "请稍后重试",
        });
      }
    },
    [isScreenReaderEnabled]
  );

  // 检查更新 - 增强视觉反馈
  const checkForUpdate = useCallback(async () => {
    if (isChecking) return;

    setChecking(true);
    setError(null);

    try {
      // 启动旋转动画
      refreshRotation.value = withRepeat(
        withTiming(360, { duration: 1000, easing: Easing.linear }),
        -1
      );

      // 卡片轻微缩放效果
      cardScale.value = withSequence(
        withTiming(0.98, { duration: 300 }),
        withTiming(1, { duration: 300 })
      );

      // 在实际应用中这里会有异步网络请求
      const update = await Updates.checkForUpdateAsync();
      setLastCheckTime(Date.now());

      if (update.isAvailable) {
        const manifest = update.manifest as any;
        setAvailableUpdate({
          runtimeVersion:
            manifest.runtimeVersion ||
            manifest.metadata?.expoRuntimeVersion ||
            "1.0.0",
          manifest: {
            ...manifest,
            version:
              manifest.version ||
              manifest.metadata?.expoClient?.version ||
              "1.0.0",
          },
        });

        // 发现更新时的动画效果
        badgeScale.value = withSequence(
          withTiming(1.3, { duration: 200 }),
          withTiming(1, { duration: 150 })
        );

        cardScale.value = withSequence(
          withTiming(1.03, { duration: 200 }),
          withTiming(1, { duration: 200 })
        );

        if (Platform.OS !== "web" && !isScreenReaderEnabled) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }

        toast.success("发现新版本", {
          description: `版本 ${updateInfo.versionName} 已可用`,
        });
      } else {
        // 无更新时的动画效果
        cardScale.value = withSequence(
          withTiming(0.98, { duration: 200 }),
          withTiming(1, { duration: 200 })
        );

        toast.info("已是最新版本", {
          description: "您的应用已经是最新版本",
        });
      }
    } catch (error: any) {
      console.error("Check update failed:", error);
      setError(error.message || "检查更新失败");
      triggerErrorAnimation();
    } finally {
      setChecking(false);
      cancelAnimation(refreshRotation);
      refreshRotation.value = withTiming(0);
    }
  }, [isChecking, updateInfo.versionName, isScreenReaderEnabled]);

  // 下载更新 - 增强动画和进度反馈
  const downloadUpdate = useCallback(async () => {
    if (!available || isDownloading) return;

    setDownloading(true);
    setError(null);
    setHasCompletedDownload(false);

    try {
      // 重置状态和动画值
      progressWidth.value = 0;
      progressColor.value = 0;

      // 进入准备状态时的动画
      cardScale.value = withSequence(
        withTiming(0.98, { duration: 200 }),
        withTiming(1, { duration: 200 })
      );

      const { manifest } = await (Updates as any).fetchUpdateAsync({
        onProgress: ({
          totalBytes,
          downloaded,
        }: {
          totalBytes: number;
          downloaded: number;
        }) => {
          const progress = (downloaded / totalBytes) * 100;
          const normalizedProgress = Math.min(Math.max(progress, 0), 100);
          setProgress(normalizedProgress);

          // 动画化进度条宽度和颜色
          progressWidth.value = withSpring(normalizedProgress, {
            mass: 0.5,
            damping: 10,
            stiffness: 80,
          });

          progressColor.value = withTiming(normalizedProgress / 100, {
            duration: 500,
          });

          // 在关键点提供触觉反馈
          if (
            [25, 50, 75, 100].includes(Math.round(normalizedProgress)) &&
            Platform.OS !== "web" &&
            !isScreenReaderEnabled
          ) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
        },
      });

      // 下载完成动画
      progressWidth.value = withSpring(100, { damping: 15, stiffness: 90 });
      progressColor.value = withTiming(1, { duration: 500 });

      // 完成指示器动画
      downloadCompleteScale.value = withSequence(
        withTiming(1.2, { duration: 300, easing: Easing.out(Easing.back) }),
        withTiming(1, { duration: 200 })
      );

      // 检查标记动画
      checkmarkScale.value = withSequence(
        withDelay(
          300,
          withTiming(1, { duration: 300, easing: Easing.out(Easing.back) })
        )
      );
      checkmarkOpacity.value = withTiming(1, { duration: 300 });

      setProgress(100);
      setHasCompletedDownload(true);

      if (Platform.OS !== "web" && !isScreenReaderEnabled) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      toast.success("更新已下载", {
        description: "更新已准备就绪，重启应用后生效",
      });
    } catch (error: any) {
      console.error("Download update failed:", error);
      setError(error.message || "下载更新失败");
      triggerErrorAnimation();
      setRetryCount((prev) => prev + 1);
    } finally {
      setDownloading(false);
    }
  }, [available, isDownloading, isScreenReaderEnabled]);

  // 重启应用 - 优化重启流程和反馈
  const reloadApp = useCallback(async () => {
    try {
      // 重启前的过渡动画
      buttonOpacity.value = withTiming(0, { duration: 400 });
      buttonY.value = withTiming(20, { duration: 400 });

      cardScale.value = withSequence(
        withTiming(0.95, { duration: 300 }),
        withTiming(0.9, { duration: 200 })
      );

      // 提供触觉反馈
      if (Platform.OS !== "web" && !isScreenReaderEnabled) {
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success
        );
      }

      toast.success("应用正在重启", {
        description: "即将应用更新...",
      });

      // 给视觉反馈一点时间
      timeoutRef.current = setTimeout(async () => {
        await Updates.reloadAsync();
      }, 800);
    } catch (error: any) {
      console.error("Reload app failed:", error);
      setError(error.message || "重启应用失败");
      triggerErrorAnimation();

      // 恢复按钮状态
      buttonOpacity.value = withTiming(1, { duration: 300 });
      buttonY.value = withTiming(0, { duration: 300 });
      cardScale.value = withSpring(1);
    }
  }, [isScreenReaderEnabled]);

  // 切换显示更新详情
  const toggleDetails = useCallback(() => {
    setActiveSection(activeSection === "overview" ? "details" : "overview");

    // 切换详情区域的展开/收起动画
    if (activeSection === "overview") {
      expandAnimation.value = withTiming(300, {
        duration: 300,
        easing: Easing.out(Easing.cubic),
      });
    } else {
      expandAnimation.value = withTiming(0, {
        duration: 200,
        easing: Easing.in(Easing.cubic),
      });
    }

    // 轻触觉反馈
    if (Platform.OS !== "web" && !isScreenReaderEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [activeSection, isScreenReaderEnabled]);

  // 切换显示变更日志
  const toggleChangelog = useCallback(() => {
    setShowChangelog(!showChangelog);

    changelogHeight.value = withTiming(showChangelog ? 0 : 1, {
      duration: 300,
      easing: showChangelog
        ? Easing.in(Easing.cubic)
        : Easing.out(Easing.cubic),
    });

    // 轻触觉反馈
    if (Platform.OS !== "web" && !isScreenReaderEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [showChangelog, isScreenReaderEnabled]);

  // 渲染变更日志项
  const renderChangelogItem = useCallback(
    (item: ChangelogItem, index: number) => {
      const getIconAndColor = () => {
        switch (item.type) {
          case "feature":
            return {
              icon: <Sparkles size={14} className="text-blue-500" />,
              color: "text-blue-500",
            };
          case "fix":
            return {
              icon: <Check size={14} className="text-emerald-500" />,
              color: "text-emerald-500",
            };
          case "improvement":
            return {
              icon: <ArrowRight size={14} className="text-amber-500" />,
              color: "text-amber-500",
            };
          case "security":
            return {
              icon: <Shield size={14} className="text-purple-500" />,
              color: "text-purple-500",
            };
          default:
            return {
              icon: <Info size={14} className="text-slate-500" />,
              color: "text-slate-500",
            };
        }
      };

      const { icon, color } = getIconAndColor();

      return (
        <Animated.View
          key={index}
          entering={FadeIn.delay(index * 100).springify()}
          className="flex-row items-start space-x-2 mb-2"
        >
          {icon}
          <Text className={`text-sm ${color} flex-1`}>{item.description}</Text>
        </Animated.View>
      );
    },
    []
  );

  // 渲染详细信息部分
  const renderUpdateDetails = useCallback(() => {
    if (!updateDetails) return null;

    return (
      <Animated.View style={expandStyle} className="overflow-hidden">
        <View className="space-y-4 pt-2">
          <View className="space-y-2">
            <Text className="text-base font-medium text-foreground">
              {updateDetails.title}
            </Text>
            <Text className="text-sm text-muted-foreground">
              {updateDetails.description}
            </Text>
          </View>

          <View className="flex-row justify-between items-center">
            <View className="flex-row items-center space-x-2">
              <Calendar size={14} className="text-muted-foreground" />
              <Text className="text-xs text-muted-foreground">
                发布日期: {updateDetails.releaseDate}
              </Text>
            </View>

            {updateDetails.isRequired && (
              <Badge variant="destructive" className="rounded-full px-2">
                <Text className="text-xs">必需更新</Text>
              </Badge>
            )}
          </View>

          <Pressable
            onPress={toggleChangelog}
            className="flex-row items-center justify-between p-2 bg-muted/30 rounded-lg"
            accessibilityRole="button"
            accessibilityLabel="查看变更日志"
            accessibilityHint={showChangelog ? "隐藏变更日志" : "显示变更日志"}
          >
            <View className="flex-row items-center space-x-2">
              <FileText size={16} className="text-primary" />
              <Text className="text-sm font-medium text-primary">变更日志</Text>
            </View>
            <ChevronRight size={16} className="text-muted-foreground" />
          </Pressable>

          <Animated.View style={changelogStyle} className="space-y-2">
            <View className="p-3 bg-muted/10 rounded-lg space-y-1">
              {updateDetails.changelog.map(renderChangelogItem)}
            </View>
          </Animated.View>

          {updateDetails.releaseNotes && (
            <View className="p-3 bg-muted/10 rounded-lg">
              <Text className="text-sm text-muted-foreground italic">
                {updateDetails.releaseNotes}
              </Text>
            </View>
          )}
        </View>
      </Animated.View>
    );
  }, [
    updateDetails,
    expandStyle,
    changelogStyle,
    showChangelog,
    renderChangelogItem,
  ]);

  return (
    <ScrollView
      className="w-full"
      showsVerticalScrollIndicator={false}
      accessibilityRole="scrollView"
      accessibilityLabel="更新对话框"
    >
      <AnimatedCard
        style={[cardStyle, contentStyle]}
        entering={SlideInUp.springify()}
        layout={LinearTransition.springify()}
        className="overflow-hidden border-2 border-border/30 bg-card/95 backdrop-blur-xl rounded-xl"
      >
        <CardHeader className="pb-2 pt-4">
          {/* 状态指示器 */}
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center space-x-2">
              <Package size={20} className="text-primary" />
              <Text className="text-base font-bold">系统更新</Text>
            </View>

            {updateInfo.hasUpdate && (
              <Animated.View style={badgeAnimStyle}>
                <Badge className="bg-primary text-primary-foreground px-2 py-0.5">
                  <Text className="text-xs font-medium">有可用更新</Text>
                </Badge>
              </Animated.View>
            )}
          </View>
        </CardHeader>

        <CardContent className="p-4 space-y-4">
          <View className="space-y-2">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm text-muted-foreground">当前版本</Text>
              <Text className="text-base font-medium text-foreground">
                {currentlyRunning.runtimeVersion || "未知"}
              </Text>
            </View>

            {updateInfo.hasUpdate && (
              <View className="flex-row items-center justify-between">
                <Text className="text-sm text-muted-foreground">可用版本</Text>
                <Text className="text-base font-medium text-primary">
                  {updateInfo.versionName}
                </Text>
              </View>
            )}

            {lastCheckTime && (
              <View className="flex-row items-center space-x-2 mt-1">
                <Clock size={14} className="text-muted-foreground" />
                <Text className="text-xs text-muted-foreground">
                  上次检查: {new Date(lastCheckTime).toLocaleString("zh-CN")}
                </Text>
              </View>
            )}
          </View>

          {/* 错误提示 */}
          {error && (
            <Animated.View entering={BounceIn.duration(400)} exiting={FadeOut}>
              <Alert
                variant="destructive"
                className="border border-destructive/30"
              >
                <AlertCircle className="h-4 w-4" />
                <AlertTitle className="font-medium">更新出错</AlertTitle>
                <AlertDescription className="text-sm">
                  {error}
                  {retryCount > 0 && (
                    <Text className="text-xs mt-1 opacity-80">
                      已重试 {retryCount} 次
                    </Text>
                  )}
                </AlertDescription>
              </Alert>
            </Animated.View>
          )}

          {/* 下载进度 */}
          {isDownloading && (
            <Animated.View
              className="space-y-2"
              entering={SlideInDown.springify()}
            >
              <View className="h-3 w-full bg-muted/30 rounded-full overflow-hidden">
                <AnimatedProgress
                  value={downloadProgress}
                  className="h-full"
                  style={progressStyle}
                />
              </View>

              <View className="flex-row items-center justify-between">
                <Text className="text-xs text-muted-foreground">
                  正在下载更新...
                </Text>
                <Text className="text-xs font-medium">
                  {Math.round(downloadProgress)}%
                </Text>
              </View>
            </Animated.View>
          )}

          {/* 下载完成指示器 */}
          {hasCompletedDownload && !isDownloading && (
            <Animated.View
              style={downloadCompleteStyle}
              className="flex-row items-center space-x-2 bg-emerald-500/10 p-3 rounded-lg"
            >
              <Animated.View style={checkmarkStyle}>
                <CheckCircle2 size={18} className="text-emerald-500" />
              </Animated.View>
              <Text className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                更新已下载完成，重启应用后生效
              </Text>
            </Animated.View>
          )}

          {/* 更新详情切换按钮 */}
          {updateInfo.hasUpdate && (
            <AnimatedPressable
              onPress={toggleDetails}
              className={`flex-row items-center justify-between py-2 px-3 rounded-lg ${
                activeSection === "details"
                  ? "bg-primary/10 border border-primary/20"
                  : "bg-muted/20"
              }`}
              accessibilityRole="button"
              accessibilityLabel="更新详情"
              accessibilityHint={
                activeSection === "overview" ? "查看更多信息" : "返回概览"
              }
            >
              <View className="flex-row items-center space-x-2">
                <Info size={16} className="text-primary" />
                <Text className="text-sm font-medium text-primary">
                  {activeSection === "overview" ? "查看更新详情" : "查看概览"}
                </Text>
              </View>
              <ChevronRight
                size={16}
                className="text-primary"
                style={{
                  transform: [
                    { rotate: activeSection === "details" ? "90deg" : "0deg" },
                  ],
                }}
              />
            </AnimatedPressable>
          )}

          {/* 更新详情区域 */}
          {updateInfo.hasUpdate && renderUpdateDetails()}
        </CardContent>

        <CardFooter className="p-4 pt-2">
          {/* 操作按钮组 */}
          <AnimatedView style={actionButtonsStyle} className="space-y-3 w-full">
            <AnimatedButton
              onPress={() => handleButtonPress(checkForUpdate)}
              disabled={isChecking}
              style={buttonStyle}
              className="w-full"
              variant={updateInfo.hasUpdate ? "outline" : "default"}
              accessibilityLabel="检查更新"
              accessibilityHint="检查是否有新版本可用"
              accessibilityState={{ busy: isChecking }}
            >
              <Animated.View style={rotateStyle}>
                {isChecking ? (
                  <Loader2 className="mr-2 h-4 w-4" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
              </Animated.View>
              <Text>{isChecking ? "检查中..." : "检查更新"}</Text>
            </AnimatedButton>

            {updateInfo.hasUpdate && (
              <>
                <AnimatedButton
                  onPress={() => handleButtonPress(downloadUpdate)}
                  disabled={isDownloading || hasCompletedDownload}
                  style={buttonStyle}
                  className="w-full"
                  variant="default"
                  accessibilityLabel={isDownloading ? "正在下载" : "下载更新"}
                  accessibilityHint="下载最新版本"
                  accessibilityState={{
                    busy: isDownloading,
                    disabled: hasCompletedDownload,
                  }}
                >
                  {isDownloading ? (
                    <Pause className="mr-2 h-4 w-4" />
                  ) : (
                    <FileDown className="mr-2 h-4 w-4" />
                  )}
                  <Text>
                    {isDownloading
                      ? "下载中..."
                      : hasCompletedDownload
                      ? "已下载"
                      : "下载更新"}
                  </Text>
                </AnimatedButton>

                {hasCompletedDownload && (
                  <AnimatedButton
                    onPress={() => handleButtonPress(reloadApp)}
                    style={buttonStyle}
                    className="w-full"
                    variant="default"
                    accessibilityLabel="重启应用"
                    accessibilityHint="重启应用以应用更新"
                  >
                    <RotateCw className="mr-2 h-4 w-4" />
                    <Text>重启应用</Text>
                  </AnimatedButton>
                )}
              </>
            )}
          </AnimatedView>
        </CardFooter>
      </AnimatedCard>
    </ScrollView>
  );
}
