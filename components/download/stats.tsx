import React from "react";
import { View, ScrollView } from "react-native";
import { formatBytes, formatDuration } from "./format";
import useDownloadStore from "~/stores/useDownloadStore";
import { Text } from "../ui/text";
import { Badge } from "../ui/badge";
import { Label } from "../ui/label";
import { Card, CardContent } from "../ui/card";
import {
  FileDown,
  Activity,
  Clock,
  CheckCircle,
  AlertCircle,
  Pause,
  ArrowDown,
  BarChart,
  Calendar,
} from "lucide-react-native";
import Animated, {
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";

interface StatsItemProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subValue?: string;
  color?: string;
}

const StatsItem: React.FC<StatsItemProps> = ({
  icon,
  label,
  value,
  subValue,
  color = "text-foreground",
}) => (
  <Card className="flex-1">
    <CardContent className="p-4">
      <View className="flex-row items-center space-x-2 mb-2">
        <View className={color}>{icon}</View>
        <Text className="text-sm text-muted-foreground">{label}</Text>
      </View>
      <Text className={`text-lg font-medium ${color}`}>{value}</Text>
      {subValue && (
        <Text className="text-xs text-muted-foreground mt-1">{subValue}</Text>
      )}
    </CardContent>
  </Card>
);

export const DownloadStats: React.FC = () => {
  const stats = useDownloadStore((state) => state.stats);
  const analytics = useDownloadStore((state) => state.analytics);

  const progressStyle = useAnimatedStyle(() => ({
    width: withSpring(`${stats.totalProgress * 100}%`, {
      damping: 20,
      stiffness: 90,
    }),
  }));

  const estimatedTimeRemaining =
    stats.totalSpeed > 0
      ? formatDuration(
          (stats.totalSize - stats.downloadedSize) / stats.totalSpeed
        )
      : "计算中...";

  const successRate = `${Math.round(analytics.successRate * 100)}%`;
  const averageSpeed = formatBytes(analytics.averageSpeed);
  const lastDownload = analytics.lastDownloadDate
    ? new Date(analytics.lastDownloadDate).toLocaleString()
    : "无";

  return (
    <ScrollView className="bg-background" horizontal={false}>
      <View className="p-4 space-y-6">
        {/* Overall Progress */}
        <Card>
          <CardContent className="p-4 space-y-4">
            <View className="flex-row justify-between items-center">
              <View className="flex-row items-center">
                <Activity size={20} className="text-primary mr-2" />
                <Label className="text-base">总体进度</Label>
              </View>
              <Badge variant="secondary" className="px-2 py-1">
                {Math.round(stats.totalProgress * 100)}%
              </Badge>
            </View>

            <View className="h-2 bg-muted rounded-full overflow-hidden">
              <Animated.View
                className="h-full bg-primary"
                style={progressStyle}
              />
            </View>

            <View className="flex-row justify-between">
              <Text className="text-sm text-muted-foreground">
                {formatBytes(stats.downloadedSize)} /{" "}
                {formatBytes(stats.totalSize)}
              </Text>
              <Text className="text-sm text-muted-foreground">
                剩余时间: {estimatedTimeRemaining}
              </Text>
            </View>
          </CardContent>
        </Card>

        {/* Current Stats */}
        <View className="space-y-2">
          <Label className="text-base mb-2">当前状态</Label>
          <View className="flex-row space-x-2">
            <StatsItem
              icon={<FileDown size={16} />}
              label="总任务"
              value={stats.total}
              subValue="个下载"
            />
            <StatsItem
              icon={<Activity size={16} />}
              label="活跃任务"
              value={stats.active}
              color="text-primary"
            />
          </View>

          <View className="flex-row space-x-2 mt-2">
            <StatsItem
              icon={<Clock size={16} />}
              label="等待中"
              value={stats.pending}
              color="text-orange-500"
            />
            <StatsItem
              icon={<Pause size={16} />}
              label="已暂停"
              value={stats.paused}
              color="text-yellow-500"
            />
          </View>

          <View className="flex-row space-x-2 mt-2">
            <StatsItem
              icon={<CheckCircle size={16} />}
              label="已完成"
              value={stats.completed}
              color="text-green-500"
            />
            <StatsItem
              icon={<AlertCircle size={16} />}
              label="失败"
              value={stats.error}
              color="text-red-500"
            />
          </View>
        </View>

        {/* Analytics */}
        <View className="space-y-2">
          <Label className="text-base mb-2">下载统计</Label>
          <View className="flex-row space-x-2">
            <StatsItem
              icon={<BarChart size={16} />}
              label="成功率"
              value={successRate}
              subValue={`共${analytics.totalDownloads}次下载`}
            />
            <StatsItem
              icon={<ArrowDown size={16} />}
              label="平均速度"
              value={averageSpeed + "/s"}
              subValue={`总计${formatBytes(analytics.totalBytes)}`}
            />
          </View>

          <View className="flex-row space-x-2 mt-2">
            <Card className="flex-1">
              <CardContent className="p-4">
                <View className="flex-row items-center space-x-2 mb-2">
                  <Calendar size={16} className="text-muted-foreground" />
                  <Text className="text-sm text-muted-foreground">
                    最近下载
                  </Text>
                </View>
                <Text className="text-sm">{lastDownload}</Text>
              </CardContent>
            </Card>
          </View>
        </View>

        {/* Current Speed */}
        <View className="pt-2 border-t border-border">
          <Text className="text-sm text-muted-foreground">
            当前速度: {formatBytes(stats.totalSpeed)}/s
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};
