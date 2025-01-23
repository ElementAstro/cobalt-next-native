import React, { useState, useEffect } from "react";
import { View, ScrollView, useWindowDimensions } from "react-native";
import { useTranslation } from "react-i18next";
import {
  Frown,
  RefreshCcw,
  Home,
  Copy,
  Camera,
  Telescope,
} from "lucide-react-native";
import * as Clipboard from "expo-clipboard";
import * as MediaLibrary from "expo-media-library";
import { captureRef } from "react-native-view-shot";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Text } from "@/components/ui/text";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const config404 = {
  errorCode: "404_PAGE_NOT_FOUND",
  errorMessage: "页面未找到",
  collectingInfoText: "正在收集错误信息...",
  homeButtonText: "返回首页",
  reloadButtonText: "重新加载页面",
  backgroundColor: "bg-[#0b0f19]",
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

  const handleCopyError = async () => {
    try {
      await Clipboard.setStringAsync(errorDetails);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy error details:", err);
    }
  };

  const handleTakeScreenshot = async () => {
    try {
      setScreenshotStatus("idle");
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        throw new Error("Permission denied");
      }
      const uri = await captureRef(viewRef, {
        format: "png",
        quality: 1,
      });
      await MediaLibrary.saveToLibraryAsync(uri);
      setScreenshotStatus("success");
    } catch (error) {
      console.error("Failed to take screenshot:", error);
      setScreenshotStatus("error");
    }
  };

  const viewRef = React.useRef(null);

  const errorDetails = `
    ${t("errorTime")}: ${new Date().toLocaleString()}
    ${t("browser")}: ${
    typeof navigator !== "undefined" ? navigator.userAgent : "N/A"
  }
    ${t("pageURL")}: ${
    typeof window !== "undefined" ? window.location.href : ""
  }
    ${t("errorCode")}: ${
    isErrorBoundary ? error?.name || "UNKNOWN_ERROR" : config404.errorCode
  }
    ${t("errorMessage")}: ${error?.message || config404.errorMessage}
    ${errorInfo ? `\n${t("componentStack")}:\n${errorInfo.componentStack}` : ""}
    ${error?.stack ? `\n${t("errorStack")}:\n${error.stack}` : ""}
  `.trim();

  return (
    <ScrollView
      className={`flex-1 ${config404.backgroundColor}`}
      contentContainerClassName="p-4 min-h-screen justify-center"
    >
      <View
        ref={viewRef}
        className="w-full max-w-2xl space-y-4 self-center"
        style={{ opacity: showContent ? 1 : 0 }}
      >
        <Card className="border-gray-800 bg-gray-900/50">
          <CardHeader className="pb-2">
            <View className="flex-row items-center space-x-3">
              <Frown size={32} className="text-red-400" />
              <CardTitle className="text-xl font-bold text-foreground">
                {isErrorBoundary ? t("fatalAppError") : t("fatalSystemError")}
              </CardTitle>
            </View>
          </CardHeader>

          <CardContent className="space-y-3">
            <View className="space-y-1">
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

            <View className="space-y-1">
              <Progress value={progress} className="h-2 bg-gray-800" />
              <Text className="text-xs text-gray-400">
                {t("collectingInfoText")} {progress}% {t("completed")}
              </Text>
            </View>
          </CardContent>
        </Card>

        <Accordion type="single" collapsible>
          <AccordionItem value="error-details">
            <AccordionTrigger>
              <View className="flex-row items-center space-x-2">
                <Telescope size={16} />
                <Text>{t("viewErrorDetails")}</Text>
              </View>
            </AccordionTrigger>
            <AccordionContent>
              <Card className="border-gray-800 bg-gray-900/50">
                <CardContent className="p-4">
                  <ScrollView className="bg-gray-800 p-3 rounded">
                    <Text className="text-xs text-foreground">
                      {errorDetails}
                    </Text>
                  </ScrollView>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2"
                    onPress={handleCopyError}
                  >
                    <Copy size={16} />
                  </Button>
                </CardContent>
              </Card>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <View className="flex-row flex-wrap gap-2">
          <Button
            variant="secondary"
            className="flex-1 h-12"
            onPress={() => {
              /* navigation logic */
            }}
          >
            <Home size={16} className="mr-2" />
            <Text>{t("homeButtonText")}</Text>
          </Button>

          <Button
            variant="secondary"
            className="flex-1 h-12"
            onPress={() => {
              /* reload logic */
            }}
          >
            <RefreshCcw size={16} className="mr-2" />
            <Text>{t("reloadButtonText")}</Text>
          </Button>

          <Button
            variant="secondary"
            className="w-full h-12"
            onPress={handleTakeScreenshot}
            disabled={screenshotStatus !== "idle"}
          >
            <Camera size={16} className="mr-2" />
            <Text>
              {screenshotStatus === "success"
                ? t("screenshotSuccessText")
                : screenshotStatus === "error"
                ? t("screenshotErrorText")
                : t("screenshotText")}
            </Text>
          </Button>
        </View>
      </View>
    </ScrollView>
  );
}
