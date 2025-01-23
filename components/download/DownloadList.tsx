// components/DownloadList.tsx
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
} from "lucide-react-native";
import Animated, { FadeInDown, SlideInRight } from "react-native-reanimated";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Text } from "@/components/ui/text";

// 下载任务类型
interface DownloadTask {
  id: string;
  url: string;
  filename: string;
  progress: number;
  status: "pending" | "downloading" | "paused" | "completed" | "error";
  startTime: number;
  updatedAt: number;
  metadata?: Record<string, unknown>;
  resumableDownload?: any | null;
  error?: string;
}

// Props 接口定义
interface DownloadItemProps {
  item: DownloadTask;
  onRetry: (id: string) => void;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onDelete: (id: string) => void;
}

interface DownloadListProps {
  downloads: DownloadTask[];
  onRetry: (id: string) => void;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onDelete: (id: string) => void;
}

// 下载任务Schema
const DownloadTaskSchema = z.object({
  id: z.string(),
  url: z.string().url(),
  filename: z.string(),
  progress: z.number().min(0).max(100),
  status: z.enum(["pending", "downloading", "paused", "completed", "error"]),
  startTime: z.number(),
  updatedAt: z.number(),
  metadata: z.record(z.unknown()).optional(),
  resumableDownload: z.any().nullable(),
  error: z.string().optional(),
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
              {item.status === "error" && (
                <Button
                  size="sm"
                  variant="outline"
                  onPress={() => onRetry(item.id)}
                >
                  <RefreshCw size={16} />
                  <Text className="ml-2">重试</Text>
                </Button>
              )}

              {item.status === "downloading" ? (
                <Button
                  size="sm"
                  variant="outline"
                  onPress={() => onPause(item.id)}
                >
                  <Pause size={16} />
                  <Text className="ml-2">暂停</Text>
                </Button>
              ) : (
                item.status === "paused" && (
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

              <Button
                size="sm"
                variant="destructive"
                onPress={() => onDelete(item.id)}
              >
                <Trash2 size={16} />
                <Text className="ml-2">删除</Text>
              </Button>
            </View>
          </CardContent>
        </Card>
      </Animated.View>
    );
  }
);

// 下载列表组件
const DownloadList = ({
  downloads,
  onRetry,
  onPause,
  onResume,
  onDelete,
}: DownloadListProps) => {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const validatedDownloads = useMemo(() => {
    try {
      return downloads.map((item: Partial<DownloadTask>) => {
        const now = Date.now();
        const completeItem = {
          ...item,
          startTime: item.startTime ?? now,
          updatedAt: item.updatedAt ?? now,
          metadata: item.metadata ?? {},
          resumableDownload: item.resumableDownload ?? (null as any),
        };
        return DownloadTaskSchema.parse(completeItem);
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error("数据验证失败", {
          description: error.issues[0]?.message || "下载任务数据格式错误",
        });
      }
      return [];
    }
  }, [downloads]);

  if (validatedDownloads.length === 0) {
    return (
      <Alert variant="default" icon={Download}>
        <AlertTitle>暂无下载</AlertTitle>
        <AlertDescription>当前没有正在进行的下载任务</AlertDescription>
      </Alert>
    );
  }

  return (
    <Animated.View
      entering={FadeInDown}
      className={`flex-1 p-4 ${isLandscape ? "flex-row flex-wrap" : ""}`}
    >
      {validatedDownloads.map((item: DownloadTask) => (
        <View key={item.id} className={isLandscape ? "w-1/2 pr-2" : "w-full"}>
          <DownloadItem
            item={item}
            onRetry={onRetry}
            onPause={onPause}
            onResume={onResume}
            onDelete={onDelete}
          />
        </View>
      ))}
    </Animated.View>
  );
};

export default React.memo(DownloadList);
