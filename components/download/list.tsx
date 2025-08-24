import React, { useMemo, useCallback, useState } from "react";
import {
  View,
  useWindowDimensions,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
} from "react-native";
import { z } from "zod";
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
  ChevronDown,
  X,
  SortDesc,
  Check,
} from "lucide-react-native";
import Animated, {
  FadeInDown,
  SlideInRight,
  FadeOutLeft,
  SlideOutLeft,
  FadeIn,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from "react-native-reanimated";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Progress } from "../ui/progress";
import { Alert, AlertTitle, AlertDescription } from "../ui/alert";
import { Text } from "../ui/text";
import { Badge } from "../ui/badge";
import useDownloadStore from "../../stores/useDownloadStore";

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
  size: number;
  downloadedSize: number;
  speed: number;
}

// Props 接口定义
interface DownloadItemProps {
  item: DownloadTask;
  onRetry?: (id: string) => void;
  onPause?: (id: string) => void;
  onResume?: (id: string) => void;
  onDelete?: (id: string) => void;
  isLandscape: boolean;
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
  size: z.number().optional(),
  downloadedSize: z.number().optional(),
  speed: z.number().optional(),
});

// 格式化文件大小
const formatFileSize = (bytes: number) => {
  if (!bytes) return "未知大小";
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
};

