import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Image,
  Dimensions,
  TouchableOpacity,
  Platform,
  ScrollView,
} from "react-native";
import { WebView } from "react-native-webview";
import { Video, ResizeMode, AVPlaybackStatus } from "expo-av";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";
import * as MediaLibrary from "expo-media-library";
import * as Haptics from "expo-haptics";
import {
  Image as ImageIcon,
  FileText,
  Video as VideoIcon,
  Download,
  Share2,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Info,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  X,
  Loader2,
  Save,
  AlertCircle,
  Eye,
  FileCog,
  RefreshCw,
} from "lucide-react-native";
import Animated, {
  FadeIn,
  FadeOut,
  SlideInUp,
  SlideOutDown,
  useAnimatedStyle,
  useAnimatedGestureHandler,
  useSharedValue,
  withSpring,
  withTiming,
  withSequence,
  Easing,
  runOnJS,
  ZoomIn as ZoomInAnim,
  SlideInRight,
  SlideOutLeft,
} from "react-native-reanimated";
import {
  Gesture,
  GestureDetector,
  PinchGestureHandler,
  PanGestureHandler,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import { FileItem as FileItemType } from "~/stores/useImageStore";
import { Button } from "~/components/ui/button";
import { Text } from "~/components/ui/text";
import { Card } from "~/components/ui/card";
import { Progress } from "~/components/ui/progress";
import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";
import { toast } from "sonner-native";
import { useColorScheme } from "nativewind";

const AnimatedImage = Animated.createAnimatedComponent(Image);
const AnimatedVideo = Animated.createAnimatedComponent(Video);
const AnimatedWebView = Animated.createAnimatedComponent(WebView);

interface FilePreviewProps {
  file: FileItemType;
  onShare?: () => Promise<void>;
  onDownload?: () => Promise<void>;
  onClose?: () => void;
  showInfo?: boolean;
  onNext?: () => void;
  onPrevious?: () => void;
  hasNext?: boolean;
  hasPrevious?: boolean;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export const FilePreview: React.FC<FilePreviewProps> = ({
  file,
  onShare,
  onDownload,
  onClose,
  showInfo = false,
  onNext,
  onPrevious,
  hasNext = false,
  hasPrevious = false,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [videoStatus, setVideoStatus] = useState<AVPlaybackStatus | null>(null);
  const [imageScale, setImageScale] = useState(1);
  const [imageRotation, setImageRotation] = useState(0);
  const [isInfoVisible, setIsInfoVisible] = useState(showInfo);
  const [fileDetails, setFileDetails] = useState<any>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const videoRef = useRef<Video>(null);
  const { colorScheme } = useColorScheme();

  // 动画值
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const footerOpacity = useSharedValue(1);
  const headerOpacity = useSharedValue(1);
  const saveProgress = useSharedValue(0);

  // 手势状态
  const lastScale = useSharedValue(1);
  const lastRotation = useSharedValue(0);
  const lastTranslateX = useSharedValue(0);
  const lastTranslateY = useSharedValue(0);
  const isDragging = useSharedValue(false);

  // 获取文件详细信息
  useEffect(() => {
    const getFileDetails = async () => {
      try {
        const info = await FileSystem.getInfoAsync(file.uri, { size: true });
        setFileDetails(info);
      } catch (error) {
        console.error("获取文件信息失败", error);
      }
    };

    if (file.uri) {
      getFileDetails();
    }
  }, [file]);

  // 处理键盘快捷键 (仅Web平台)
  useEffect(() => {
    if (Platform.OS === "web") {
      const handleKeyDown = (event: KeyboardEvent) => {
        switch (event.key) {
          case "ArrowLeft":
            hasPrevious && onPrevious && onPrevious();
            break;
          case "ArrowRight":
            hasNext && onNext && onNext();
            break;
          case "Escape":
            onClose && onClose();
            break;
          case "+":
            handleZoom(true);
            break;
          case "-":
            handleZoom(false);
            break;
          case "r":
            handleRotate();
            break;
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [hasPrevious, hasNext, onPrevious, onNext, onClose]);

  // 手势动画样式
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  // 保存进度条动画样式
  const saveProgressStyle = useAnimatedStyle(() => ({
    width: `${saveProgress.value}%`,
  }));

  // 控制栏显示/隐藏动画
  const footerStyle = useAnimatedStyle(() => ({
    opacity: footerOpacity.value,
    transform: [
      {
        translateY: withTiming(footerOpacity.value === 0 ? 100 : 0, {
          duration: 200,
        }),
      },
    ],
  }));

  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [
      {
        translateY: withTiming(headerOpacity.value === 0 ? -100 : 0, {
          duration: 200,
        }),
      },
    ],
  }));

  // 处理加载事件
  const handleLoadStart = () => {
    setIsLoading(true);
    setError(null);
    setLoadingProgress(0);
  };

  const handleLoadProgress = (progress: number) => {
    setLoadingProgress(progress);
  };

  const handleLoadEnd = () => {
    setIsLoading(false);
    setLoadingProgress(100);
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
    setIsLoading(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  };

  // 图片操作方法
  const handleZoom = (zoomIn: boolean) => {
    const newScale = zoomIn ? imageScale * 1.2 : imageScale / 1.2;
    const boundedScale = Math.max(0.5, Math.min(5, newScale));
    setImageScale(boundedScale);
    scale.value = withSpring(boundedScale, { damping: 15, stiffness: 100 });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleRotate = () => {
    const newRotation = (imageRotation + 90) % 360;
    setImageRotation(newRotation);
    rotation.value = withSpring(newRotation, { damping: 15 });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  // 处理全屏切换
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);

    // 隐藏/显示控制栏
    footerOpacity.value = withTiming(isFullscreen ? 1 : 0, { duration: 300 });
    headerOpacity.value = withTiming(isFullscreen ? 1 : 0, { duration: 300 });

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // 视频控制方法
  const togglePlayPause = () => {
    if (videoRef.current) {
      if (videoStatus?.isLoaded && videoStatus.isPlaying) {
        videoRef.current.pauseAsync();
      } else {
        videoRef.current.playAsync();
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  // 保存文件方法
  const handleSaveFile = async () => {
    try {
      setIsSaving(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      saveProgress.value = 0;

      // 请求权限
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        setIsSaving(false);
        toast.error("需要存储权限", {
          description: "请在设置中允许应用访问您的媒体库",
        });
        return;
      }

      // 模拟进度
      saveProgress.value = withTiming(70, { duration: 500 });

      // 保存文件
      const asset = await MediaLibrary.createAssetAsync(file.uri);
      const album = await MediaLibrary.getAlbumAsync("下载");

      if (album === null) {
        await MediaLibrary.createAlbumAsync("下载", asset, false);
      } else {
        await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
      }

      saveProgress.value = withTiming(100, { duration: 300 });

      toast.success("文件已保存", {
        description: `已保存到媒体库 "下载" 相册`,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error("保存文件失败", error);
      toast.error("保存失败", {
        description: error instanceof Error ? error.message : "未知错误",
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      // 延迟关闭保存状态，以便看到100%的进度
      setTimeout(() => {
        setIsSaving(false);
        saveProgress.value = 0;
      }, 1000);
    }
  };

  // 创建手势处理
  const pinchGesture = Gesture.Pinch()
    .onUpdate((event) => {
      scale.value = lastScale.value * event.scale;
    })
    .onEnd(() => {
      lastScale.value = scale.value;
    });

  const rotationGesture = Gesture.Rotation()
    .onUpdate((event) => {
      rotation.value = lastRotation.value + event.rotation * (180 / Math.PI);
    })
    .onEnd(() => {
      lastRotation.value = rotation.value;
    });

  const panGesture = Gesture.Pan()
    .onStart(() => {
      isDragging.value = true;
    })
    .onUpdate((event) => {
      translateX.value = lastTranslateX.value + event.translationX;
      translateY.value = lastTranslateY.value + event.translationY;

      // 根据拖动方向隐藏/显示控制栏
      if (Math.abs(event.translationY) > 20) {
        footerOpacity.value = withTiming(0, { duration: 200 });
        headerOpacity.value = withTiming(0, { duration: 200 });
      }
    })
    .onEnd((event) => {
      lastTranslateX.value = translateX.value;
      lastTranslateY.value = translateY.value;
      isDragging.value = false;

      // 如果是大幅度水平手势，且速度较快，执行上一个/下一个操作
      if (
        Math.abs(event.velocityX) > 500 &&
        Math.abs(event.translationX) > 100
      ) {
        if (event.translationX > 0 && hasPrevious && onPrevious) {
          // 向右滑动，显示上一个
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onPrevious();
          translateX.value = withTiming(0);
          translateY.value = withTiming(0);
          lastTranslateX.value = 0;
          lastTranslateY.value = 0;
        } else if (event.translationX < 0 && hasNext && onNext) {
          // 向左滑动，显示下一个
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onNext();
          translateX.value = withTiming(0);
          translateY.value = withTiming(0);
          lastTranslateX.value = 0;
          lastTranslateY.value = 0;
        }
      }

      // 点击图片（无明显拖动）时，切换控制栏显示状态
      if (
        Math.abs(event.translationX) < 10 &&
        Math.abs(event.translationY) < 10
      ) {
        footerOpacity.value = withTiming(footerOpacity.value === 1 ? 0 : 1, {
          duration: 200,
        });
        headerOpacity.value = withTiming(headerOpacity.value === 1 ? 0 : 1, {
          duration: 200,
        });
      }
    });

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      // 双击重置变换
      scale.value = withSpring(1, { damping: 15 });
      rotation.value = withSpring(0, { damping: 15 });
      translateX.value = withSpring(0, { damping: 15 });
      translateY.value = withSpring(0, { damping: 15 });
      lastScale.value = 1;
      lastRotation.value = 0;
      lastTranslateX.value = 0;
      lastTranslateY.value = 0;

      setImageScale(1);
      setImageRotation(0);

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    });

  // 组合手势
  const combinedGestures = Gesture.Race(
    pinchGesture,
    panGesture,
    doubleTapGesture,
    rotationGesture
  );

  // 格式化文件大小
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "Unknown";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  // 获取文件类型
  const getFileType = useCallback(() => {
    const ext = file.name.split(".").pop()?.toLowerCase();

    if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext || "")) {
      return "图片";
    } else if (["mp4", "mov", "avi", "webm"].includes(ext || "")) {
      return "视频";
    } else if (["pdf"].includes(ext || "")) {
      return "PDF文档";
    } else if (["doc", "docx"].includes(ext || "")) {
      return "Word文档";
    } else if (["xls", "xlsx"].includes(ext || "")) {
      return "Excel表格";
    } else if (["txt", "md"].includes(ext || "")) {
      return "文本文件";
    } else {
      return `${ext?.toUpperCase() || "未知"} 文件`;
    }
  }, [file]);

  // 渲染不同类型的预览
  const renderPreviewContent = useCallback(() => {
    const ext = file.name.split(".").pop()?.toLowerCase();

    switch (ext) {
      case "jpg":
      case "jpeg":
      case "png":
      case "gif":
      case "webp": {
        return (
          <GestureDetector gesture={combinedGestures}>
            <Animated.View className="flex-1 items-center justify-center">
              <AnimatedImage
                source={{ uri: file.uri }}
                style={[
                  {
                    width: SCREEN_WIDTH * 0.9,
                    height: SCREEN_HEIGHT * 0.6,
                    maxWidth: SCREEN_WIDTH * 0.9,
                  },
                  animatedStyle,
                ]}
                resizeMode="contain"
                onLoadStart={handleLoadStart}
                onLoadEnd={handleLoadEnd}
                onError={() => handleError("图片加载失败")}
                accessible={true}
                accessibilityLabel={`图片预览：${file.name}`}
              />
            </Animated.View>
          </GestureDetector>
        );
      }

      case "mp4":
      case "mov":
      case "avi":
      case "webm": {
        return (
          <GestureDetector gesture={panGesture}>
            <Animated.View className="flex-1 items-center justify-center">
              <AnimatedVideo
                ref={videoRef}
                source={{ uri: file.uri }}
                useNativeControls={false}
                resizeMode={ResizeMode.CONTAIN}
                isLooping
                shouldPlay={false}
                onPlaybackStatusUpdate={setVideoStatus}
                style={[
                  {
                    width: SCREEN_WIDTH * 0.9,
                    height: SCREEN_WIDTH * 0.9 * (9 / 16),
                    maxHeight: SCREEN_HEIGHT * 0.6,
                  },
                  animatedStyle,
                ]}
                className="rounded-lg bg-black/20"
                onLoadStart={handleLoadStart}
                onReadyForDisplay={handleLoadEnd}
                onError={(error) => handleError(`视频加载失败: ${error}`)}
                accessible={true}
                accessibilityLabel={`视频预览：${file.name}`}
              />
            </Animated.View>
          </GestureDetector>
        );
      }

      case "pdf":
      case "doc":
      case "docx":
      case "xls":
      case "xlsx": {
        return (
          <View className="flex-1 w-full overflow-hidden rounded-lg bg-background">
            <AnimatedWebView
              source={{ uri: file.uri }}
              onLoadStart={handleLoadStart}
              onLoadEnd={handleLoadEnd}
              onError={(event) =>
                handleError(`文档加载失败: ${event.nativeEvent.description}`)
              }
              className="w-full h-full rounded-lg"
              style={[{ backgroundColor: "transparent" }]}
              onLoadProgress={({ nativeEvent }) =>
                handleLoadProgress(nativeEvent.progress * 100)
              }
              renderLoading={() => (
                <View className="absolute inset-0 items-center justify-center bg-background">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </View>
              )}
            />
          </View>
        );
      }

      case "txt":
      case "md": {
        return (
          <View className="flex-1 w-full overflow-hidden rounded-lg bg-card p-4">
            <WebView
              source={{ uri: file.uri }}
              originWhitelist={["*"]}
              onLoadStart={handleLoadStart}
              onLoadEnd={handleLoadEnd}
              onError={() => handleError("文本文件加载失败")}
              className="w-full h-full rounded-lg"
              style={[{ backgroundColor: "transparent" }]}
            />
          </View>
        );
      }

      default: {
        return (
          <Card className="p-8 items-center space-y-4 bg-background/95 backdrop-blur">
            <FileCog className="h-20 w-20 text-muted-foreground" />
            <Text className="text-lg font-medium">无法预览此类型文件</Text>
            <Text className="text-sm text-muted-foreground text-center">
              当前不支持预览 {ext ? `.${ext}` : "此类型"} 格式的文件
            </Text>
            <View className="flex-row space-x-3">
              {onShare && (
                <Button onPress={onShare} variant="outline">
                  <Share2 className="h-4 w-4 mr-2" />
                  <Text>分享</Text>
                </Button>
              )}
              {onDownload && (
                <Button onPress={onDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  <Text>下载</Text>
                </Button>
              )}
            </View>
          </Card>
        );
      }
    }
  }, [
    file,
    videoStatus,
    combinedGestures,
    panGesture,
    onShare,
    onDownload,
    animatedStyle,
  ]);

  // 渲染底部控制栏
  const renderFooterControls = useCallback(() => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    const isImage = ["jpg", "jpeg", "png", "gif", "webp"].includes(ext || "");
    const isVideo = ["mp4", "mov", "avi", "webm"].includes(ext || "");
    const isPdf = ["pdf"].includes(ext || "");

    return (
      <Animated.View
        style={footerStyle}
        className="absolute bottom-0 left-0 right-0 bg-background/80 backdrop-blur-md p-4 rounded-t-xl border-t border-border/50"
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-row space-x-3">
            {isImage && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-full"
                  onPress={() => handleZoom(true)}
                  accessibilityLabel="放大"
                >
                  <ZoomIn className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-full"
                  onPress={() => handleZoom(false)}
                  accessibilityLabel="缩小"
                >
                  <ZoomOut className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-full"
                  onPress={handleRotate}
                  accessibilityLabel="旋转"
                >
                  <RotateCw className="h-5 w-5" />
                </Button>
              </>
            )}

            {isVideo && (
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full"
                onPress={togglePlayPause}
                accessibilityLabel={
                  videoStatus?.isLoaded
                    ? videoStatus.isPlaying
                      ? "暂停"
                      : "播放"
                    : "播放"
                }
              >
                {videoStatus?.isLoaded ? (
                  videoStatus.isPlaying ? (
                    <Pause className="h-5 w-5" />
                  ) : (
                    <Play className="h-5 w-5" />
                  )
                ) : null}
              </Button>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full"
              onPress={toggleFullscreen}
              accessibilityLabel={isFullscreen ? "退出全屏" : "全屏"}
            >
              <Maximize2 className="h-5 w-5" />
            </Button>
          </View>

          <View className="flex-row space-x-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full"
              onPress={() => setIsInfoVisible(!isInfoVisible)}
              accessibilityLabel={isInfoVisible ? "隐藏信息" : "显示信息"}
            >
              <Info className="h-5 w-5" />
            </Button>

            {onShare && (
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full"
                onPress={onShare}
                accessibilityLabel="分享"
              >
                <Share2 className="h-5 w-5" />
              </Button>
            )}

            {file.uri && (isImage || isVideo) && (
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full"
                onPress={handleSaveFile}
                disabled={isSaving}
                accessibilityLabel="保存文件"
              >
                {isSaving ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Save className="h-5 w-5" />
                )}
              </Button>
            )}
          </View>
        </View>

        {isVideo && videoStatus?.isLoaded && (
          <View className="mt-2">
            <Progress
              value={
                (videoStatus.positionMillis / videoStatus.durationMillis!) * 100
              }
              className="h-1.5"
            />
            <View className="flex-row justify-between mt-1">
              <Text className="text-xs text-muted-foreground">
                {formatTime(videoStatus.positionMillis)}
              </Text>
              <Text className="text-xs text-muted-foreground">
                {formatTime(videoStatus.durationMillis || 0)}
              </Text>
            </View>
          </View>
        )}

        {isSaving && (
          <View className="mt-2">
            <Animated.View
              className="h-1 bg-primary rounded-full"
              style={saveProgressStyle}
            />
            <Text className="text-xs text-muted-foreground text-center mt-1">
              正在保存...
            </Text>
          </View>
        )}
      </Animated.View>
    );
  }, [
    file,
    videoStatus,
    imageScale,
    isInfoVisible,
    isFullscreen,
    isSaving,
    footerStyle,
    saveProgressStyle,
    onShare,
    handleRotate,
    handleZoom,
    toggleFullscreen,
    togglePlayPause,
  ]);

  // 渲染顶部导航栏
  const renderHeader = useCallback(() => {
    return (
      <Animated.View
        style={headerStyle}
        className="absolute top-0 left-0 right-0 bg-background/80 backdrop-blur-md z-10 p-4 flex-row justify-between items-center border-b border-border/50"
      >
        <View className="flex-row items-center space-x-2">
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full"
              onPress={onClose}
              accessibilityLabel="关闭"
            >
              <X className="h-5 w-5" />
            </Button>
          )}
          <Text className="text-base font-medium flex-1 mr-2" numberOfLines={1}>
            {file.name}
          </Text>
        </View>

        <View className="flex-row">
          {hasPrevious && onPrevious && (
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full"
              onPress={onPrevious}
              accessibilityLabel="上一个"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}

          {hasNext && onNext && (
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full"
              onPress={onNext}
              accessibilityLabel="下一个"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          )}
        </View>
      </Animated.View>
    );
  }, [headerStyle, file, onClose, hasPrevious, hasNext, onPrevious, onNext]);

  // 渲染文件信息侧边栏
  const renderFileInfo = useCallback(() => {
    if (!isInfoVisible) return null;

    return (
      <Animated.View
        entering={SlideInRight.springify()}
        exiting={SlideOutLeft}
        className="absolute top-16 bottom-16 right-4 w-64 bg-background/90 backdrop-blur-md p-4 rounded-xl border border-border/60 shadow-lg"
      >
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="space-y-4">
            <View>
              <Text className="text-lg font-semibold">文件信息</Text>
              <Text className="text-muted-foreground text-sm">
                {getFileType()}
              </Text>
            </View>

            <View className="space-y-2">
              <InfoItem label="文件名" value={file.name} />
              <InfoItem
                label="大小"
                value={formatFileSize(fileDetails?.size)}
              />
              <InfoItem
                label="修改时间"
                value={
                  fileDetails?.modificationTime
                    ? new Date(fileDetails.modificationTime).toLocaleString()
                    : "未知"
                }
              />
              <InfoItem
                label="路径"
                value={fileDetails?.uri || file.uri || "未知"}
                truncate
              />

              {fileDetails?.size && (
                <View className="pt-2">
                  <Badge variant="outline" className="mb-1">
                    存储信息
                  </Badge>
                  <Progress
                    value={20}
                    className="h-2 my-2"
                    indicatorClassName="bg-primary"
                  />
                  <Text className="text-xs text-muted-foreground">
                    已使用 {formatFileSize(fileDetails.size)} / 可用空间
                  </Text>
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      </Animated.View>
    );
  }, [isInfoVisible, file, fileDetails, getFileType]);

  // 格式化视频时间
  const formatTime = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  // 格式化元数据键名
  const formatMetadataKey = (key: string) => {
    switch (key) {
      case "width":
        return "宽度";
      case "height":
        return "高度";
      case "exposure":
        return "曝光值";
      case "iso":
        return "ISO";
      case "focalLength":
        return "焦距";
      case "timestamp":
        return "拍摄时间";
      default:
        return key.charAt(0).toUpperCase() + key.slice(1);
    }
  };

  // 格式化元数据值
  const formatMetadataValue = (key: string, value: any) => {
    switch (key) {
      case "width":
      case "height":
        return `${value} px`;
      case "focalLength":
        return `${value} mm`;
      case "timestamp":
        return new Date(value).toLocaleString();
      default:
        return String(value);
    }
  };

  // 信息项组件
  const InfoItem = ({
    label,
    value,
    truncate = false,
  }: {
    label: string;
    value: string;
    truncate?: boolean;
  }) => (
    <View>
      <Text className="text-xs text-muted-foreground">{label}</Text>
      <Text className="text-sm" numberOfLines={truncate ? 1 : undefined}>
        {value}
      </Text>
    </View>
  );

  return (
    <GestureHandlerRootView className="flex-1 bg-background/90 backdrop-blur-lg">
      <View className="flex-1 relative">
        {/* 渲染加载状态 */}
        {isLoading && (
          <View className="absolute z-20 left-0 right-0 top-1/3 items-center">
            <View className="bg-background/90 backdrop-blur-lg p-4 rounded-xl w-64">
              <Skeleton className="h-4 w-12 mx-auto rounded-full mb-4" />
              <Progress value={loadingProgress} className="w-full h-1.5 mb-2" />
              <Text className="text-center text-sm text-muted-foreground">
                正在加载...{loadingProgress.toFixed(0)}%
              </Text>
            </View>
          </View>
        )}

        {/* 渲染错误状态 */}
        {error ? (
          <Animated.View
            entering={ZoomInAnim.duration(300)}
            className="flex-1 items-center justify-center p-4"
          >
            <Card className="p-6 items-center space-y-4 bg-destructive/10 w-full max-w-md">
              <AlertCircle className="h-12 w-12 text-destructive" />
              <Text className="text-lg font-medium text-destructive">
                加载失败
              </Text>
              <Text className="text-destructive/90 text-center">{error}</Text>
              <Button variant="outline" onPress={() => setError(null)}>
                <RefreshCw className="h-4 w-4 mr-2" />
                <Text>重试</Text>
              </Button>
            </Card>
          </Animated.View>
        ) : (
          // 渲染预览内容
          <View className="flex-1 items-center justify-center">
            {renderPreviewContent()}
          </View>
        )}

        {/* 导航和控制条 */}
        {!error && (
          <>
            {renderHeader()}
            {renderFooterControls()}
            {renderFileInfo()}
          </>
        )}
      </View>
    </GestureHandlerRootView>
  );
};

export default React.memo(FilePreview);
