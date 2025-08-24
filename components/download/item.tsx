import React, { useCallback, useMemo } from "react";
import { View, type ViewStyle, type StyleProp } from "react-native";
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
  FilePlus,
  FileMinus,
  FileCheck,
  FileX,
} from "lucide-react-native";
import { formatBytes, formatDuration } from "./format";
import type { DownloadTask } from "./types";
import useDownloadStore from "~/stores/useDownloadStore";
import { toast } from "sonner-native";
import Animated, {
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { z } from "zod";
import { Badge } from "~/components/ui/badge";
import { Alert as UIAlert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Text } from "~/components/ui/text";
// import { ToastAction } from "sonner-native/lib/typescript/commonjs/src/types";
// Using a simple interface instead
interface ToastAction {
  label: string;
  onClick: () => void;
}

// Zod schema for download task validation
const DownloadTaskSchema = z.object({
  id: z.string(),
  filename: z.string().min(1),
  status: z.enum([
    "pending",
    "downloading",
    "completed",
    "error",
    "paused",
    "canceled",
  ]),
  progress: z.number().min(0).max(1),
  speed: z.number().min(0),
  size: z.number().min(0),
  downloadedSize: z.number().min(0),
  error: z.string().optional(),
});

interface DownloadItemProps {
  task: DownloadTask;
  style?: StyleProp<ViewStyle>;
  onRetry?: (taskId: string) => void;
  onCancel?: (taskId: string) => void;
}

export const DownloadItem = React.memo<DownloadItemProps>(({ task, style }) => {
  // Validate task data
  const validatedTask = useMemo(() => {
    try {
      return DownloadTaskSchema.parse(task);
    } catch (error) {
      console.error("Invalid download task data:", error);
      return null;
    }
  }, [task]);

  if (!validatedTask) {
    return (
      <View className="bg-red-50 p-4 rounded-xl">
        <Text className="text-red-500">Invalid download task data</Text>
      </View>
    );
  }

  const { filename, status, progress, speed, size, downloadedSize, error } =
    validatedTask;

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
        fileIcon: <FilePlus size={20} color="#9CA3AF" />,
      },
      downloading: {
        color: "text-blue-500",
        icon: <Download size={20} color="#3B82F6" />,
        bg: "bg-blue-100",
        fileIcon: <FileDown size={20} color="#3B82F6" />,
      },
      completed: {
        color: "text-green-500",
        icon: <CheckCircle size={20} color="#10B981" />,
        bg: "bg-green-100",
        fileIcon: <FileCheck size={20} color="#10B981" />,
      },
      error: {
        color: "text-red-500",
        icon: <AlertCircle size={20} color="#EF4444" />,
        bg: "bg-red-100",
        fileIcon: <FileX size={20} color="#EF4444" />,
      },
      paused: {
        color: "text-gray-500",
        icon: <Clock size={20} color="#6B7280" />,
        bg: "bg-gray-100",
        fileIcon: <FileMinus size={20} color="#6B7280" />,
      },
      canceled: {
        color: "text-gray-400",
        icon: <X size={20} color="#9CA3AF" />,
        bg: "bg-gray-50",
        fileIcon: <FileX size={20} color="#9CA3AF" />,
      },
    } as const;
    return configs[status] || configs.error;
  }, [status]);

  const progressAnimStyle = useAnimatedStyle(() => ({
    width: `${progress * 100}%`,
    transform: [
      {
        scale: withSpring(status === "downloading" ? 1 : 0.8, {
          stiffness: 100,
          damping: 10,
        }),
      },
    ],
    opacity: withTiming(status === "downloading" ? 1 : 0.8),
  }));

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: withSpring(task.status === "downloading" ? 1 : 0.8),
    transform: [
      {
        scale: withSpring(task.status === "downloading" ? 1 : 0.98),
      },
    ],
  }));

  const pauseDownload = useDownloadStore((state) => state.pauseDownload);
  const resumeDownload = useDownloadStore((state) => state.resumeDownload);
  const retryDownload = useDownloadStore((state) => state.retryDownload);
  const cancelDownload = useDownloadStore((state) => state.cancelDownload);

  const handlePause = useCallback(() => {
    pauseDownload(task.id);
    toast("已暂停下载", {
      description: filename,
      icon: <Pause size={20} color="#6B7280" />,
      duration: 2000,
    });
  }, [task.id, filename, pauseDownload]);

  const handleResume = useCallback(() => {
    resumeDownload(task.id);
    toast("继续下载", {
      description: filename,
      icon: <Play size={20} color="#10B981" />,
      duration: 2000,
    });
  }, [task.id, filename, resumeDownload]);

  const handleRetry = useCallback(() => {
    retryDownload(task.id);
    toast("重试下载", {
      description: filename,
      icon: <RefreshCw size={20} color="#3B82F6" />,
      duration: 2000,
    });
  }, [task.id, filename, retryDownload]);

  const handleCancel = useCallback(() => {
    toast("取消下载", {
      description: "确定要取消该下载任务吗?",
      action: {
        label: "确定",
        onClick: () => {
          cancelDownload(task.id);
          toast("已取消下载", {
            description: filename,
            icon: <X size={20} color="#EF4444" />,
            duration: 2000,
          });
        },
      } as ToastAction,
    });
  }, [task.id, filename, cancelDownload]);

  return (
    <Animated.View
      style={[animatedStyle]}
      className="bg-card dark:bg-card rounded-xl p-4 shadow-sm"
    >
      <View className="flex-row justify-between items-start mb-3">
        <View className="flex-row items-center flex-1 mr-2">
          {statusConfig.fileIcon}
          <Text
            className="text-base font-medium text-foreground ml-2"
            numberOfLines={1}
          >
            {filename}
          </Text>
        </View>
        <Badge
          variant={status === "error" ? "destructive" : "secondary"}
          className="ml-2"
        >
          {status.toUpperCase()}
        </Badge>
      </View>

      {status === "downloading" && (
        <>
          <Animated.View className="h-2 bg-muted rounded-full overflow-hidden mb-3">
            <Animated.View
              className="h-full bg-primary"
              style={progressAnimStyle}
            />
          </Animated.View>
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-sm text-muted-foreground">
              {`${formatBytes(downloadedSize)} / ${formatBytes(size)}`}
            </Text>
            <Text className="text-sm text-muted-foreground">
              {formatBytes(speed)}/s
            </Text>
          </View>
          {timeRemaining && (
            <Text className="text-xs text-muted-foreground mb-2">
              剩余时间: {timeRemaining}
            </Text>
          )}
        </>
      )}

      {error && (
        <UIAlert variant="destructive" icon={<AlertCircle size={16} />} className="mb-3">
          <AlertDescription>{error}</AlertDescription>
        </UIAlert>
      )}

      <View className="flex-row justify-between items-center">
        {status === "downloading" && (
          <Button variant="secondary" size="icon" onPress={handlePause}>
            <Pause size={20} />
          </Button>
        )}
        {status === "paused" && (
          <Button variant="secondary" size="icon" onPress={handleResume}>
            <Play size={20} />
          </Button>
        )}
        {status === "error" && (
          <Button variant="destructive" size="icon" onPress={handleRetry}>
            <RefreshCw size={20} />
          </Button>
        )}
        <Button variant="outline" size="icon" onPress={handleCancel}>
          <X size={20} />
        </Button>
      </View>
    </Animated.View>
  );
});

DownloadItem.displayName = "DownloadItem";
