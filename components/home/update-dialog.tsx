import React, { useEffect, useState, useRef, useCallback } from "react";
import { View, Pressable, ScrollView } from "react-native";
import * as Updates from "expo-updates";
import { create } from "zustand";
import { persist } from "zustand/middleware";
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
} from "lucide-react-native";
import { Alert, AlertTitle, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Progress } from "~/components/ui/progress";
import { Text } from "~/components/ui/text";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent } from "~/components/ui/card";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeIn,
  FadeOut,
  SlideInUp,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  withRepeat,
  Easing,
  interpolate,
  useSharedValue,
} from "react-native-reanimated";

type BaseStatus = "idle" | "checking" | "installing";
type DownloadStatus = "downloading" | "paused";
type UpdateStatus = BaseStatus | DownloadStatus;

const isDownloadStatus = (status: UpdateStatus): status is DownloadStatus => {
  return status === "downloading" || status === "paused";
};

type ValidTransition<T extends UpdateStatus> = {
  readonly [K in UpdateStatus]: ReadonlyArray<UpdateStatus>;
};

const validTransitions: ValidTransition<UpdateStatus> = {
  idle: ["checking", "downloading"],
  checking: ["idle", "downloading"],
  downloading: ["paused", "installing", "idle"],
  paused: ["downloading", "idle"],
  installing: ["idle"],
} as const;

interface UpdateState {
  lastCheckTime: number | null;
  setLastCheckTime: (time: number) => void;
  updateStatus: UpdateStatus;
  setUpdateStatus: (status: UpdateStatus) => void;
}

const useUpdateStore = create<UpdateState>()(
  persist(
    (set) => ({
      lastCheckTime: null,
      setLastCheckTime: (time) => set({ lastCheckTime: time }),
      updateStatus: "idle",
      setUpdateStatus: (status) => set({ updateStatus: status }),
    }),
    {
      name: "update-storage",
    }
  )
);

const AnimatedAlert = Animated.createAnimatedComponent(Alert);
const AnimatedButton = Animated.createAnimatedComponent(Pressable);
const AnimatedCard = Animated.createAnimatedComponent(Card);

interface InstallProgress {
  status: "preparing" | "downloading" | "validating" | "installing";
  progress: number;
}

// 网络测试相关类型定义
interface NetworkSpeed {
  download: number;
  upload: number;
}

const NetworkSpeedSchema = {
  parse: (data: any): NetworkSpeed => {
    if (!data || typeof data.download !== 'number' || typeof data.upload !== 'number') {
      throw new Error('Invalid network speed data');
    }
    return data as NetworkSpeed;
  }
};

// 网络测速函数
const testNetworkSpeed = async (): Promise<NetworkSpeed> => {
  // 模拟网络测试
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        download: Math.random() * 100,
        upload: Math.random() * 50
      });
    }, 1000);
  });
};