// 格式化速度
const formatSpeed = (bytesPerSecond: number) => {
  if (!bytesPerSecond) return "";
  const sizes = ["B/s", "KB/s", "MB/s", "GB/s"];
  const i = Math.floor(Math.log(bytesPerSecond) / Math.log(1024));
  return `${(bytesPerSecond / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
};

// 下载项组件
const DownloadItem = React.memo(
  ({
    item,
    onRetry,
    onPause,
    onResume,
    onDelete,
    isLandscape,
  }: DownloadItemProps) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const expandProgress = useAnimatedStyle(() => {
      return {
        height: isExpanded
          ? withTiming(150, { duration: 300 })
          : withTiming(0, { duration: 250 }),
        opacity: isExpanded
          ? withTiming(1, { duration: 300 })
          : withTiming(0, { duration: 200 }),
      };
    });

    const getStatusIcon = useCallback(() => {
      switch (item.status) {
        case "downloading":
          return (
            <View className="animate-spin">
              <RefreshCw size={16} className="text-primary" />
            </View>
          );
        case "paused":
          return <Pause size={16} className="text-yellow-500" />;
        case "completed":
          return <Check size={16} className="text-green-500" />;
        case "error":
          return <AlertCircle size={16} className="text-red-500" />;
        default:
          return <Clock size={16} className="text-muted-foreground" />;
      }
    }, [item.status]);

    const getStatusBadge = useCallback(() => {
      switch (item.status) {
        case "downloading":
          return (
            <Badge variant="outline" className="border-primary">
              <RefreshCw size={12} className="mr-1 text-primary animate-spin" />
              下载中
            </Badge>
          );
        case "paused":
          return (
            <Badge variant="outline" className="border-yellow-500">
              <Pause size={12} className="mr-1 text-yellow-500" />
              已暂停
            </Badge>
          );
        case "completed":
          return (
            <Badge variant="outline" className="border-green-500">
              <Check size={12} className="mr-1 text-green-500" />
              已完成
            </Badge>
          );
        case "error":
          return (
            <Badge variant="outline" className="border-red-500">
              <AlertCircle size={12} className="mr-1 text-red-500" />
              出错了
            </Badge>
          );
        case "pending":
          return (
            <Badge variant="outline" className="border-muted-foreground">
              <Clock size={12} className="mr-1 text-muted-foreground" />
              等待中
            </Badge>
          );
        default:
          return null;
      }
    }, [item.status]);

    return (
      <Animated.View
        entering={SlideInRight.duration(300)}
        exiting={SlideOutLeft.duration(200)}
        className="mb-4"
      >
        <Card className={isExpanded ? "border-primary/50" : ""}>
          <CardContent className="p-4">
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setIsExpanded(!isExpanded)}
              className="w-full"
            >
              <View className="flex-row justify-between items-center mb-2">
                <View className="flex-1 mr-2">
                  <Text
                    className="font-medium"
                    numberOfLines={1}
                    ellipsizeMode="middle"
                  >
                    {item.filename}
                  </Text>
                </View>
                {getStatusBadge()}
              </View>
            </TouchableOpacity>

            <View className="flex-row items-center mb-1.5">
              <Progress
                value={item.progress}
                className={`flex-1 ${
                  item.status === "downloading"
                    ? "bg-primary"
                    : item.status === "error"
                    ? "bg-red-500"
                    : item.status === "completed"
                    ? "bg-green-500"
                    : item.status === "paused"
                    ? "bg-yellow-500"
                    : "bg-muted-foreground"
                }`}
              />
              <Text className="text-xs ml-2 min-w-[44px] text-right">
                {Math.round(item.progress)}%
              </Text>
            </View>

            {item.status === "downloading" && item.speed && (
              <Text className="text-xs text-muted-foreground mb-3">
                {formatSpeed(item.speed)}
              </Text>
            )}

            {/* 展开的详细信息 */}
            <Animated.View style={expandProgress} className="overflow-hidden">
              <View className="mt-2 py-2 bg-muted/30 rounded-md px-3">
                <Text className="text-xs mb-1">
                  <Text className="font-medium">URL: </Text>
                  <Text numberOfLines={1} ellipsizeMode="middle">
                    {item.url}
                  </Text>
                </Text>
                {item.size > 0 && (
                  <Text className="text-xs mb-1">
                    <Text className="font-medium">大小: </Text>
                    {formatFileSize(item.size)}
                  </Text>
                )}
                <Text className="text-xs mb-1">
                  <Text className="font-medium">开始时间: </Text>
                  {new Date(item.startTime).toLocaleString()}
                </Text>
                {item.error && (
                  <Text className="text-xs text-red-500 mb-1">
                    <Text className="font-medium">错误: </Text>
                    {item.error}
                  </Text>
                )}
              </View>
            </Animated.View>

            <View className="flex-row justify-end space-x-2 mt-3">
              {item.status === "error" && onRetry && (
                <Button
                  size="sm"
                  variant="outline"
                  onPress={() => onRetry(item.id)}
                  accessibilityLabel="重试下载"
                  accessibilityHint="重新尝试失败的下载"
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
                  accessibilityLabel="暂停下载"
                  accessibilityHint="暂停当前的下载任务"
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
                    accessibilityLabel="继续下载"
                    accessibilityHint="继续已暂停的下载任务"
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
                  accessibilityLabel="删除下载"
                  accessibilityHint="从下载列表中删除此任务"
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

DownloadItem.displayName = "DownloadItem";

// 筛选选项
type FilterOption = "all" | "active" | "completed" | "error" | "paused";
type SortOption = "newest" | "oldest" | "name" | "progress";

const DownloadList = ({ downloads, isLoading }: DownloadListProps) => {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterOption>("all");
  const [activeSort, setActiveSort] = useState<SortOption>("newest");

  const filterMenu = useAnimatedStyle(() => {
    return {
      height: filterOpen ? withSpring(180) : withTiming(0),
      opacity: filterOpen ? withSpring(1) : withTiming(0),
    };
  });

  const sortMenu = useAnimatedStyle(() => {
    return {
      height: sortOpen ? withSpring(180) : withTiming(0),
      opacity: sortOpen ? withSpring(1) : withTiming(0),
    };
  });

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

  // 筛选逻辑
  const filteredDownloads = useMemo(() => {
    let filtered = [...validatedDownloads];

    // 应用筛选器
    if (activeFilter !== "all") {
      filtered = filtered.filter((item) => {
        switch (activeFilter) {
          case "active":
            return item.status === "downloading";
          case "completed":
            return item.status === "completed";
          case "error":
            return item.status === "error";
          case "paused":
            return item.status === "paused";
          default:
            return true;
        }
      });
    }

    // 应用排序
    switch (activeSort) {
      case "newest":
        filtered.sort((a, b) => b.startTime - a.startTime);
        break;
      case "oldest":
        filtered.sort((a, b) => a.startTime - b.startTime);
        break;
      case "name":
        filtered.sort((a, b) => a.filename.localeCompare(b.filename));
        break;
      case "progress":
        filtered.sort((a, b) => b.progress - a.progress);
        break;
    }

    return filtered;
  }, [validatedDownloads, activeFilter, activeSort]);

  // 下拉刷新
  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    // 这里可以添加刷新下载列表的逻辑
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
  }, []);

  const handleRetry = useCallback(
    (id: string) => {
      retryDownload(id);
      console.log("重试下载:", id);
    },
    [retryDownload]
  );

  const handlePause = useCallback(
    (id: string) => {
      pauseDownload(id);
      console.log("已暂停下载:", id);
    },
    [pauseDownload]
  );

  const handleResume = useCallback(
    (id: string) => {
      resumeDownload(id);
      console.log("继续下载:", id);
    },
    [resumeDownload]
  );

  const handleDelete = useCallback(
    (id: string) => {
      cancelDownload(id);
      console.log("已删除下载:", id);
    },
    [cancelDownload]
  );

  const renderFilterBadge = (type: FilterOption) => {
    const count = validatedDownloads.filter((item) => {
      switch (type) {
        case "active":
          return item.status === "downloading";
        case "completed":
          return item.status === "completed";
        case "error":
          return item.status === "error";
        case "paused":
          return item.status === "paused";
        default:
          return true;
      }
    }).length;

    return count > 0 ? (
      <Badge variant="secondary" className="ml-2">
        {count}
      </Badge>
    ) : null;
  };

  if (validatedDownloads.length === 0) {
    return (
      <Alert variant="default" icon={<Download />}>
        <AlertTitle>暂无下载</AlertTitle>
        <AlertDescription>
          {isLoading ? "正在等待下载任务..." : "当前没有正在进行的下载任务"}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <ScrollView
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
      }
    >
      <Animated.View entering={FadeIn} className="flex-1 p-4">
        <View className="flex-row justify-between items-center mb-4">
          <View className="flex-row space-x-2">
            <Button
              variant="outline"
              size="sm"
              onPress={() => {
                setFilterOpen(!filterOpen);
                if (sortOpen) setSortOpen(false);
              }}
              accessibilityLabel="筛选下载列表"
              className={filterOpen ? "bg-primary/10" : ""}
            >
              <Filter size={16} className="mr-1" />
              筛选
              {activeFilter !== "all" && (
                <Badge variant="secondary" className="ml-1">
                  1
                </Badge>
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onPress={() => {
                setSortOpen(!sortOpen);
                if (filterOpen) setFilterOpen(false);
              }}
              accessibilityLabel="排序下载列表"
              className={sortOpen ? "bg-primary/10" : ""}
            >
              {activeSort === "oldest" ? (
                <SortDesc size={16} className="mr-1" />
              ) : (
                <SortAsc size={16} className="mr-1" />
              )}
              排序
            </Button>
          </View>
          <Text className="text-sm text-muted-foreground">
            共 {filteredDownloads.length} 个任务
          </Text>
        </View>

        {/* 筛选菜单 */}
        <Animated.View
          style={filterMenu}
          className="overflow-hidden mb-3 bg-card border rounded-lg border-border"
        >
          <View className="p-3">
            <View className="flex-row justify-between items-center mb-2">
              <Text className="font-medium">筛选下载</Text>
              <TouchableOpacity onPress={() => setFilterOpen(false)}>
                <X size={16} />
              </TouchableOpacity>
            </View>

            <View className="space-y-1">
              <TouchableOpacity
                className={`p-2 flex-row justify-between items-center rounded-md ${
                  activeFilter === "all" ? "bg-primary/10" : ""
                }`}
                onPress={() => setActiveFilter("all")}
              >
                <View className="flex-row items-center">
                  <Download size={16} className="mr-2" />
                  <Text>全部</Text>
                </View>
                {renderFilterBadge("all")}
              </TouchableOpacity>

              <TouchableOpacity
                className={`p-2 flex-row justify-between items-center rounded-md ${
                  activeFilter === "active" ? "bg-primary/10" : ""
                }`}
                onPress={() => setActiveFilter("active")}
              >
                <View className="flex-row items-center">
                  <RefreshCw size={16} className="mr-2 text-primary" />
                  <Text>正在下载</Text>
                </View>
                {renderFilterBadge("active")}
              </TouchableOpacity>

              <TouchableOpacity
                className={`p-2 flex-row justify-between items-center rounded-md ${
                  activeFilter === "completed" ? "bg-primary/10" : ""
                }`}
                onPress={() => setActiveFilter("completed")}
              >
                <View className="flex-row items-center">
                  <Check size={16} className="mr-2 text-green-500" />
                  <Text>已完成</Text>
                </View>
                {renderFilterBadge("completed")}
              </TouchableOpacity>

              <TouchableOpacity
                className={`p-2 flex-row justify-between items-center rounded-md ${
                  activeFilter === "paused" ? "bg-primary/10" : ""
                }`}
                onPress={() => setActiveFilter("paused")}
              >
                <View className="flex-row items-center">
                  <Pause size={16} className="mr-2 text-yellow-500" />
                  <Text>已暂停</Text>
                </View>
                {renderFilterBadge("paused")}
              </TouchableOpacity>

              <TouchableOpacity
                className={`p-2 flex-row justify-between items-center rounded-md ${
                  activeFilter === "error" ? "bg-primary/10" : ""
                }`}
                onPress={() => setActiveFilter("error")}
              >
                <View className="flex-row items-center">
                  <AlertCircle size={16} className="mr-2 text-red-500" />
                  <Text>出错</Text>
                </View>
                {renderFilterBadge("error")}
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>

        {/* 排序菜单 */}
        <Animated.View
          style={sortMenu}
          className="overflow-hidden mb-3 bg-card border rounded-lg border-border"
        >
          <View className="p-3">
            <View className="flex-row justify-between items-center mb-2">
              <Text className="font-medium">排序方式</Text>
              <TouchableOpacity onPress={() => setSortOpen(false)}>
                <X size={16} />
              </TouchableOpacity>
            </View>

            <View className="space-y-1">
              <TouchableOpacity
                className={`p-2 flex-row items-center rounded-md ${
                  activeSort === "newest" ? "bg-primary/10" : ""
                }`}
                onPress={() => setActiveSort("newest")}
              >
                <Check
                  size={16}
                  className={`mr-2 ${
                    activeSort === "newest" ? "opacity-100" : "opacity-0"
                  }`}
                />
                <Text>最新添加</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className={`p-2 flex-row items-center rounded-md ${
                  activeSort === "oldest" ? "bg-primary/10" : ""
                }`}
                onPress={() => setActiveSort("oldest")}
              >
                <Check
                  size={16}
                  className={`mr-2 ${
                    activeSort === "oldest" ? "opacity-100" : "opacity-0"
                  }`}
                />
                <Text>最早添加</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className={`p-2 flex-row items-center rounded-md ${
                  activeSort === "name" ? "bg-primary/10" : ""
                }`}
                onPress={() => setActiveSort("name")}
              >
                <Check
                  size={16}
                  className={`mr-2 ${
                    activeSort === "name" ? "opacity-100" : "opacity-0"
                  }`}
                />
                <Text>按名称</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className={`p-2 flex-row items-center rounded-md ${
                  activeSort === "progress" ? "bg-primary/10" : ""
                }`}
                onPress={() => setActiveSort("progress")}
              >
                <Check
                  size={16}
                  className={`mr-2 ${
                    activeSort === "progress" ? "opacity-100" : "opacity-0"
                  }`}
                />
                <Text>按进度</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>

        <View className={isLandscape ? "flex-row flex-wrap" : ""}>
          {filteredDownloads.map((item) => (
            <View
              key={item.id}
              className={isLandscape ? "w-1/2 pr-2" : "w-full"}
            >
              <DownloadItem
                item={item}
                onRetry={handleRetry}
                onPause={handlePause}
                onResume={handleResume}
                onDelete={handleDelete}
                isLandscape={isLandscape}
              />
            </View>
          ))}
        </View>
      </Animated.View>
    </ScrollView>
  );
};

export default React.memo(DownloadList);
