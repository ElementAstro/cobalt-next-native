import React, { memo, useState, useCallback, useRef, useEffect } from "react";
import {
  Folder,
  File,
  Image as ImageIcon,
  Music,
  Video,
  Share2,
  Edit2,
  Trash,
  Copy,
  Move,
  Download,
  Eye,
  Star,
  Clock,
  Info,
  Lock,
  Loader2,
  AlertCircle,
  MoreVertical,
  Shield,
} from "lucide-react-native";
import {
  View,
  Image,
  TouchableOpacity,
  Dimensions,
  Platform,
  AccessibilityInfo,
  StyleSheet,
} from "react-native";
import Animated, {
  FadeIn,
  FadeInRight,
  FadeOut,
  LinearTransition,
  SlideInUp,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  Easing,
  ZoomIn,
  ZoomOut,
  interpolate,
  Extrapolation,
  SlideOutDown,
  BounceIn,
  withRepeat,
  withDelay,
  cancelAnimation,
  useAnimatedReaction,
} from "react-native-reanimated";
import { FileItem as FileItemType } from "~/stores/useImageStore";
import { useColorScheme } from "nativewind";
import { Card } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Text } from "~/components/ui/text";
import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";
import * as Haptics from "expo-haptics";

const AnimatedCard = Animated.createAnimatedComponent(Card);
const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);
const AnimatedImage = Animated.createAnimatedComponent(Image);

