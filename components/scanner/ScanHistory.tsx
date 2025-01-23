import React, { useMemo } from "react";
import { View, ScrollView, Pressable } from "react-native";
import { Text } from "@/components/ui/text";
import { Label } from "@/components/ui/label";
import {
  Clock,
  ChevronRight,
  History,
  AlertCircle,
  CheckCircle,
  Activity,
  RefreshCw,
} from "lucide-react-native";
import Animated, {
  FadeIn,
  FadeOut,
  SlideInRight,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

// 增强的状态类型
type ScanStatus = "success" | "error" | "in_progress";

interface ScanHistoryItem {
  id: string;
  timestamp: Date;
  ipAddress: string;
  portRange: string;
  openPorts: number;
  totalPorts: number;
  status?: ScanStatus;
  progress?: number;
}

interface ScanHistoryProps {
  history: ScanHistoryItem[];
  onSelectHistory: (item: ScanHistoryItem) => void;
  onRetry?: () => void;
  isLoading?: boolean;
  error?: string | null;
}

const HistoryCard = React.memo(
  ({ item, onPress }: { item: ScanHistoryItem; onPress: () => void }) => {
    const statusColors = useMemo(
      () => ({
        success: "text-green-500",
        error: "text-red-500",
        in_progress: "text-blue-500",
      }),
      []
    );

    const StatusIcon = useMemo(
      () =>
        ({
          success: CheckCircle,
          error: AlertCircle,
          in_progress: Activity,
        }[item.status || "success"]),
      [item.status]
    );

    return (
      <Animated.View entering={SlideInRight} className="mr-4 w-72">
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onPress();
          }}
          className={`bg-card rounded-lg p-4 shadow-sm border ${
            item.status === "error" ? "border-red-500" : "border-border"
          }`}
        >
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center space-x-2">
              <Clock size={16} className="text-muted-foreground" />
              <Text className="text-xs text-muted-foreground">
                {new Date(item.timestamp).toLocaleString()}
              </Text>
            </View>
            <StatusIcon
              size={16}
              className={statusColors[item.status || "success"]}
            />
          </View>

          <Label className="text-lg font-medium mb-1">{item.ipAddress}</Label>
          <Text className="text-sm text-muted-foreground mb-3">
            {item.portRange}
          </Text>

          {item.status === "in_progress" && item.progress !== undefined && (
            <Progress value={item.progress} className="mb-3 h-2" />
          )}

          <View className="flex-row justify-between items-center">
            <Text
              className={`text-sm font-medium ${
                statusColors[item.status || "success"]
              }`}
            >
              开放端口: {item.openPorts}/{item.totalPorts}
            </Text>
            <ChevronRight size={16} className="text-muted-foreground" />
          </View>
        </Pressable>
      </Animated.View>
    );
  }
);

const ScanHistory: React.FC<ScanHistoryProps> = ({
  history,
  onSelectHistory,
  onRetry,
  isLoading = false,
  error = null,
}) => {
  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center p-8">
        <Animated.View entering={FadeIn} className="items-center">
          <RefreshCw size={32} className="text-primary mb-4 animate-spin" />
          <Label className="text-muted-foreground">加载历史记录中...</Label>
        </Animated.View>
      </View>
    );
  }

  if (error) {
    return (
      <Animated.View
        entering={FadeIn}
        exiting={FadeOut}
        className="flex-1 items-center justify-center p-8"
      >
        <Alert variant="destructive" icon={AlertCircle} className="mb-4">
          <AlertTitle>加载失败</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        {onRetry && (
          <Button
            variant="outline"
            onPress={() => {
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success
              );
              onRetry();
            }}
          >
            <RefreshCw size={16} className="mr-2" />
            重试
          </Button>
        )}
      </Animated.View>
    );
  }

  if (history.length === 0) {
    return (
      <Animated.View
        entering={FadeIn}
        exiting={FadeOut}
        className="flex-1 items-center justify-center p-8"
      >
        <History size={32} className="text-muted-foreground mb-4" />
        <Label className="text-muted-foreground">暂无历史记录</Label>
      </Animated.View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="px-4"
      contentContainerStyle={{ paddingRight: 16 }}
    >
      {history.map((item) => (
        <HistoryCard
          key={item.id}
          item={item}
          onPress={() => onSelectHistory(item)}
        />
      ))}
    </ScrollView>
  );
};

export default React.memo(ScanHistory);
