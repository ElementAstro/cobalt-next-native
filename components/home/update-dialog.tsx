import React, { useEffect, useState, useCallback, useMemo } from "react";
import { View, Pressable, ScrollView } from "react-native";
import * as Updates from "expo-updates";
import type { Manifest as ExpoManifest } from "expo-updates";
import { useUpdateStore } from "../../stores/useUpdateStore";
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
  useSharedValue,
  withRepeat,
  withDelay,
  Easing,
} from "react-native-reanimated";

const AnimatedCard = Animated.createAnimatedComponent(Card);
const AnimatedButton = Animated.createAnimatedComponent(Button);

interface UpdateState {
  isChecking: boolean;
  isDownloading: boolean;
  downloadProgress: number;
  lastCheckTime: number | null;
  error: string | null;
  currentlyRunning: {
    runtimeVersion: string;
  };
  available: {
    runtimeVersion: string;
    manifest: any;
  } | null;
  setChecking: (checking: boolean) => void;
  setDownloading: (downloading: boolean) => void;
  setProgress: (progress: number) => void;
  setError: (error: string | null) => void;
  setLastCheckTime: (time: number) => void;
  setAvailableUpdate: (update: any) => void;
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

  // 动画值
  const cardScale = useSharedValue(1);
  const buttonScale = useSharedValue(1);
  const progressWidth = useSharedValue(0);
  const refreshRotation = useSharedValue(0);
  const errorShake = useSharedValue(0);

  // 优化性能：使用 useMemo 缓存计算值
  const updateInfo = useMemo(() => ({
    hasUpdate: available !== null,
    isNewer: available?.runtimeVersion && currentlyRunning.runtimeVersion
      ? available.runtimeVersion > currentlyRunning.runtimeVersion
      : false,
  }), [available, currentlyRunning]);

  // 动画样式
  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: cardScale.value },
      { translateX: withSpring(errorShake.value, { damping: 3, stiffness: 500 }) }
    ],
  }));

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  // 错误动画
  const triggerErrorAnimation = useCallback(() => {
    errorShake.value = withSequence(
      withSpring(10),
      withSpring(-10),
      withSpring(5),
      withSpring(-5),
      withSpring(0)
    );
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }, []);

  // 处理按钮点击
  const handleButtonPress = useCallback(async (action: () => Promise<void>) => {
    try {
      buttonScale.value = withSequence(
        withSpring(0.95),
        withSpring(1)
      );
      
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await action();
    } catch (error: any) {
      console.error('Update action failed:', error);
      setError(error.message);
      triggerErrorAnimation();
    }
  }, []);

  // 检查更新
  const checkForUpdate = useCallback(async () => {
    if (isChecking) return;
    
    setChecking(true);
    setError(null);
    
    try {
      refreshRotation.value = withRepeat(
        withTiming(360, { duration: 1000 }),
        -1
      );
      
      const update = await Updates.checkForUpdateAsync();
      setLastCheckTime(Date.now());
      
      if (update.isAvailable) {
        const manifest = update.manifest as any;
        setAvailableUpdate({
          runtimeVersion: manifest.runtimeVersion || manifest.metadata?.expoRuntimeVersion || "1.0.0",
          manifest: {
            ...manifest,
            version: manifest.version || manifest.metadata?.expoClient?.version || "1.0.0"
          }
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        toast.success("发现新版本", {
          description: `新版本可用`,
        });
      } else {
        toast.info("已是最新版本");
      }
    } catch (error: any) {
      console.error('Check update failed:', error);
      setError(error.message);
      triggerErrorAnimation();
    } finally {
      setChecking(false);
      refreshRotation.value = 0;
    }
  }, [isChecking]);

  // 下载更新
  const downloadUpdate = useCallback(async () => {
    if (!available || isDownloading) return;
    
    setDownloading(true);
    setError(null);
    try {
      const { manifest } = await (Updates as any).fetchUpdateAsync({
        onProgress: ({ totalBytes, downloaded }: { totalBytes: number; downloaded: number }) => {
          const progress = (downloaded / totalBytes) * 100;
          setProgress(progress);
          progressWidth.value = withSpring(progress);
        },
      });
      
      setProgress(100);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      toast.success("更新已下载", {
        description: "重启应用后生效",
      });
    } catch (error: any) {
      console.error('Download update failed:', error);
      setError(error.message);
      triggerErrorAnimation();
    } finally {
      setDownloading(false);
    }
  }, [available, isDownloading]);

  // 重启应用
  const reloadApp = useCallback(async () => {
    try {
      await Updates.reloadAsync();
    } catch (error: any) {
      console.error('Reload app failed:', error);
      setError(error.message);
      triggerErrorAnimation();
    }
  }, []);

  // 生命周期效果
  useEffect(() => {
    cardScale.value = withSequence(
      withSpring(1.02),
      withSpring(1)
    );
  }, [updateInfo.hasUpdate]);

  return (
    <ScrollView 
      className="w-full" 
      showsVerticalScrollIndicator={false}
    >
      <AnimatedCard
        style={cardStyle}
        entering={SlideInUp.springify()}
        className="overflow-hidden border-2 border-border/30 bg-card/95 backdrop-blur-xl"
      >
        <CardContent className="p-4 space-y-4">
          {/* 状态指示器 */}
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center space-x-2">
              <Package size={20} className="text-primary" />
              <Text className="text-base font-medium">系统更新</Text>
            </View>
            {updateInfo.hasUpdate && (
              <Badge className="bg-primary/90 text-primary-foreground">
                有可用更新
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

          {error && (
            <Alert variant="destructive" icon={AlertCircle}>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>更新出错</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {isDownloading && (
            <View className="space-y-2">
              <Progress value={downloadProgress} className="h-2" />
              <Text className="text-sm text-muted-foreground text-center">
                正在下载更新 ({Math.round(downloadProgress)}%)
              </Text>
            </View>
          )}
        </CardContent>
      </AnimatedCard>

      {/* 操作按钮组 */}
      <View className="space-y-3 w-full">
        <AnimatedButton
          onPress={() => handleButtonPress(checkForUpdate)}
          disabled={isChecking}
          style={buttonStyle}
          className="w-full"
          variant={updateInfo.hasUpdate ? "outline" : "default"}
        >
          <Animated.View
            style={{
              transform: [{ rotate: `${refreshRotation.value}deg` }],
            }}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
          </Animated.View>
          {isChecking ? "检查中..." : "检查更新"}
        </AnimatedButton>

        {updateInfo.hasUpdate && (
          <>
            <AnimatedButton
              onPress={() => handleButtonPress(downloadUpdate)}
              disabled={isDownloading}
              style={buttonStyle}
              className="w-full"
              variant="default"
            >
              {isDownloading ? (
                <Pause className="mr-2 h-4 w-4" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              {isDownloading ? "下载中..." : "下载更新"}
            </AnimatedButton>

            {downloadProgress === 100 && (
              <AnimatedButton
                onPress={() => handleButtonPress(reloadApp)}
                style={buttonStyle}
                className="w-full"
                variant="default"
              >
                <Play className="mr-2 h-4 w-4" />
                重启应用
              </AnimatedButton>
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
}