interface FileItemProps {
  file: FileItemType;
  index: number;
  isLandscape: boolean;
  isSelected?: boolean;
  onFileAction: (file: FileItemType, action: string) => void;
  onLongPress?: () => void;
  onPress?: () => void;
  delayAnimation?: number;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const ITEM_SIZE = SCREEN_WIDTH * 0.28;

export const FileItem = memo(
  ({
    file,
    index,
    isLandscape,
    isSelected,
    onFileAction,
    onLongPress,
    onPress,
    delayAnimation = 0,
  }: FileItemProps) => {
    const [thumbnailError, setThumbnailError] = useState(false);
    const [thumbnailLoading, setThumbnailLoading] = useState(true);
    const [showActions, setShowActions] = useState(false);
    const [showExtendedActions, setShowExtendedActions] = useState(false);
    const { colorScheme } = useColorScheme();
    const itemRef = useRef<View>(null);
    const [isScreenReaderEnabled, setIsScreenReaderEnabled] = useState(false);

    // 优化：添加缩略图加载重试机制
    const [retryCount, setRetryCount] = useState(0);
    const MAX_RETRIES = 2;

    // 动画值
    const scale = useSharedValue(0.8);
    const opacity = useSharedValue(0);
    const elevation = useSharedValue(2);
    const rotation = useSharedValue(0);
    const shimmerPosition = useSharedValue(0);
    const pressed = useSharedValue(0);
    const highlighted = useSharedValue(0);

    // 初始化动画 - 优化：使用更流畅的弹性动画
    useEffect(() => {
      const entryDelay = Math.min(delayAnimation + index * 30, 1000); // 优化：限制最大延迟
      opacity.value = withDelay(
        entryDelay,
        withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) })
      );
      scale.value = withDelay(
        entryDelay,
        withSpring(1, { damping: 14, stiffness: 120, mass: 0.8 })
      );

      // 启动闪光加载动画
      shimmerPosition.value = withRepeat(
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        -1,
        false
      );

      return () => {
        // 优化：安全地取消动画，防止内存泄漏
        cancelAllAnimations();
      };
    }, []);

    // 检查屏幕阅读器状态
    useEffect(() => {
      let isMounted = true;
      const checkScreenReader = async () => {
        try {
          const isEnabled = await AccessibilityInfo.isScreenReaderEnabled();
          if (isMounted) {
            setIsScreenReaderEnabled(isEnabled);
          }
        } catch (error) {
          console.warn("Failed to check screen reader status:", error);
        }
      };

      checkScreenReader();
      const subscription = AccessibilityInfo.addEventListener(
        "screenReaderChanged",
        setIsScreenReaderEnabled
      );

      return () => {
        isMounted = false;
        // 优化：确保正确清理订阅
        subscription.remove();
      };
    }, []);

    // 处理选中状态的动画 - 优化：更流畅的状态转换
    useEffect(() => {
      if (isSelected) {
        scale.value = withSpring(0.97, { damping: 15, stiffness: 180 });
        opacity.value = withSpring(0.97);
        elevation.value = withSpring(10, { damping: 12 });
        highlighted.value = withTiming(1, { duration: 400 });
        rotation.value = withSequence(
          withTiming(-1.5, { duration: 120 }),
          withTiming(1.5, { duration: 120 }),
          withTiming(0, { duration: 120 })
        );
        if (Platform.OS !== "web") {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      } else {
        scale.value = withSpring(1, { damping: 18 });
        opacity.value = withSpring(1);
        elevation.value = withSpring(2);
        highlighted.value = withTiming(0, { duration: 400 });
      }
    }, [isSelected]);

    // 卡片主体动画样式
    const animatedStyle = useAnimatedStyle(() => {
      return {
        transform: [
          { scale: scale.value },
          { rotateZ: `${rotation.value}deg` },
        ],
        opacity: opacity.value,
        elevation: elevation.value,
        shadowOpacity: interpolate(pressed.value, [0, 1], [0.1, 0.25]),
        shadowRadius: interpolate(pressed.value, [0, 1], [2, 6]),
      };
    });

    // 高亮选中效果 - 优化：更明显的选中状态
    const highlightedStyle = useAnimatedStyle(() => {
      const borderWidth = interpolate(highlighted.value, [0, 1], [1, 2.5]);
      return {
        borderWidth,
        borderColor: withTiming(
          highlighted.value > 0.5
            ? "rgb(16, 185, 129)"
            : "rgba(128, 128, 128, 0.2)",
          { duration: 300 }
        ),
      };
    });

    // 闪光加载效果动画
    const shimmerAnimStyle = useAnimatedStyle(() => {
      return {
        transform: [
          {
            translateX: interpolate(
              shimmerPosition.value,
              [0, 1],
              [-ITEM_SIZE, ITEM_SIZE * 2],
              Extrapolation.CLAMP
            ),
          },
        ],
      };
    });

    // 缩略图放大效果 - 优化：更自然的悬停动画
    const imageAnimStyle = useAnimatedStyle(() => {
      const scale = interpolate(pressed.value, [0, 1], [1, 1.08]);
      return {
        transform: [{ scale }],
        borderRadius: withTiming(12, { duration: 150 }),
      };
    });

    // 按下效果
    const handlePressIn = () => {
      pressed.value = withTiming(1, {
        duration: 150,
        easing: Easing.out(Easing.quad),
      });
    };

    const handlePressOut = () => {
      pressed.value = withTiming(0, {
        duration: 250,
        easing: Easing.inOut(Easing.quad),
      });
    };

    // 优化：使用 useCallback 改进性能
    const getFileIcon = useCallback((file: FileItemType) => {
      if (file.isDirectory)
        return <Folder className="h-10 w-10 text-primary" />;
      const ext = file.name.split(".").pop()?.toLowerCase() || "";

      // 优化：按文件类型分类的更全面支持
      // 图像文件
      if (
        [
          "jpg",
          "jpeg",
          "png",
          "gif",
          "webp",
          "svg",
          "bmp",
          "tiff",
          "heic",
        ].includes(ext)
      ) {
        return <ImageIcon className="h-10 w-10 text-blue-500" />;
      }
      // 音频文件
      if (["mp3", "wav", "ogg", "flac", "aac", "m4a"].includes(ext)) {
        return <Music className="h-10 w-10 text-green-500" />;
      }
      // 视频文件
      if (
        ["mp4", "mov", "avi", "mkv", "webm", "flv", "wmv", "m4v"].includes(ext)
      ) {
        return <Video className="h-10 w-10 text-purple-500" />;
      }
      // 文档文件
      if (["pdf", "doc", "docx", "txt", "rtf", "md"].includes(ext)) {
        return <File className="h-10 w-10 text-amber-500" />;
      }
      // 压缩文件
      if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) {
        return <Shield className="h-10 w-10 text-indigo-500" />;
      }

      // 默认文件图标
      return <File className="h-10 w-10 text-muted-foreground" />;
    }, []);

    const formatFileSize = useCallback((size?: number) => {
      if (size === undefined || size === null) return "N/A";
      if (size < 1024) return `${size} B`;
      if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
      if (size < 1024 * 1024 * 1024)
        return `${(size / 1024 / 1024).toFixed(1)} MB`;
      return `${(size / 1024 / 1024 / 1024).toFixed(2)} GB`;
    }, []);

    const formatDate = useCallback((timestamp?: number) => {
      if (!timestamp) return "未知";

      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMinutes = Math.floor(diffMs / (1000 * 60));

      if (diffMinutes < 60) {
        return diffMinutes <= 1 ? "刚刚" : `${diffMinutes}分钟前`;
      } else if (diffHours < 24) {
        return `${diffHours}小时前`;
      } else if (diffDays === 0) {
        return "今天";
      } else if (diffDays === 1) {
        return "昨天";
      } else if (diffDays < 7) {
        return `${diffDays}天前`;
      } else if (diffDays < 30) {
        return `${Math.floor(diffDays / 7)}周前`;
      } else {
        return date.toLocaleDateString();
      }
    }, []);

    // 优化：重试加载缩略图
    const handleRetryLoadThumbnail = () => {
      if (retryCount < MAX_RETRIES) {
        setThumbnailError(false);
        setThumbnailLoading(true);
        setRetryCount(retryCount + 1);
      }
    };

    // 渲染缩略图，包含加载和错误状态
    const renderThumbnail = useCallback(() => {
      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      const isImage = [
        "jpg",
        "jpeg",
        "png",
        "gif",
        "webp",
        "heic",
        "svg",
      ].includes(ext);

      if (isImage && !thumbnailError && file.uri) {
        return (
          <View className="relative w-full h-full">
            {thumbnailLoading && (
              <Animated.View
                className="absolute inset-0 overflow-hidden items-center justify-center bg-muted/10 rounded-xl"
                entering={FadeIn.duration(200)}
                exiting={FadeOut.duration(200)}
              >
                {/* 骨架加载效果 - 优化：更平滑的加载状态 */}
                <Skeleton className="w-full h-full rounded-xl" />
                <Animated.View
                  className="absolute h-full w-1/3 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                  style={shimmerAnimStyle}
                />
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              </Animated.View>
            )}

            <AnimatedImage
              source={{ uri: file.uri }}
              className="w-full h-full rounded-xl bg-muted/20"
              style={[{ width: ITEM_SIZE, height: ITEM_SIZE }, imageAnimStyle]}
              onLoadStart={() => setThumbnailLoading(true)}
              onLoadEnd={() => setThumbnailLoading(false)}
              onError={() => {
                setThumbnailError(true);
                setThumbnailLoading(false);
              }}
              resizeMode="cover"
              accessible={true}
              accessibilityLabel={`${file.name} 图片缩略图`}
              accessibilityHint="点击可查看详情"
            />

            {/* 文件类型标志 - 优化：更美观的文件类型标签 */}
            <Badge
              variant="secondary"
              className="absolute bottom-1 right-1 rounded-full px-1.5 py-0 bg-background/70 backdrop-blur-sm border border-border/10"
            >
              <Text className="text-[10px] font-medium">
                {ext?.toUpperCase()}
              </Text>
            </Badge>

            {/* 优化：添加保护/锁定图标 */}
            {file.isProtected && (
              <View className="absolute top-1 right-1 bg-background/60 rounded-full backdrop-blur-sm p-0.5">
                <Lock className="h-3.5 w-3.5 text-amber-500" />
              </View>
            )}
          </View>
        );
      }

      if (thumbnailError) {
        return (
          <Animated.View
            className="w-full h-full items-center justify-center bg-muted/10 rounded-xl"
            style={{ width: ITEM_SIZE, height: ITEM_SIZE }}
            entering={ZoomIn.duration(300).springify()}
          >
            <AlertCircle className="h-10 w-10 text-destructive/70" />
            <Text className="text-xs text-muted-foreground mt-2">
              图片加载失败
            </Text>

            {/* 优化：添加重试按钮 */}
            {retryCount < MAX_RETRIES && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 py-1 px-2 h-auto"
                onPress={handleRetryLoadThumbnail}
              >
                <Text className="text-xs text-primary">重试</Text>
              </Button>
            )}
          </Animated.View>
        );
      }

      return (
        <Animated.View
          className="w-full h-full items-center justify-center bg-muted/10 rounded-xl"
          style={{ width: ITEM_SIZE, height: ITEM_SIZE }}
          entering={ZoomIn.duration(300).springify()}
        >
          {getFileIcon(file)}
          {!file.isDirectory && (
            <Text className="mt-1 text-xs font-medium text-muted-foreground">
              {file.name.split(".").pop()?.toUpperCase()}
            </Text>
          )}
        </Animated.View>
      );
    }, [
      file,
      thumbnailError,
      thumbnailLoading,
      retryCount,
      getFileIcon,
      shimmerAnimStyle,
      imageAnimStyle,
    ]);

    // 主要文件操作
    const primaryActions = [
      { icon: Eye, action: "preview", label: "预览", color: "text-primary" },
      { icon: Share2, action: "share", label: "分享", color: "text-blue-500" },
      {
        icon: Download,
        action: "download",
        label: "下载",
        color: "text-green-500",
      },
      {
        icon: MoreVertical,
        action: "more",
        label: "更多",
        color: "text-muted-foreground",
      },
    ];

    // 更多文件操作
    const secondaryActions = [
      {
        icon: Edit2,
        action: "rename",
        label: "重命名",
        color: "text-amber-500",
      },
      { icon: Star, action: "star", label: "收藏", color: "text-yellow-500" },
      { icon: Info, action: "info", label: "详情", color: "text-blue-400" },
      { icon: Lock, action: "lock", label: "加密", color: "text-violet-500" },
      { icon: Copy, action: "copy", label: "复制", color: "text-indigo-400" },
      { icon: Move, action: "move", label: "移动", color: "text-cyan-500" },
      {
        icon: Trash,
        action: "delete",
        label: "删除",
        color: "text-destructive",
      },
    ];

    // 优化：按下效果与交互反馈
    const handlePress = () => {
      scale.value = withSequence(
        withTiming(0.96, { duration: 100, easing: Easing.out(Easing.quad) }),
        withSpring(1, { damping: 14, stiffness: 120 })
      );

      // 提供触觉反馈
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      onPress?.();

      // 切换显示操作
      if (showExtendedActions) {
        setShowExtendedActions(false);
      } else if (showActions) {
        setShowActions(false);
      } else {
        setShowActions(true);
      }
    };

    // 优化：更强的长按反馈
    const handleLongPress = () => {
      // 添加触觉反馈，增强用户体验
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        rotation.value = withSequence(
          withTiming(-3, { duration: 100 }),
          withTiming(3, { duration: 100 }),
          withTiming(-1.5, { duration: 100 }),
          withTiming(1.5, { duration: 100 }),
          withTiming(0, { duration: 100 })
        );
      }

      onLongPress?.();
    };

    const handleActionPress = (action: string) => {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      if (action === "more") {
        setShowExtendedActions(true);
        return;
      }

      onFileAction(file, action);

      if (showExtendedActions) {
        setShowExtendedActions(false);
      }

      setShowActions(false);
    };

    // 渲染文件信息标签 - 优化：更美观的布局和更多信息
    const renderFileBadges = () => (
      <View className="flex-row items-center flex-wrap gap-1 mt-1">
        <Badge
          variant="secondary"
          className="rounded-full px-2 py-0 bg-background/70 backdrop-blur-sm border border-border/10"
        >
          <Clock className="h-3 w-3 mr-1" />
          <Text className="text-xs">{formatDate(file.modificationTime)}</Text>
        </Badge>

        {file.size && (
          <Badge variant="outline" className="rounded-full px-2 py-0">
            <Text className="text-xs">{formatFileSize(file.size)}</Text>
          </Badge>
        )}

        {file.isDirectory && (
          <Badge
            variant="default"
            className="rounded-full px-2 py-0 bg-primary/20 border border-primary/30"
          >
            <Folder className="h-3 w-3 mr-1 text-primary" />
            <Text className="text-xs">文件夹</Text>
          </Badge>
        )}

        {/* 优化：显示更多文件状态标签 */}
        {file.isFavorite && (
          <Badge
            variant="default"
            className="rounded-full px-2 py-0 bg-yellow-500/20 border border-yellow-500/30"
          >
            <Star className="h-3 w-3 mr-1 text-yellow-500" fill="#EAB308" />
          </Badge>
        )}
      </View>
    );

    // 优化：安全地取消所有动画
    const cancelAllAnimations = useCallback(() => {
      "worklet";
      cancelAnimation(scale);
      cancelAnimation(opacity);
      cancelAnimation(elevation);
      cancelAnimation(rotation);
      cancelAnimation(shimmerPosition);
      cancelAnimation(pressed);
      cancelAnimation(highlighted);
    }, [
      scale,
      opacity,
      elevation,
      rotation,
      shimmerPosition,
      pressed,
      highlighted,
    ]);

    return (
      <AnimatedTouchable
        ref={itemRef}
        onPress={handlePress}
        onLongPress={handleLongPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        delayLongPress={300}
        activeOpacity={0.95}
        style={animatedStyle}
        accessible={true}
        accessibilityLabel={`${file.isDirectory ? "文件夹" : "文件"}: ${
          file.name
        }, 大小: ${formatFileSize(file.size)}`}
        accessibilityRole="button"
        accessibilityHint="点击查看详情，长按选择操作"
        accessibilityState={{ selected: isSelected }}
      >
        <AnimatedCard
          entering={FadeInRight.delay(index * 50).springify()}
          layout={LinearTransition.springify()}
          className={`
          overflow-hidden bg-background/95 backdrop-blur 
          ${isSelected ? "border-primary border-2" : "border border-border/50"}
          ${isLandscape ? "p-2" : "p-3"}
        `}
          style={[
            {
              shadowColor: colorScheme === "dark" ? "#000" : "#888",
              shadowOffset: { width: 0, height: 2 },
            },
            highlightedStyle,
          ]}
        >
          <View className="space-y-3">
            {renderThumbnail()}

            <View className="space-y-1">
              <View className="flex-row items-center justify-between">
                <Text
                  numberOfLines={1}
                  className={`font-medium ${
                    isLandscape ? "text-sm" : "text-base"
                  } flex-1 mr-1`}
                >
                  {file.name}
                </Text>

                {/* 优化：显示文件保护状态图标 */}
                {(file.isProtected || file.isReadOnly) && (
                  <Lock className="h-3.5 w-3.5 text-amber-500" />
                )}
              </View>

              {renderFileBadges()}
            </View>

            {/* 主要操作按钮 - 优化：更流畅的动画和更美观的按钮 */}
            {showActions && !showExtendedActions && (
              <Animated.View
                entering={BounceIn.duration(300).springify()}
                exiting={SlideOutDown.duration(200)}
                className="flex-row items-center justify-between mt-2 gap-1"
              >
                {primaryActions.map(({ icon: Icon, action, label, color }) => (
                  <Button
                    key={action}
                    variant="ghost"
                    size="icon"
                    className="flex-1 h-9 rounded-full bg-muted/30"
                    onPress={() => handleActionPress(action)}
                    accessibilityLabel={`${label} ${file.name}`}
                    accessibilityRole="button"
                    accessibilityHint={`点击${label}此文件`}
                  >
                    <Icon className={`h-4 w-4 ${color}`} />
                  </Button>
                ))}
              </Animated.View>
            )}

            {/* 扩展操作按钮 - 优化：更好的布局和交互 */}
            {showExtendedActions && (
              <Animated.View
                entering={SlideInUp.duration(200).springify()}
                exiting={SlideOutDown.duration(150)}
                className="flex-row flex-wrap gap-1 mt-2"
              >
                {secondaryActions.map(
                  ({ icon: Icon, action, label, color }) => (
                    <Button
                      key={action}
                      variant="ghost"
                      size="sm"
                      className="flex-1 h-8 min-w-[80px] rounded-lg"
                      onPress={() => handleActionPress(action)}
                      accessibilityLabel={`${label} ${file.name}`}
                      accessibilityRole="button"
                      accessibilityHint={`点击${label}此文件`}
                    >
                      <Icon className={`h-4 w-4 mr-1 ${color}`} />
                      <Text className="text-xs">{label}</Text>
                    </Button>
                  )
                )}
              </Animated.View>
            )}
          </View>
        </AnimatedCard>
      </AnimatedTouchable>
    );
  }
);

FileItem.displayName = "FileItem";

export default FileItem;
