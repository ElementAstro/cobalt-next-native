import React from "react";
import { View } from "react-native";
import { formatBytes } from "./format";
import type { DownloadStats as DownloadStatsType } from "./types";
import { Text } from "../ui/text";
import { Badge } from "../ui/badge";
import { Label } from "../ui/label";
import { FileDown, Activity, Clock, CheckCircle } from "lucide-react-native";
import Animated, {
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";

interface StatsItemProps {
  icon: React.ReactNode;
  label: string;
  value: number;
}

const StatsItem: React.FC<StatsItemProps> = ({ icon, label, value }) => (
  <View className="flex-row items-center space-x-2">
    <View className="text-muted-foreground">{icon}</View>
    <View>
      <Text className="text-sm text-muted-foreground">{label}</Text>
      <Text className="font-medium">{value}</Text>
    </View>
  </View>
);

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
        <View className="flex-row items-center">
          <Activity size={20} className="text-primary mr-2" />
          <Label className="text-base">总体进度</Label>
        </View>
        <Badge variant="secondary" className="px-2 py-1">
          {Math.round(stats.totalProgress * 100)}%
        </Badge>
      </View>

      <View className="h-2 bg-muted rounded-full overflow-hidden">
        <Animated.View className="h-full bg-primary" style={progressStyle} />
      </View>

      <View className="grid grid-cols-2 gap-4">
        <StatsItem
          icon={<FileDown size={16} />}
          label="总任务"
          value={stats.total}
        />
        <StatsItem
          icon={<Activity size={16} />}
          label="活跃任务"
          value={stats.active}
        />
        <StatsItem
          icon={<Clock size={16} />}
          label="等待中"
          value={stats.pending}
        />
        <StatsItem
          icon={<CheckCircle size={16} />}
          label="已完成"
          value={stats.completed}
        />
      </View>

      <View className="pt-2 border-t border-border">
        <Text className="text-sm text-muted-foreground">
          总速度: {formatBytes(stats.totalSpeed)}/s
        </Text>
      </View>
    </View>
  );
};
