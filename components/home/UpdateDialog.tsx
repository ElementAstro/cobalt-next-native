import React, { useEffect } from "react";
import { View } from "react-native";
import * as Updates from "expo-updates";
import { toast } from "sonner-native";
import { Download, RefreshCw, AlertCircle, Check } from "lucide-react-native";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Text } from "@/components/ui/text";

export default function UpdateDialog() {
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

  useEffect(() => {
    if (isUpdatePending) {
      toast.info("更新已就绪", {
        description: "新版本已下载完成,重启应用即可完成更新",
        action: {
          label: "立即重启",
          onClick: async () => {
            try {
              await Updates.reloadAsync();
            } catch (error: unknown) {
              console.error("重启应用失败:", error);
              toast.error("重启失败", {
                description: "请手动重启应用",
              });
            }
          },
        },
      });
    }
  }, [isUpdatePending]);

  const checkForUpdate = async () => {
    try {
      await Updates.checkForUpdateAsync();
    } catch (error: unknown) {
      console.error("检查更新失败:", error);
      toast.error("检查失败", {
        description: error instanceof Error ? error.message : "未知错误",
      });
    }
  };

  const downloadUpdate = async () => {
    try {
      await Updates.fetchUpdateAsync();
    } catch (error: unknown) {
      console.error("下载更新失败:", error);
      toast.error("下载失败", {
        description: error instanceof Error ? error.message : "未知错误",
      });
    }
  };

  return (
    <View className="w-full rounded-lg bg-card p-4">
      {/* 当前版本信息 */}
      <Alert icon={Check} className="mb-4">
        <AlertTitle>版本信息</AlertTitle>
        <AlertDescription>
          当前版本: {currentlyRunning.runtimeVersion || "未知"}
          {isUpdateAvailable ? "\n有新版本可用" : "\n已是最新版本"}
        </AlertDescription>
      </Alert>

      {/* 检查更新按钮 - 使用更小的尺寸 */}
      <Button
        variant="outline"
        size="sm"
        onPress={checkForUpdate}
        disabled={isChecking}
        className="mb-4"
      >
        <RefreshCw className={isChecking ? "animate-spin" : ""} size={16} />
        <Text className="ml-2">{isChecking ? "检查中..." : "检查更新"}</Text>
      </Button>

      {/* 可用更新信息 - 只在有更新时显示 */}
      {isUpdateAvailable && availableUpdate && (
        <>
          <Alert icon={Download} className="mb-4">
            <AlertTitle>发现新版本</AlertTitle>
            <AlertDescription>
              版本: {availableUpdate.manifest?.id || "未知"}
              {"\n"}
              发布时间: {new Date(availableUpdate.createdAt).toLocaleDateString()}
            </AlertDescription>
          </Alert>

          {/* 下载按钮和进度 */}
          <View className="space-y-2">
            <Button 
              size="sm"
              onPress={downloadUpdate} 
              disabled={isDownloading}
            >
              <Download size={16} className={isDownloading ? "animate-pulse" : ""} />
              <Text className="ml-2">
                {isDownloading ? "下载中..." : "下载更新"}
              </Text>
            </Button>

            {isDownloading && <Progress value={50} className="h-1" />}
          </View>
        </>
      )}

      {/* 错误提示 - 统一处理检查和下载错误 */}
      {(checkError || downloadError) && (
        <Alert variant="destructive" icon={AlertCircle} className="mt-4">
          <AlertTitle>
            {checkError ? "检查失败" : "下载失败"}
          </AlertTitle>
          <AlertDescription>
            {(checkError || downloadError)?.message}
          </AlertDescription>
        </Alert>
      )}
    </View>
  );
}