export default function UpdateDialog() {
  const { 
    lastCheckTime, 
    setLastCheckTime, 
    updateStatus, 
    setUpdateStatus 
  } = useUpdateStore();
  
  const {
    currentlyRunning,
    isUpdateAvailable,
    isUpdatePending,
    isChecking,
    isDownloading,
    downloadError,
    checkError,
    availableUpdate,
  } = Updates.useUpdates();

  const buttonScale = useSharedValue(1);
  const contentScale = useSharedValue(0.95);
  const progressValue = useSharedValue(0);
  const rotateValue = useSharedValue(0);
  const downloadProgress = useSharedValue(0);

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const downloadController = useRef<AbortController | null>(null);

  const [installProgress, setInstallProgress] = useState<InstallProgress>({
    status: "preparing",
    progress: 0,
  });
  const retryTimeoutRef = useRef<NodeJS.Timeout>();
  const MAX_AUTO_RETRIES = 3;
  const [autoRetryCount, setAutoRetryCount] = useState(0);

  const canTransitionTo = (from: UpdateStatus, to: UpdateStatus): boolean => {
    return validTransitions[from].includes(to);
  };

  const safeSetUpdateStatus = (newStatus: UpdateStatus): boolean => {
    if (canTransitionTo(updateStatus, newStatus)) {
      setUpdateStatus(newStatus);
      return true;
    }
    console.error(`Invalid state transition from ${updateStatus} to ${newStatus}`);
    return false;
  };

  useEffect(() => {
    contentScale.value = withSpring(1, {
      damping: 15,
      stiffness: 100,
      mass: 0.8,
    });
    
    if (isUpdateAvailable) {
      rotateValue.value = withRepeat(
        withTiming(360, { duration: 3000, easing: Easing.linear }),
        -1,
        false
      );
    }
  }, [isUpdateAvailable]);

  const resetUpdateState = () => {
    safeSetUpdateStatus("idle");
    progressValue.value = withTiming(0);
    downloadProgress.value = withTiming(0);
    downloadController.current = null;
  };

  const handleButtonPress = async (action: () => Promise<void>) => {
    try {
      buttonScale.value = withSequence(
        withSpring(0.95, { damping: 10, stiffness: 100 }),
        withSpring(1, { damping: 10, stiffness: 100 })
      );
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await action();
    } catch (error) {
      console.error(error);
    }
  };

  const checkForUpdate = async () => {
    try {
      setIsLoading(true);
      safeSetUpdateStatus("checking");
      toast.loading("正在检查更新...");
      await Updates.checkForUpdateAsync();
      setLastCheckTime(Date.now());

      if (isUpdateAvailable) {
        toast.success("发现新版本", {
          description: "请点击下载更新按钮开始更新",
        });
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        toast.info("已是最新版本");
      }
    } catch (error) {
      console.error("检查更新失败:", error);
      toast.error("检查更新失败", {
        description: error instanceof Error ? error.message : "未知错误",
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
      safeSetUpdateStatus("idle");
    }
  };

  const downloadUpdate = async () => {
    try {
      if (isDownloadStatus(updateStatus)) {
        const newStatus = updateStatus === "downloading" ? "paused" as const : "downloading" as const;
        if (safeSetUpdateStatus(newStatus)) {
          toast.info(newStatus === "paused" ? "已暂停下载" : "继续下载");
          await Haptics.impactAsync();
        }
        return;
      }

      safeSetUpdateStatus("downloading");
      toast.loading("正在下载更新...");
      downloadController.current = new AbortController();

      const totalChunks = 10;
      for (let i = 0; i < totalChunks; i++) {
        if (downloadController.current?.signal.aborted) {
          throw new Error("下载已取消");
        }

        const progress = (i + 1) / totalChunks;
        downloadProgress.value = withTiming(progress, {
          duration: 500,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
        });
        progressValue.value = withTiming(progress * 0.7, {
          duration: 500,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
        });

        await new Promise((resolve) => setTimeout(resolve, 500));

        if (updateStatus === "paused") {
          await new Promise((resolve) => {
            const interval = setInterval(() => {
              if (updateStatus === "downloading") {
                clearInterval(interval);
                resolve(null);
              }
            }, 100);
          });
        }
      }

      safeSetUpdateStatus("installing");
      progressValue.value = withTiming(0.9, { duration: 500 });
      toast.loading("正在安装更新...");

      await new Promise((resolve) => setTimeout(resolve, 800));
      progressValue.value = withTiming(1, { duration: 300 });

      toast.success("更新完成，即将重启应用");
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await Updates.reloadAsync();
    } catch (error) {
      console.error("更新失败:", error);
      if (error instanceof Error && error.message === "下载已取消") {
        toast.info("已取消更新");
      } else {
        toast.error("更新失败", {
          description: error instanceof Error ? error.message : "未知错误",
        });
      }
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      resetUpdateState();
    }
  };

  const handlePauseResume = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isDownloadStatus(updateStatus)) {
      const newStatus = updateStatus === "downloading" ? "paused" as const : "downloading" as const;
      if (safeSetUpdateStatus(newStatus)) {
        toast.info(newStatus === "paused" ? "已暂停" : "继续下载");
      }
    }
  };

  const handleCancel = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (downloadController.current) {
      downloadController.current.abort();
    }
    resetUpdateState();
  };

  const handleInstallError = useCallback(async (error: Error) => {
    if (autoRetryCount < MAX_AUTO_RETRIES) {
      setAutoRetryCount(prev => prev + 1);
      toast.info(`安装失败，${5 * autoRetryCount}秒后自动重试`);
      retryTimeoutRef.current = setTimeout(() => {
        handleSpeedTest();
      }, 5000 * autoRetryCount);
    } else {
      setError(error.message);
      toast.error("安装失败，请手动重试");
    }
  }, [autoRetryCount]);

  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  const updateInstallProgress = (status: InstallProgress["status"], progress: number) => {
    setInstallProgress({ status, progress });
    progressValue.value = withTiming(progress, {
      duration: 300,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
    });
  };

  const handleSpeedTest = useCallback(async () => {
    try {
      updateInstallProgress("downloading", 0.3);
      const result = await testNetworkSpeed();
      updateInstallProgress("validating", 0.6);
      const validated = NetworkSpeedSchema.parse(result);
      updateInstallProgress("installing", 0.9);
    } catch (error) {
      handleInstallError(error instanceof Error ? error : new Error("未知错误"));
    }
  }, []); // 移除循环依赖

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const rotateStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotateValue.value}deg` }],
  }));

  return (
    <ScrollView
      className="flex-1"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        flexGrow: 1,
        paddingHorizontal: 16,
        paddingVertical: 20,
        gap: 16,
      }}
    >
      {/* 版本信息卡片 */}
      <AnimatedCard
        entering={SlideInUp.springify()}
        className="overflow-hidden rounded-2xl border-2 border-border/30 bg-gradient-to-br from-card/95 to-card/90"
      >
        <CardContent className="p-6 space-y-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center space-x-3">
              <Animated.View style={rotateStyle}>
                <Package size={24} className="text-primary" />
              </Animated.View>
              <Text className="text-xl font-semibold text-foreground">
                版本信息
              </Text>
            </View>
            {isUpdateAvailable && (
              <Badge
                className="bg-primary/90 hover:bg-primary"
                variant="default"
              >
                有新版本
              </Badge>
            )}
          </View>

          <View className="space-y-2">
            <View className="flex-row items-center justify-between">
              <Text className="text-base text-muted-foreground">当前版本</Text>
              <Text className="text-base font-medium text-foreground">
                {currentlyRunning.runtimeVersion || "未知"}
              </Text>
            </View>
            {lastCheckTime && (
              <View className="flex-row items-center space-x-2">
                <Clock size={16} className="text-muted-foreground" />
                <Text className="text-sm text-muted-foreground">
                  上次检查: {new Date(lastCheckTime).toLocaleString()}
                </Text>
              </View>
            )}
          </View>
        </CardContent>
      </AnimatedCard>

      {/* 操作按钮组 */}
      <View className="space-y-3 w-full">
        <AnimatedButton
          onPress={() => handleButtonPress(checkForUpdate)}
          disabled={isChecking}
          style={buttonStyle}
          className="w-full"
        >
          <Button
            variant="outline"
            className="w-full h-12 rounded-xl border-2 disabled:opacity-70"
            disabled={isChecking}
          >
            <RefreshCw
              size={20}
              className={`
                mr-2
                ${isChecking ? "animate-spin text-primary" : "text-foreground"}
              `}
            />
            <Text className="font-medium text-base">
              {isChecking ? "检查中..." : "检查更新"}
            </Text>
          </Button>
        </AnimatedButton>

        {isUpdateAvailable && (
          <View className="flex-row space-x-2">
            <AnimatedButton
              entering={FadeIn}
              exiting={FadeOut}
              onPress={() => handleButtonPress(downloadUpdate)}
              disabled={updateStatus === "installing"}
              style={[buttonStyle, { flex: 1 }]}
            >
              <Button
                className="w-full h-12 rounded-xl disabled:opacity-70"
                disabled={updateStatus === "installing"}
              >
                <Download
                  size={20}
                  className={`
                    mr-2
                    ${updateStatus === "downloading" 
                      ? "animate-pulse text-primary-foreground" 
                      : "text-primary-foreground"}
                  `}
                />
                <Text className="font-medium text-base text-primary-foreground">
                  {(() => {
                    switch (updateStatus) {
                      case "downloading":
                        return `下载中 ${Math.round(downloadProgress.value * 100)}%`;
                      case "paused":
                        return "继续下载";
                      case "installing":
                        return "安装中...";
                      default:
                        return "下载更新";
                    }
                  })()}
                </Text>
              </Button>
            </AnimatedButton>

            {isDownloadStatus(updateStatus) && (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-12 w-12 rounded-xl border-2"
                  onPress={handlePauseResume}
                >
                  {updateStatus === "downloading" ? (
                    <Pause size={20} className="text-primary" />
                  ) : (
                    <Play size={20} className="text-primary" />
                  )}
                </Button>

                <Button
                  variant="destructive"
                  size="icon"
                  className="h-12 w-12 rounded-xl"
                  onPress={handleCancel}
                >
                  <X size={20} />
                </Button>
              </>
            )}
          </View>
        )}
      </View>

      {/* 更新信息 */}
      {isUpdateAvailable && availableUpdate && (
        <Animated.View
          entering={SlideInUp.springify()}
          className="space-y-4 w-full"
        >
          <Alert
            icon={Info}
            className="rounded-2xl bg-primary/10 border-2 border-primary/20"
          >
            <View className="flex-row items-start space-x-3">
              <View className="flex-1 space-y-2">
                <AlertTitle className="text-lg font-semibold text-primary">
                  发现新版本
                </AlertTitle>
                <AlertDescription className="space-y-2">
                  <Text className="text-base text-foreground">
                    版本: {availableUpdate.manifest?.id || "未知"}
                  </Text>
                  <Text className="text-sm text-muted-foreground">
                    发布时间:{" "}
                    {new Date(availableUpdate.createdAt).toLocaleDateString()}
                  </Text>
                </AlertDescription>
              </View>
            </View>
          </Alert>

          {/* 进度条 */}
          {(updateStatus === "downloading" || updateStatus === "installing") && (
            <Animated.View 
              entering={FadeIn.duration(300)} 
              className="space-y-3"
            >
              <Progress
                value={progressValue.value * 100}
                className="h-2 native:h-3 rounded-full bg-primary/20"
                indicatorClassName="transition-all ease-out duration-500"
              />
              <Text className="text-sm text-center text-muted-foreground">
                {updateStatus === "installing" ? "正在安装..." : "正在下载..."}
              </Text>
            </Animated.View>
          )}
        </Animated.View>
      )}

      {/* 错误提示 */}
      {(checkError || downloadError) && (
        <AnimatedAlert
          variant="destructive"
          icon={AlertCircle}
          className="rounded-2xl border-2 border-destructive/30"
          entering={SlideInUp.springify()}
        >
          <View className="flex-row items-start space-x-3">
            <View className="flex-1 space-y-1">
              <AlertTitle className="text-lg font-semibold text-destructive">
                {checkError ? "检查失败" : "下载失败"}
              </AlertTitle>
              <AlertDescription className="text-base text-destructive/90">
                {(checkError || downloadError)?.message}
              </AlertDescription>
            </View>
          </View>
        </AnimatedAlert>
      )}
    </ScrollView>
  );
}
