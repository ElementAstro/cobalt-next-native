import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  ScrollView,
  useWindowDimensions,
  Dimensions,
  Platform,
} from "react-native";
import { useTranslation } from "react-i18next";
import * as Clipboard from "expo-clipboard";
import * as MediaLibrary from "expo-media-library";
import * as Haptics from "expo-haptics";
import * as Application from "expo-application";
import * as Device from "expo-device";
import { captureRef } from "react-native-view-shot";
import { toast } from "sonner-native";
import {
  Frown,
  RefreshCcw,
  Home,
  Copy,
  Camera,
  Telescope,
  AlertTriangle,
  Bug,
  Share2,
  Terminal,
  Database,
} from "lucide-react-native";
import Animated, {
  FadeIn,
  SlideInUp,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  withDelay,
  SharedValue,
  interpolate,
  Extrapolate,
  useSharedValue,
} from "react-native-reanimated";
import { Button } from "~/components/ui/button";
import { Progress } from "~/components/ui/progress";
import { Text } from "~/components/ui/text";
import { Card, CardHeader, CardTitle, CardContent } from "~/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";

export const config404 = {
  errorCode: "404_PAGE_NOT_FOUND",
  errorMessage: "页面未找到",
  collectingInfoText: "正在收集错误信息...",
  homeButtonText: "返回首页",
  reloadButtonText: "重新加载页面",
  backgroundColor: "",
  textColor: "text-white",
  errorDetailsText: "查看详细错误信息",
  feedbackText: "提交错误反馈",
  reportErrorText: "报告错误",
  copyErrorText: "复制错误信息",
  copiedText: "已复制",
  systemInfoText: "系统信息",
  screenshotText: "截图",
  screenshotSuccessText: "截图已保存",
  screenshotErrorText: "截图失败",
  theme: "dark",
};

interface BlueScreen404Props {
  error?: Error;
  errorInfo?: React.ErrorInfo;
  isErrorBoundary?: boolean;
}

const ErrorDetails = React.memo(
  ({ errorDetails, onCopy }: { errorDetails: string; onCopy: () => void }) => {
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }));

    const handlePress = async () => {
      scale.value = withSequence(withSpring(0.95), withSpring(1));
      onCopy();
    };

    return (
      <Animated.View
        entering={SlideInUp.springify().damping(15)}
        style={animatedStyle}
      >
        <Card className="border-gray-800 rounded-xl">
          <CardContent className="p-4">
            <ScrollView
              className="p-3 rounded-lg bg-background/10 backdrop-blur-lg"
              style={{ maxHeight: 200 }}
            >
              <Text className="text-xs font-mono text-foreground leading-5">
                {errorDetails}
              </Text>
            </ScrollView>
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 rounded-full"
              onPress={handlePress}
            >
              <Copy size={16} />
            </Button>
          </CardContent>
        </Card>
      </Animated.View>
    );
  }
);

