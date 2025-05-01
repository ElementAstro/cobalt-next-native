import React, { useMemo, useCallback } from "react";
import { View, useWindowDimensions } from "react-native";
import { z } from "zod";
import { toast } from "sonner-native";
import {
  Download,
  Trash2,
  RefreshCw,
  Pause,
  Play,
  AlertCircle,
  FileDown,
  Clock,
  Filter,
  SortAsc,
} from "lucide-react-native";
import Animated, { FadeInDown, SlideInRight } from "react-native-reanimated";
import { Card, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Progress } from "~/components/ui/progress";
import { Alert, AlertTitle, AlertDescription } from "~/components/ui/alert";
import { Text } from "~/components/ui/text";
import useDownloadStore from "~/stores/useDownloadStore";

// 下载任务类型
interface DownloadTask {
  id: string;
  url: string;
  filename: string;
  progress: number;
  status:
    | "pending"
    | "downloading"
    | "paused"
    | "completed"
    | "error"
    | "canceled";
  startTime: number;
  updatedAt: number;
  metadata?: Record<string, unknown>;
  resumableDownload?: any | null;
  error: string | null;
}

// Props 接口定义
interface DownloadItemProps {
  item: DownloadTask;
  onRetry?: (id: string) => void;
  onPause?: (id: string) => void;
  onResume?: (id: string) => void;
  onDelete?: (id: string) => void;
}

interface DownloadListProps {
  downloads: DownloadTask[];
  isLoading: boolean;
  onRetry?: (id: string) => void;
  onPause?: (id: string) => void;
  onResume?: (id: string) => void;
  onDelete?: (id: string) => void;
}

// 下载任务Schema
const DownloadTaskSchema = z.object({
  id: z.string(),
  url: z.string().url(),
  filename: z.string(),
  progress: z.number().min(0).max(100),
  status: z.enum([
    "pending",
    "downloading",
    "paused",
    "completed",
    "error",
    "canceled",
  ]),
  startTime: z.number(),
  updatedAt: z.number(),
  metadata: z.record(z.unknown()).optional(),
  resumableDownload: z.any().nullable(),
  error: z.string().nullable(),
});

// 下载项组件
const DownloadItem = React.memo(
  ({ item, onRetry, onPause, onResume, onDelete }: DownloadItemProps) => {
    const getStatusIcon = useCallback(() => {
      switch (item.status) {
        case "downloading":
          return <RefreshCw className="animate-spin" size={16} />;
        case "paused":
          return <Pause size={16} />;
        case "completed":
          return <FileDown size={16} />;
        case "error":
          return <AlertCircle size={16} />;
        default:
          return <Clock size={16} />;
      }
    }, [item.status]);

    return (
      <Animated.View entering={SlideInRight} className="mb-4">
        <Card>
          <CardContent className="p-4">
            <View className="flex-row justify-between items-center mb-2">
              <Text className="font-medium">{item.filename}</Text>
              {getStatusIcon()}
            </View>

            <Progress value={item.progress} className="mb-3" />

            <View className="flex-row justify-end space-x-2">
              {item.status === "error" && onRetry && (
                <Button
                  size="sm"
                  variant="outline"
                  onPress={() => onRetry(item.id)}
                >
                  <RefreshCw size={16} />
                  <Text className="ml-2">重试</Text>
                </Button>
              )}

              {item.status === "downloading" && onPause ? (
                <Button
                  size="sm"
                  variant="outline"
                  onPress={() => onPause(item.id)}
                >
                  <Pause size={16} />
                  <Text className="ml-2">暂停</Text>
                </Button>
              ) : (
                item.status === "paused" &&
                onResume && (
                  <Button
                    size="sm"
                    variant="outline"
                    onPress={() => onResume(item.id)}
                  >
                    <Play size={16} />
                    <Text className="ml-2">继续</Text>
                  </Button>
                )
              )}

              {onDelete && (
                <Button
                  size="sm"
                  variant="destructive"
                  onPress={() => onDelete(item.id)}
                >
                  <Trash2 size={16} />
                  <Text className="ml-2">删除</Text>
                </Button>
              )}
            </View>
          </CardContent>
        </Card>
      </Animated.View>
    );
  }
);

const DownloadList = ({ downloads, isLoading }: DownloadListProps) => {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const pauseDownload = useDownloadStore((state) => state.pauseDownload);
  const resumeDownload = useDownloadStore((state) => state.resumeDownload);
  const cancelDownload = useDownloadStore((state) => state.cancelDownload);
  const retryDownload = useDownloadStore((state) => state.retryDownload);

  const validatedDownloads = useMemo(() => {
    try {
      return downloads.filter((item): item is DownloadTask => {
        if (!item) return false;
        try {
          DownloadTaskSchema.parse(item);
          return true;
        } catch (error) {
          console.error(`Invalid download task: ${item.id}`, error);
          return false;
        }
      });
    } catch (error) {
      console.error("Failed to validate downloads:", error);
      return [];
    }
  }, [downloads]);

  const handleRetry = useCallback(
    (id: string) => {
      retryDownload(id);
      toast.success("重试下载", {
        description: "已重新开始下载任务",
        icon: <RefreshCw size={20} />,
      });
    },
    [retryDownload]
  );

  const handlePause = useCallback(
    (id: string) => {
      pauseDownload(id);
      toast.info("已暂停下载", {
        description: "点击继续按钮可恢复下载",
        icon: <Pause size={20} />,
      });
    },
    [pauseDownload]
  );

  const handleResume = useCallback(
    (id: string) => {
      resumeDownload(id);
      toast.success("继续下载", {
        description: "下载已恢复",
        icon: <Play size={20} />,
      });
    },
    [resumeDownload]
  );

  const handleDelete = useCallback(
    (id: string) => {
      cancelDownload(id);
      toast.success("已删除下载", {
        description: "下载任务已移除",
        icon: <Trash2 size={20} />,
      });
    },
    [cancelDownload]
  );

  if (validatedDownloads.length === 0) {
    return (
      <Alert variant="default" icon={Download}>
        <AlertTitle>暂无下载</AlertTitle>
        <AlertDescription>
          {isLoading ? "正在等待下载任务..." : "当前没有正在进行的下载任务"}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Animated.View
      entering={FadeInDown}
      className={`flex-1 p-4 ${isLandscape ? "flex-row flex-wrap" : ""}`}
    >
      <View className="flex-row justify-between items-center mb-4">
        <View className="flex-row space-x-2">
          <Button variant="outline" size="sm">
            <Filter size={16} className="mr-1" />
            筛选
          </Button>
          <Button variant="outline" size="sm">
            <SortAsc size={16} className="mr-1" />
            排序
          </Button>
        </View>
        <Text className="text-sm text-muted-foreground">
          共 {validatedDownloads.length} 个任务
        </Text>
      </View>

      {validatedDownloads.map((item) => (
        <View key={item.id} className={isLandscape ? "w-1/2 pr-2" : "w-full"}>
          <DownloadItem
            item={item}
            onRetry={handleRetry}
            onPause={handlePause}
            onResume={handleResume}
            onDelete={handleDelete}
          />
        </View>
      ))}
    </Animated.View>
  );
};

export default React.memo(DownloadList);
