import React from "react";
import { View } from "react-native";
import { formatBytes } from "./format";
import type { DownloadStats as DownloadStatsType } from "./types";
import { Text } from "../ui/text";
import { Badge } from "../ui/badge";
import { Label } from "../ui/label";
import Animated, {
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";

interface DownloadStatsProps {
  stats: DownloadStatsType;
}

export const DownloadStats: React.FC<DownloadStatsProps> = ({ stats }) => {
  const progressStyle = useAnimatedStyle(() => ({
    width: withSpring(`${stats.totalProgress * 100}%`, {
      damping: 20,
      stiffness: 90,
    }),
  }));

  return (
    <View className="bg-card p-4 mb-4 rounded-lg shadow-sm space-y-4">
      <View className="flex-row justify-between items-center">
        <Label className="text-base">总进度</Label>
        <Badge variant="secondary">
          {Math.round(stats.totalProgress * 100)}%
        </Badge>
      </View>

      <View className="h-2 bg-muted rounded-full overflow-hidden">
        <Animated.View className="h-full bg-primary" style={progressStyle} />
      </View>

      <View className="flex-row justify-between">
        <View className="space-y-1">
          <Text className="text-sm text-muted-foreground">
            {formatBytes(stats.downloadedSize)} / {formatBytes(stats.totalSize)}
          </Text>
          <Text className="text-sm text-muted-foreground">
            总速度: {formatBytes(stats.totalSpeed)}/s
          </Text>
        </View>

        <View className="space-y-1">
          <View className="flex-row space-x-2">
            <Badge variant="secondary">活跃: {stats.active}</Badge>
            <Badge variant="outline">总计: {stats.total}</Badge>
          </View>
          <View className="flex-row space-x-2">
            <Badge variant="default">完成: {stats.completed}</Badge>
            <Badge variant="destructive">错误: {stats.error}</Badge>
          </View>
        </View>
      </View>
    </View>
  );
};
