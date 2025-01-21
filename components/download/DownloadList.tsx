// components/DownloadList.tsx
import React, { useMemo, useCallback } from "react";
import { View, Text, FlatList, useWindowDimensions } from "react-native";
import { RefreshControl } from "react-native-gesture-handler";
import { DownloadItem } from "./DownloadItem";
import { z } from "zod";
import {
  ChevronDown,
  AlertTriangle,
  Clock,
  PauseCircle,
  AlertCircle,
  CheckCircle2,
} from "lucide-react-native";
import { useTheme } from "@react-navigation/native";
import { ZodError } from "zod";
import { toast } from "sonner-native";
import * as FileSystem from "expo-file-system";

export const DownloadTaskSchema = z.object({
  id: z.string(),
  url: z.string(),
  filename: z.string(),
  destinationUri: z.string(),
  progress: z.number(),
  status: z.enum([
    "downloading",
    "pending",
    "paused",
    "error",
    "completed",
    "canceled",
  ]),
  error: z.string().nullable(),
  priority: z.enum(["high", "normal", "low"]),
  size: z.number(),
  downloadedSize: z.number(),
  speed: z.number(),
  startTime: z.number(),
  createdAt: z.number(),
  updatedAt: z.number(),
  metadata: z.record(z.unknown()),
  resumableDownload: z.custom<FileSystem.DownloadResumable>().nullable(),
});

interface DownloadListProps {
  downloads: unknown[];
  isLoading: boolean;
  onRefresh?: () => void;
  onRetry?: (taskId: string) => void;
  onCancel?: (taskId: string) => void;
}

type Status =
  | "downloading"
  | "pending"
  | "paused"
  | "error"
  | "completed"
  | "canceled";
type Priority = "high" | "normal" | "low";

const STATUS_ICONS = {
  downloading: ChevronDown,
  pending: Clock,
  paused: PauseCircle,
  error: AlertCircle,
  completed: CheckCircle2,
  canceled: AlertTriangle,
};

export const DownloadList: React.FC<DownloadListProps> = ({
  downloads,
  isLoading,
  onRefresh,
  onRetry,
  onCancel,
}) => {
  const { colors } = useTheme();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const validatedDownloads = useMemo(() => {
    try {
      return downloads.map((item) => {
        const now = Date.now();
        // 补充缺失的字段，确保数据完整性
        const completeItem = {
          ...(item as any),
          startTime: (item as any).startTime ?? now,
          updatedAt: (item as any).updatedAt ?? now,
          metadata: (item as any).metadata ?? {},
          resumableDownload: (item as any).resumableDownload ?? null,
        };
        return DownloadTaskSchema.parse(completeItem);
      });
    } catch (error) {
      if (error instanceof ZodError) {
        toast.error("数据验证失败", {
          description: error.issues[0]?.message || "下载任务数据格式错误",
        });
      }
      return [];
    }
  }, [downloads]);

  const sortedDownloads = useMemo(() => {
    return [...validatedDownloads].sort((a, b) => {
      const priorityOrder: Record<Priority, number> = {
        high: 0,
        normal: 1,
        low: 2,
      };
      const statusOrder: Record<Status, number> = {
        downloading: 0,
        pending: 1,
        paused: 2,
        error: 3,
        completed: 4,
        canceled: 5,
      };

      return (
        priorityOrder[a.priority as Priority] -
          priorityOrder[b.priority as Priority] ||
        statusOrder[a.status as Status] - statusOrder[b.status as Status] ||
        b.createdAt - a.createdAt
      );
    });
  }, [validatedDownloads]);

  const handleError = useCallback((error: string) => {
    toast.error("操作失败", { description: error });
  }, []);

  const COLUMN_WIDTH = isLandscape ? width * 0.48 : width * 0.95;
  const ITEM_SPACING = isLandscape ? width * 0.02 : 0;

  return (
    <View className="flex-1 bg-background">
      <FlatList
        data={sortedDownloads}
        key={isLandscape ? "landscape" : "portrait"}
        renderItem={({ item }) => (
          <DownloadItem task={item} style={{ width: COLUMN_WIDTH }} />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: 80,
          minHeight: height * 0.8,
        }}
        numColumns={isLandscape ? 2 : 1}
        columnWrapperStyle={
          isLandscape && {
            justifyContent: "space-between",
            marginBottom: 16,
          }
        }
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            progressBackgroundColor={colors.card}
          />
        }
        ListEmptyComponent={
          <View className="flex-1 justify-center items-center p-8">
            <Clock size={32} color={colors.text} />
            <Text className="text-foreground/60">暂无进行中的下载任务</Text>
          </View>
        }
        getItemLayout={(_, index) => ({
          length: 100,
          offset: 100 * index + ITEM_SPACING * index,
          index,
        })}
        initialNumToRender={8}
        maxToRenderPerBatch={6}
        windowSize={11}
        removeClippedSubviews
        keyboardShouldPersistTaps="handled"
      />
    </View>
  );
};