export default function BlueScreen404({
  error,
  errorInfo,
  isErrorBoundary = false,
}: BlueScreen404Props) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const [progress, setProgress] = useState(0);
  const [showContent, setShowContent] = useState(false);
  const [copied, setCopied] = useState(false);
  const [screenshotStatus, setScreenshotStatus] = useState<
    "idle" | "success" | "error"
  >("idle");

  const progressAnimation = useSharedValue(0);
  const contentAnimation = useSharedValue(0);

  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (showContent) {
      const interval = setInterval(() => {
        setProgress((prev) => (prev < 100 ? prev + 1 : 100));
      }, 30);
      return () => clearInterval(interval);
    }
  }, [showContent]);

  useEffect(() => {
    if (showContent) {
      progressAnimation.value = withTiming(progress / 100, { duration: 300 });
      contentAnimation.value = withSpring(1, {
        damping: 15,
        stiffness: 100,
      });
    }
  }, [showContent, progress]);

  const errorDetails = useMemo(() => {
    const deviceInfo = {
      brand: Device.brand,
      deviceName: Device.deviceName,
      modelName: Device.modelName,
      osName: Device.osName,
      osVersion: Device.osVersion,
      platformApiLevel: Device.platformApiLevel,
    };

    const appInfo = {
      nativeAppVersion: Application.nativeApplicationVersion,
      nativeBuildVersion: Application.nativeBuildVersion,
    };

    return `
  === 错误信息 ===
  时间: ${new Date().toLocaleString()}
  错误代码: ${
    isErrorBoundary ? error?.name || "UNKNOWN_ERROR" : config404.errorCode
  }
  错误消息: ${error?.message || config404.errorMessage}
  
  === 应用信息 ===
  版本: ${appInfo.nativeAppVersion}
  构建号: ${appInfo.nativeBuildVersion}
  
  === 设备信息 ===
  品牌: ${deviceInfo.brand}
  型号: ${deviceInfo.modelName}
  设备名: ${deviceInfo.deviceName}
  系统: ${deviceInfo.osName} ${deviceInfo.osVersion}
  API等级: ${deviceInfo.platformApiLevel}
  屏幕: ${Math.round(Dimensions.get("window").width)}x${Math.round(
      Dimensions.get("window").height
    )}
  平台: ${Platform.OS} ${Platform.Version}
  
  === 堆栈信息 ===
  ${errorInfo ? `组件堆栈:\n${errorInfo.componentStack}` : ""}
  ${error?.stack ? `错误堆栈:\n${error.stack}` : ""}
  `.trim();
  }, [error, errorInfo, isErrorBoundary, config404.errorCode]);

  const handleCopyError = useCallback(async () => {
    try {
      await Clipboard.setStringAsync(errorDetails);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.success("错误信息已复制到剪贴板");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("复制失败", {
        description: "请重试",
        icon: <AlertTriangle size={20} />,
      });
    }
  }, [errorDetails]);

  const handleTakeScreenshot = useCallback(async () => {
    try {
      setScreenshotStatus("idle");
      const { status } = await MediaLibrary.requestPermissionsAsync();

      if (status !== "granted") {
        toast.error("需要权限", {
          description: "请授予保存图片的权限",
        });
        return;
      }

      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const uri = await captureRef(viewRef, {
        format: "png",
        quality: 1,
      });
      await MediaLibrary.saveToLibraryAsync(uri);

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.success("截图已保存到相册");
      setScreenshotStatus("success");
    } catch (error) {
      toast.error("截图失败", {
        description: "请重试",
        icon: <AlertTriangle size={20} />,
      });
      setScreenshotStatus("error");
    }
  }, []);

  const viewRef = React.useRef(null);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${interpolate(
      progressAnimation.value,
      [0, 1],
      [0, 100],
      Extrapolate.CLAMP
    )}%`,
    opacity: interpolate(
      progressAnimation.value,
      [0, 0.2, 1],
      [0.5, 1, 1],
      Extrapolate.CLAMP
    ),
  }));

  const contentStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(
          contentAnimation.value,
          [0, 1],
          [50, 0],
          Extrapolate.CLAMP
        ),
      },
    ],
    opacity: contentAnimation.value,
  }));

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{
        flexGrow: 1,
        paddingVertical: 20,
        paddingHorizontal: 16,
      }}
    >
      <Animated.View
        ref={viewRef}
        entering={FadeIn.duration(800)}
        className="w-full space-y-6"
      >
        <Card className="border-gray-800 rounded-xl">
          <CardHeader className="pb-2 px-4 pt-4">
            <View className="flex-row items-center space-x-3">
              <Frown size={32} className="text-red-400" />
              <CardTitle className="text-xl font-bold text-foreground">
                {isErrorBoundary ? t("fatalAppError") : t("fatalSystemError")}
              </CardTitle>
            </View>
          </CardHeader>

          <CardContent className="space-y-4 p-4">
            <View className="space-y-2">
              <Text className="text-sm text-foreground">
                {t("errorCode")}:{" "}
                <Text className="font-mono text-red-400">
                  {isErrorBoundary
                    ? error?.name || "UNKNOWN_ERROR"
                    : config404.errorCode}
                </Text>
              </Text>
              <Text className="text-sm text-foreground">
                {t("errorMessage")}:{" "}
                <Text className="text-red-300">
                  {error?.message || config404.errorMessage}
                </Text>
              </Text>
            </View>

            <View className="space-y-2">
              <Animated.View style={progressStyle}>
                <Progress value={progress} className="h-2.5 rounded-full" />
              </Animated.View>
              <Text className="text-xs text-gray-400">
                {t("collectingInfoText")} {progress}% {t("completed")}
              </Text>
            </View>
          </CardContent>
        </Card>

        <Animated.View style={contentStyle} className="space-y-4">
          <Accordion type="single" collapsible className="space-y-2">
            <AccordionItem value="error-details">
              <AccordionTrigger>
                <View className="flex-row items-center space-x-2">
                  <Bug size={16} />
                  <Text>{t("viewErrorDetails")}</Text>
                </View>
              </AccordionTrigger>
              <AccordionContent>
                <ErrorDetails
                  errorDetails={errorDetails}
                  onCopy={handleCopyError}
                />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="system-info">
              <AccordionTrigger>
                <View className="flex-row items-center space-x-2">
                  <Terminal size={16} />
                  <Text>{t("systemInfo")}</Text>
                </View>
              </AccordionTrigger>
              <AccordionContent>{/* System info content */}</AccordionContent>
            </AccordionItem>
          </Accordion>

          <View className="flex-col space-y-3">
            <Button
              variant="secondary"
              className="h-12 rounded-xl"
              onPress={() => {
                Haptics.impactAsync();
                // navigation logic
              }}
            >
              <Home size={18} className="mr-2" />
              <Text className="font-medium">{t("homeButtonText")}</Text>
            </Button>

            <Button
              variant="secondary"
              className="h-12 rounded-xl"
              onPress={() => {
                Haptics.impactAsync();
                // reload logic
              }}
            >
              <RefreshCcw size={18} className="mr-2" />
              <Text className="font-medium">{t("reloadButtonText")}</Text>
            </Button>

            <Button
              variant="secondary"
              className="h-12 rounded-xl"
              onPress={handleTakeScreenshot}
              disabled={screenshotStatus !== "idle"}
            >
              <Camera size={18} className="mr-2" />
              <Text className="font-medium">
                {screenshotStatus === "success"
                  ? t("screenshotSuccessText")
                  : screenshotStatus === "error"
                  ? t("screenshotErrorText")
                  : t("screenshotText")}
              </Text>
            </Button>
          </View>
        </Animated.View>
      </Animated.View>
    </ScrollView>
  );
}
