// components/DownloadItem.tsx
import React, { useCallback, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ViewStyle,
  StyleProp,
} from "react-native";
import {
  Play,
  Pause,
  RefreshCw,
  X,
  AlertCircle,
  CheckCircle,
  Clock,
  Download,
  FileDown,
} from "lucide-react-native";
import { formatBytes, formatDuration } from "./format";
import type { DownloadTask } from "./types";
import { downloadManager } from "./download";
import { toast } from "sonner-native";
import Animated, {
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";

interface DownloadItemProps {
  task: DownloadTask;
  style?: StyleProp<ViewStyle>;
}

export const DownloadItem = React.memo<DownloadItemProps>(({ task, style }) => {
  const { filename, status, progress, speed, size, downloadedSize, error } =
    task;

  const timeRemaining = useMemo(() => {
    if (status !== "downloading" || speed === 0) return null;
    const remaining = (size - downloadedSize) / speed;
    return formatDuration(remaining);
  }, [status, speed, size, downloadedSize]);

  const statusConfig = useMemo(() => {
    const configs = {
      pending: {
        color: "text-gray-400",
        icon: <Clock size={20} color="#9CA3AF" />,
        bg: "bg-gray-50",
      },
      downloading: {
        color: "text-blue-500",
        icon: <Download size={20} color="#3B82F6" />,
        bg: "bg-blue-100",
      },
      completed: {
        color: "text-green-500",
        icon: <CheckCircle size={20} color="#10B981" />,
        bg: "bg-green-100",
      },
      error: {
        color: "text-red-500",
        icon: <AlertCircle size={20} color="#EF4444" />,
        bg: "bg-red-100",
      },
      paused: {
        color: "text-gray-500",
        icon: <Clock size={20} color="#6B7280" />,
        bg: "bg-gray-100",
      },
      canceled: {
        color: "text-gray-400",
        icon: <X size={20} color="#9CA3AF" />,
        bg: "bg-gray-50",
      },
    } as const;
    return configs[status] || configs.error;
  }, [status]);

  const progressAnimStyle = useAnimatedStyle(() => ({
    width: `${progress * 100}%`,
    transform: [
      {
        scale: withSpring(status === "downloading" ? 1 : 0.8),
      },
    ],
  }));

  const handlePause = useCallback(() => {
    downloadManager.pauseDownload(task.id);
    toast("已暂停下载", {
      description: filename,
      icon: <Pause size={20} color="#6B7280" />,
      duration: 2000,
    });
  }, [task.id, filename]);

  const handleResume = useCallback(() => {
    downloadManager.resumeDownload(task.id);
    toast("继续下载", {
      description: filename,
      icon: <Play size={20} color="#10B981" />,
      duration: 2000,
    });
  }, [task.id, filename]);

  const handleRetry = useCallback(() => {
    downloadManager.retryDownload(task.id);
    toast("重试下载", {
      description: filename,
      icon: <RefreshCw size={20} color="#3B82F6" />,
      duration: 2000,
    });
  }, [task.id, filename]);

  const handleCancel = useCallback(() => {
    Alert.alert("取消下载", "确定要取消该下载任务吗?", [
      { text: "取消", style: "cancel" },
      {
        text: "确定",
        style: "destructive",
        onPress: () => {
          downloadManager.cancelDownload(task.id);
          toast("已取消下载", {
            description: filename,
            icon: <X size={20} color="#EF4444" />,
            duration: 2000,
          });
        },
      },
    ]);
  }, [task.id, filename]);

  const renderControls = useCallback(() => {
    const controls = {
      pending: null,
      downloading: (
        <TouchableOpacity
          className={`p-2 rounded-full ${statusConfig.bg}`}
          onPress={handlePause}
        >
          <Pause size={24} color="#3B82F6" />
        </TouchableOpacity>
      ),
      paused: (
        <TouchableOpacity
          className={`p-2 rounded-full ${statusConfig.bg}`}
          onPress={handleResume}
        >
          <Play size={24} color="#10B981" />
        </TouchableOpacity>
      ),
      error: (
        <TouchableOpacity
          className={`p-2 rounded-full ${statusConfig.bg}`}
          onPress={handleRetry}
        >
          <RefreshCw size={24} color="#EF4444" />
        </TouchableOpacity>
      ),
      completed: null,
      canceled: null,
    } as const;
    return controls[status];
  }, [status, statusConfig, handlePause, handleResume, handleRetry]);

  return (
    <Animated.View
      style={[style]}
      className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm"
    >
      <View className="flex-row justify-between items-start mb-3">
        <View className="flex-row items-center flex-1 mr-2">
          <FileDown
            size={20}
            className={statusConfig.color}
            style={{ marginRight: 8 }}
          />
          <Text
            className="text-base font-medium dark:text-white"
            numberOfLines={1}
          >
            {filename}
          </Text>
        </View>
        <Text className={`text-sm ${statusConfig.color}`}>
          {status.toUpperCase()}
        </Text>
      </View>

      {status === "downloading" && (
        <>
          <Animated.View className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden mb-3">
            <Animated.View
              className="h-full bg-blue-500"
              style={progressAnimStyle}
            />
          </Animated.View>
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-sm text-gray-500 dark:text-gray-400">
              {`${formatBytes(downloadedSize)} / ${formatBytes(size)}`}
            </Text>
            <Text className="text-sm text-gray-500 dark:text-gray-400">
              {formatBytes(speed)}/s
            </Text>
          </View>
          {timeRemaining && (
            <Text className="text-xs text-gray-400 dark:text-gray-500 mb-2">
              剩余时间: {timeRemaining}
            </Text>
          )}
        </>
      )}

      {error && (
        <View className="flex-row items-center mb-3">
          <AlertCircle size={16} color="#EF4444" style={{ marginRight: 4 }} />
          <Text className="text-sm text-red-500">{error}</Text>
        </View>
      )}

      <View className="flex-row justify-between items-center">
        {renderControls()}
        <TouchableOpacity
          className="p-2 rounded-full bg-gray-100 dark:bg-gray-700"
          onPress={handleCancel}
        >
          <X size={24} color="#6B7280" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
});

DownloadItem.displayName = "DownloadItem";
