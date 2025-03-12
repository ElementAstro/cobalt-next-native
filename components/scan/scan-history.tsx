import React, { useMemo, useState, useCallback } from "react";
import { View, ScrollView, Pressable } from "react-native";
import { Text } from "~/components/ui/text";
import { Label } from "~/components/ui/label";
import {
  Clock,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  Activity,
  RefreshCw,
  Loader2,
  FileSearch,
  Search,
  Filter,
  SortAsc,
  SortDesc,
  X,
} from "lucide-react-native";
import Animated, {
  FadeIn,
  FadeOut,
  SlideInRight,
  ZoomOut,
  withSpring,
  withSequence,
  withDelay,
  useAnimatedStyle,
  interpolate,
  useSharedValue,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Progress } from "~/components/ui/progress";
import { Alert, AlertTitle, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { type ScanStatus } from "~/stores/useScannerStore";
import { Input } from "~/components/ui/input";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "~/components/ui/tooltip";

interface ScanHistoryItem {
  id: string;
  timestamp: Date;
  ipAddress: string;
  portRange: string;
  openPorts: number;
  totalPorts: number;
  status: ScanStatus;
  progress?: number;
  duration?: number;
  favorite?: boolean;
  tags?: string[];
}

interface ScanHistoryProps {
  history: ScanHistoryItem[];
  onSelectHistory: (item: ScanHistoryItem) => void;
  onRetry?: () => void;
  isLoading?: boolean;
  error?: string | null;
  onDeleteHistory?: (id: string) => Promise<boolean>;
  onFavoriteToggle?: (id: string, favorite: boolean) => void;
  onShareHistory?: (item: ScanHistoryItem) => void;
}

// 历史记录卡片组件
const HistoryCard = React.memo(
  ({
    item,
    onPress,
    index,
  }: {
    item: ScanHistoryItem;
    onPress: () => void;
    onFavorite: () => void;
    onDelete: () => void;
    onShare: () => void;
    index: number;
  }) => {
    const pressed = useSharedValue(0);
    const scale = useSharedValue(0);

    // 入场动画
    React.useEffect(() => {
      scale.value = withSequence(
        withDelay(
          index * 100,
          withSpring(1, {
            damping: 12,
            stiffness: 100,
          })
        )
      );
    }, []);

    const animatedStyle = useAnimatedStyle(() => {
      return {
        transform: [
          { scale: scale.value },
          { scale: interpolate(pressed.value, [0, 1], [1, 0.98]) },
        ],
      };
    });

    const statusConfig = useMemo(
      () => ({
        success: {
          icon: CheckCircle,
          color: "text-success",
          bgColor: "bg-success/10",
          borderColor: "border-success/20",
          label: "成功",
        },
        error: {
          icon: AlertCircle,
          color: "text-destructive",
          bgColor: "bg-destructive/10",
          borderColor: "border-destructive/20",
          label: "失败",
        },
        scanning: {
          icon: Activity,
          color: "text-primary",
          bgColor: "bg-primary/10",
          borderColor: "border-primary/20",
          label: "扫描中",
        },
        idle: {
          icon: AlertCircle,
          color: "text-muted-foreground",
          bgColor: "bg-muted",
          borderColor: "border-muted-foreground/20",
          label: "准备就绪",
        },
      }),
      []
    );

    const config = statusConfig[item.status];
    const StatusIcon = config.icon;

    return (
      <Animated.View
        entering={SlideInRight.delay(index * 100)
          .duration(400)
          .springify()}
        exiting={ZoomOut.duration(200)}
        style={animatedStyle}
        className="mb-4 w-full"
      >
        <Pressable
          onPressIn={() => {
            pressed.value = withSpring(1);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
          onPressOut={() => {
            pressed.value = withSpring(0);
          }}
          onPress={() => {
            onPress();
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }}
          className={`
            rounded-xl 
            overflow-hidden
            backdrop-blur-lg
            ${config.bgColor}
            border
            ${config.borderColor}
          `}
        >
          {/* 卡片内容 */}
          <View className="p-4 space-y-4">
            {/* 头部信息 */}
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center space-x-2">
                <Clock size={16} className="text-muted-foreground" />
                <Text className="text-sm text-muted-foreground">
                  {new Date(item.timestamp).toLocaleString()}
                </Text>
              </View>
              <View
                className={`
                  flex-row items-center space-x-2 
                  px-2 py-1 rounded-full
                  ${config.bgColor}
                `}
              >
                <StatusIcon size={14} className={config.color} />
                <Text className={`text-xs font-medium ${config.color}`}>
                  {config.label}
                </Text>
              </View>
            </View>

            {/* IP 地址和端口范围 */}
            <View>
              <Label className="text-xl font-semibold mb-1">
                {item.ipAddress}
              </Label>
              <Text className="text-base text-muted-foreground">
                {item.portRange}
              </Text>
            </View>

            {/* 进度条 */}
            {item.status === "scanning" && item.progress !== undefined && (
              <Progress
                value={item.progress}
                className="h-2 rounded-full bg-primary/20"
              />
            )}

            {/* 底部统计 */}
            <View className="flex-row justify-between items-center pt-2 border-t border-border/10">
              <View className="flex-row items-center space-x-4">
                <View className="flex-row items-center space-x-1">
                  <Activity size={16} className={config.color} />
                  <Text className={`text-sm font-medium ${config.color}`}>
                    {item.openPorts}/{item.totalPorts}
                  </Text>
                </View>
                {item.duration && (
                  <View className="flex-row items-center space-x-1">
                    <Clock size={16} className="text-muted-foreground" />
                    <Text className="text-sm text-muted-foreground">
                      {item.duration}s
                    </Text>
                  </View>
                )}
              </View>
              <ChevronRight size={18} className="text-muted-foreground" />
            </View>
          </View>
        </Pressable>
      </Animated.View>
    );
  }
);

const EmptyState = () => (
  <Animated.View
    entering={FadeIn.duration(300)}
    className="flex-1 items-center justify-center py-12 space-y-4"
  >
    <FileSearch size={48} className="text-muted-foreground" />
    <View className="space-y-1 items-center">
      <Label className="text-lg font-medium text-muted-foreground">
        暂无扫描记录
      </Label>
      <Text className="text-sm text-muted-foreground text-center max-w-[250px]">
        开始扫描后，您的扫描历史记录将显示在这里
      </Text>
    </View>
  </Animated.View>
);

const LoadingState = () => (
  <View className="flex-1 items-center justify-center p-8">
    <Animated.View
      entering={FadeIn.duration(300)}
      className="items-center space-y-4"
    >
      <Loader2 size={32} className="text-primary animate-spin" />
      <Label className="text-muted-foreground">加载历史记录中...</Label>
    </Animated.View>
  </View>
);

const ErrorState = ({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) => (
  <Animated.View
    entering={FadeIn.duration(300)}
    exiting={FadeOut.duration(200)}
    className="flex-1 items-center justify-center p-8"
  >
    <Alert
      variant="destructive"
      icon={AlertCircle}
      className="mb-4 border-destructive/50 bg-destructive/10"
    >
      <AlertTitle>加载失败</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
    {onRetry && (
      <Button
        variant="outline"
        onPress={() => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          onRetry();
        }}
        className="bg-card/50 backdrop-blur"
      >
        <RefreshCw size={16} className="mr-2" />
        重试
      </Button>
    )}
  </Animated.View>
);

const ScanHistory: React.FC<ScanHistoryProps> = ({
  history,
  onSelectHistory,
  onRetry,
  isLoading = false,
  error = null,
  onDeleteHistory,
  onFavoriteToggle,
  onShareHistory,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [filterStatus, setFilterStatus] = useState<ScanStatus | null>(null);

  const filteredHistory = useMemo(() => {
    return history
      .filter((item) => {
        if (filterStatus && item.status !== filterStatus) {
          return false;
        }
        if (searchQuery) {
          return (
            item.ipAddress.includes(searchQuery) ||
            item.portRange.includes(searchQuery)
          );
        }
        return true;
      })
      .sort((a, b) => {
        if (sortOrder === "asc") {
          return a.timestamp.getTime() - b.timestamp.getTime();
        } else {
          return b.timestamp.getTime() - a.timestamp.getTime();
        }
      });
  }, [history, searchQuery, sortOrder, filterStatus]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const handleSortToggle = useCallback(() => {
    setSortOrder((prevOrder) => (prevOrder === "asc" ? "desc" : "asc"));
  }, []);

  const handleFilterChange = useCallback((status: ScanStatus | null) => {
    setFilterStatus(status);
  }, []);

  if (isLoading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={onRetry} />;
  }

  return (
    <View className="flex-1">
      <View className="p-4 flex-row items-center space-x-2">
        {/* 自定义搜索框 */}
        <View className="flex-1 relative">
          <Input
            placeholder="搜索 IP 地址或端口范围"
            value={searchQuery}
            onChangeText={handleSearch}
            className="pl-10 pr-10"
          />
          <View className="absolute left-3 top-2.5">
            <Search size={16} className="text-muted-foreground" />
          </View>
          {searchQuery ? (
            <Pressable
              className="absolute right-3 top-2.5"
              onPress={() => setSearchQuery("")}
            >
              <X size={16} className="text-muted-foreground" />
            </Pressable>
          ) : null}
        </View>

        {/* 排序按钮 */}
        <Pressable onPress={handleSortToggle}>
          {sortOrder === "asc" ? (
            <SortAsc size={20} className="text-muted-foreground" />
          ) : (
            <SortDesc size={20} className="text-muted-foreground" />
          )}
        </Pressable>

        {/* 使用 Tooltip 代替 Menu */}
        <Tooltip>
          <TooltipTrigger>
            <Filter size={20} className="text-muted-foreground" />
          </TooltipTrigger>
          <TooltipContent className="p-2">
            <View className="space-y-2">
              <Text className="font-medium mb-1">状态过滤</Text>
              <View className="space-y-1">
                <Button
                  variant={filterStatus === null ? "default" : "ghost"}
                  size="sm"
                  onPress={() => handleFilterChange(null)}
                >
                  <Text>全部</Text>
                </Button>
                <Button
                  variant={filterStatus === "success" ? "default" : "ghost"}
                  size="sm"
                  onPress={() => handleFilterChange("success")}
                >
                  <Text>成功</Text>
                </Button>
                <Button
                  variant={filterStatus === "error" ? "default" : "ghost"}
                  size="sm"
                  onPress={() => handleFilterChange("error")}
                >
                  <Text>失败</Text>
                </Button>
                <Button
                  variant={filterStatus === "scanning" ? "default" : "ghost"}
                  size="sm"
                  onPress={() => handleFilterChange("scanning")}
                >
                  <Text>扫描中</Text>
                </Button>
                <Button
                  variant={filterStatus === "idle" ? "default" : "ghost"}
                  size="sm"
                  onPress={() => handleFilterChange("idle")}
                >
                  <Text>准备就绪</Text>
                </Button>
              </View>
            </View>
          </TooltipContent>
        </Tooltip>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 96 }}
        showsVerticalScrollIndicator={false}
      >
        {filteredHistory.length === 0 ? (
          <EmptyState />
        ) : (
          filteredHistory.map((item, index) => (
            <HistoryCard
              key={item.id}
              item={item}
              index={index}
              onPress={() => onSelectHistory(item)}
              onFavorite={() => onFavoriteToggle?.(item.id, !item.favorite)}
              onDelete={() => onDeleteHistory?.(item.id)}
              onShare={() => onShareHistory?.(item)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
};

HistoryCard.displayName = "HistoryCard";
ScanHistory.displayName = "ScanHistory";

export default React.memo(ScanHistory);
