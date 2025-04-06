import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Dimensions,
  ScrollView,
  Platform,
  TouchableOpacity,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import * as MediaLibrary from "expo-media-library";
import * as Haptics from "expo-haptics";
import { toast } from "sonner-native";
import {
  X,
  Camera,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Upload,
  Image as ImageIcon,
  Loader2,
  Info,
  ArrowDownToLine,
  Folder,
  RefreshCw,
} from "lucide-react-native";
import Animated, {
  FadeIn,
  FadeOut,
  SlideInRight,
  SlideOutLeft,
  Layout,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  withTiming,
  Easing,
  withDelay,
  SlideInUp,
  ZoomIn,
} from "react-native-reanimated";
import { z } from "zod";
import { Button } from "~/components/ui/button";
import { Progress } from "~/components/ui/progress";
import { Text } from "~/components/ui/text";
import { Card } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";

const AnimatedCard = Animated.createAnimatedComponent(Card);
const AnimatedButton = Animated.createAnimatedComponent(Button);

// 类型定义
interface ImageFile {
  uri: string;
  name: string;
  type: string;
  size: number;
  metadata?: {
    width?: number;
    height?: number;
    exposure?: string;
    iso?: number;
    focalLength?: number;
    timestamp?: string;
  };
  id: string;
}

interface ImagePreviewProps {
  item: ImageFile;
  onRemove: (id: string) => void;
  onInfoPress: (item: ImageFile) => void;
  index: number;
}

interface UploadProgressProps {
  progress: number;
  fileName: string;
  totalFiles: number;
  currentFileIndex: number;
}

interface ImageUploaderProps {
  uploadUrl: string;
  maxFiles?: number;
  acceptedTypes?: string[];
  maxFileSize?: number; // 以字节为单位
  onUploadComplete?: (files: ImageFile[]) => void;
  autoUpload?: boolean;
}

// Validation Schema
const ImageFileSchema = z.object({
  uri: z.string(),
  name: z.string(),
  type: z.string(),
  size: z.number(),
  metadata: z
    .object({
      width: z.number().optional(),
      height: z.number().optional(),
      exposure: z.string().optional(),
      iso: z.number().optional(),
      focalLength: z.number().optional(),
      timestamp: z.string().optional(),
    })
    .optional(),
  id: z.string(),
});

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const ITEM_WIDTH = (SCREEN_WIDTH - 48) / 2;

// 预览组件
const ImagePreview = React.memo(
  ({ item, onRemove, onInfoPress, index }: ImagePreviewProps) => {
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

    const scale = useSharedValue(1);
    const opacity = useSharedValue(0);

    useEffect(() => {
      opacity.value = withTiming(1, { duration: 300 });
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    }));

    const handleImagePress = () => {
      scale.value = withSequence(
        withTiming(0.95, { duration: 100 }),
        withTiming(1, { duration: 200 })
      );

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onInfoPress(item);
    };

    const handleRemovePress = () => {
      opacity.value = withTiming(0, { duration: 200 });

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // 使用 setTimeout 让动画完成后再删除元素
      setTimeout(() => {
        onRemove(item.id);
      }, 200);
    };

    return (
      <Animated.View
        entering={SlideInRight.delay(index * 50).springify()}
        layout={Layout.springify()}
        style={animatedStyle}
        className="relative m-2"
      >
        <AnimatedCard className="overflow-hidden bg-background/95 backdrop-blur border-border/50">
          <TouchableOpacity
            onPress={handleImagePress}
            activeOpacity={0.8}
            accessible={true}
            accessibilityLabel={`图片预览:${item.name}, 大小:${(
              item.size /
              1024 /
              1024
            ).toFixed(2)}MB`}
            accessibilityRole="image"
            accessibilityHint="点击查看详情"
          >
            <View className="relative">
              {isLoading && !hasError && (
                <View className="absolute inset-0 flex items-center justify-center">
                  <Skeleton className="w-full h-full" />
                  <Loader2 className="h-8 w-8 animate-spin absolute" />
                </View>
              )}

              {hasError ? (
                <View
                  className="items-center justify-center bg-muted/20"
                  style={{ width: ITEM_WIDTH, height: ITEM_WIDTH }}
                >
                  <AlertCircle className="h-12 w-12 text-destructive/70" />
                  <Text className="text-xs text-muted-foreground mt-2">
                    无法加载图片
                  </Text>
                </View>
              ) : (
                <Animated.Image
                  source={{ uri: item.uri }}
                  style={{ width: ITEM_WIDTH, height: ITEM_WIDTH }}
                  className="rounded-t-lg"
                  onLoadStart={() => setIsLoading(true)}
                  onLoadEnd={() => setIsLoading(false)}
                  onError={() => {
                    setIsLoading(false);
                    setHasError(true);
                  }}
                />
              )}

              <View className="absolute top-2 right-2 flex-row space-x-2">
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-8 w-8 rounded-full bg-background/80"
                  onPress={handleImagePress}
                  accessibilityLabel="查看图片详情"
                >
                  <Info className="h-4 w-4" />
                </Button>
                <Button
                  variant="destructive"
                  size="icon"
                  className="h-8 w-8 rounded-full bg-background/80"
                  onPress={handleRemovePress}
                  accessibilityLabel={`删除图片 ${item.name}`}
                >
                  <X className="h-4 w-4" />
                </Button>
              </View>
            </View>

            <View className="p-2 space-y-1">
              <Text numberOfLines={1} className="text-sm font-medium">
                {item.name}
              </Text>
              <View className="flex-row justify-between items-center">
                <Badge variant="secondary" className="rounded-full px-2 py-0">
                  {(item.size / 1024 / 1024).toFixed(2)} MB
                </Badge>

                {item.metadata?.width && item.metadata?.height && (
                  <Text className="text-xs text-muted-foreground">
                    {item.metadata.width} × {item.metadata.height}
                  </Text>
                )}
              </View>
            </View>
          </TouchableOpacity>
        </AnimatedCard>
      </Animated.View>
    );
  }
);

// 上传进度组件
const UploadProgress = React.memo(
  ({
    progress,
    fileName,
    totalFiles,
    currentFileIndex,
  }: UploadProgressProps) => {
    const progressAnim = useSharedValue(0);

    useEffect(() => {
      progressAnim.value = withSpring(progress, { damping: 12 });
    }, [progress]);

    const animatedStyle = useAnimatedStyle(() => ({
      width: `${progressAnim.value}%`,
    }));

    const containerStyle = useAnimatedStyle(() => ({
      opacity: withSpring(progress > 0 ? 1 : 0),
      transform: [
        {
          translateY: withSpring(progress > 0 ? 0 : 20),
        },
      ],
    }));

    return (
      <Animated.View
        style={containerStyle}
        className="space-y-3 py-4 px-4 bg-muted/20 rounded-xl"
      >
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-sm font-medium" numberOfLines={1}>
              正在上传: {fileName}
            </Text>
            <Text className="text-xs text-muted-foreground">
              文件 {currentFileIndex} / {totalFiles}
            </Text>
          </View>
          <Badge variant="outline" className="h-6">
            {progress.toFixed(0)}%
          </Badge>
        </View>

        <View className="h-2 w-full overflow-hidden bg-secondary relative rounded-full">
          <Animated.View
            style={animatedStyle}
            className="absolute h-full bg-primary rounded-full"
          />
        </View>
      </Animated.View>
    );
  }
);

// 主组件
const ImageUploader: React.FC<ImageUploaderProps> = ({
  uploadUrl,
  maxFiles = 10,
  acceptedTypes = ["image/jpeg", "image/png"],
  maxFileSize = 50 * 1024 * 1024, // 默认50MB
  onUploadComplete,
  autoUpload = false,
}) => {
  const [selectedImages, setSelectedImages] = useState<ImageFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [currentUpload, setCurrentUpload] = useState<{
    fileName: string;
    progress: number;
    currentFileIndex: number;
  } | null>(null);
  const [isPermissionDenied, setIsPermissionDenied] = useState(false);
  const [hasError, setHasError] = useState<string | null>(null);

  // 动画值
  const buttonScale = useSharedValue(1);
  const cardOpacity = useSharedValue(1);

  // 自动上传效果
  useEffect(() => {
    if (autoUpload && selectedImages.length > 0 && !uploading) {
      handleUpload();
    }
  }, [selectedImages, autoUpload, uploading]);

  // 权限请求函数
  const requestPermissions = async () => {
    try {
      const { status: mediaStatus } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (mediaStatus !== "granted") {
        setIsPermissionDenied(true);
        return false;
      }

      // 在 iOS 上还需要请求 PhotoLibrary 权限
      if (Platform.OS === "ios") {
        const { status: photoStatus } =
          await MediaLibrary.requestPermissionsAsync();
        if (photoStatus !== "granted") {
          setIsPermissionDenied(true);
          return false;
        }
      }

      setIsPermissionDenied(false);
      return true;
    } catch (error) {
      console.error("Permission request failed:", error);
      setIsPermissionDenied(true);
      return false;
    }
  };

  const handleImageSelect = useCallback(async () => {
    try {
      setHasError(null);

      // 触觉反馈
      buttonScale.value = withSequence(
        withTiming(0.95, { duration: 100 }),
        withTiming(1, { duration: 150 })
      );
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // 请求权限
      const hasPermissions = await requestPermissions();
      if (!hasPermissions) {
        toast.error("需要访问相册权限", {
          description: "请在设置中允许访问相册",
          icon: <AlertCircle className="h-5 w-5" />,
        });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.9, // 稍微压缩以提高性能
        exif: true,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets) {
        const newImages = await Promise.all(
          result.assets.map(async (asset) => {
            try {
              const fileInfo = await FileSystem.getInfoAsync(asset.uri, {
                size: true,
              });

              if (!fileInfo.exists) {
                throw new Error(`无法访问文件: ${asset.fileName || "未知"}`);
              }

              if (fileInfo.size > maxFileSize) {
                throw new Error(
                  `文件 ${asset.fileName || "未知"} 超过最大限制 ${(
                    maxFileSize /
                    1024 /
                    1024
                  ).toFixed(1)}MB`
                );
              }

              return ImageFileSchema.parse({
                uri: asset.uri,
                name: asset.fileName || `IMG_${Date.now()}.jpg`,
                type: asset.mimeType || "image/jpeg",
                size: fileInfo.size,
                metadata: {
                  width: asset.width,
                  height: asset.height,
                  ...asset.exif,
                },
                id: `img-${Date.now()}-${Math.random()
                  .toString(36)
                  .substring(2, 9)}`,
              });
            } catch (error) {
              console.error("Error processing image:", error);
              return null;
            }
          })
        );

        // 过滤掉处理失败的图片
        const validImages = newImages.filter(
          (image) => image !== null
        ) as ImageFile[];

        if (validImages.length === 0) {
          toast.error("添加文件失败", {
            description: "无法处理所选图片",
            icon: <AlertCircle className="h-5 w-5" />,
          });
          return;
        }

        // 检查文件数量限制
        if (selectedImages.length + validImages.length > maxFiles) {
          toast.error("超出最大文件数限制", {
            description: `最多只能选择 ${maxFiles} 个文件`,
            icon: <AlertCircle className="h-5 w-5" />,
          });
          return;
        }

        // 添加新图片
        setSelectedImages((prev) => [...prev, ...validImages]);

        // 触觉反馈和提示
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        toast.success(`已添加 ${validImages.length} 个文件`, {
          icon: <CheckCircle2 className="h-5 w-5" />,
        });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "未知错误";
      setHasError(errorMessage);
      toast.error("选择文件失败", {
        description: errorMessage,
        icon: <AlertCircle className="h-5 w-5" />,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [selectedImages.length, maxFiles, maxFileSize]);

  const handleUpload = useCallback(async () => {
    if (selectedImages.length === 0) return;

    setUploading(true);
    setHasError(null);

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      cardOpacity.value = withTiming(0.8, { duration: 300 });

      for (let i = 0; i < selectedImages.length; i++) {
        const image = selectedImages[i];
        setCurrentUpload({
          fileName: image.name,
          progress: 0,
          currentFileIndex: i + 1,
        });

        const uploadTask = FileSystem.createUploadTask(
          uploadUrl,
          image.uri,
          {
            uploadType: FileSystem.FileSystemUploadType.MULTIPART,
            fieldName: "file",
            parameters: {
              metadata: JSON.stringify(image.metadata),
            },
            headers: {
              "Content-Type": "multipart/form-data",
            },
          },
          (progress) => {
            const percentage = Math.round(
              (progress.totalBytesSent / progress.totalBytesExpectedToSend) *
                100
            );
            setCurrentUpload((prev) =>
              prev ? { ...prev, progress: percentage } : null
            );
          }
        );

        await uploadTask.uploadAsync();
        // 添加短暂延迟以便看到100%状态
        await new Promise((resolve) => setTimeout(resolve, 300));
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.success("上传完成", {
        description: `已成功上传 ${selectedImages.length} 个文件`,
        icon: <CheckCircle2 className="h-5 w-5" />,
      });

      onUploadComplete?.(selectedImages);
      setSelectedImages([]);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "未知错误";
      setHasError(errorMessage);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      toast.error("上传失败", {
        description: errorMessage,
        icon: <AlertCircle className="h-5 w-5" />,
      });
    } finally {
      setUploading(false);
      setCurrentUpload(null);
      cardOpacity.value = withTiming(1, { duration: 300 });
    }
  }, [selectedImages, uploadUrl, onUploadComplete]);

  const handleImageInfo = useCallback((image: ImageFile) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // 显示图片详细信息的模态框
    toast.info(image.name, {
      description: `
        尺寸: ${image.metadata?.width || "?"} × ${image.metadata?.height || "?"}
        大小: ${(image.size / 1024 / 1024).toFixed(2)} MB
        类型: ${image.type}
      `,
      duration: 5000,
    });
  }, []);

  const handleClearSelection = () => {
    if (uploading) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedImages([]);
    setHasError(null);
    toast.info("已清除所有选中文件");
  };

  // 动画样式
  const buttonAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const cardAnimStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
  }));

  // 渲染无权限状态
  const renderPermissionDenied = () => (
    <Animated.View
      entering={FadeIn.duration(300)}
      className="p-4 bg-muted/20 rounded-xl space-y-4 items-center"
    >
      <AlertCircle className="h-12 w-12 text-destructive" />
      <View className="space-y-2 items-center">
        <Text className="text-lg font-medium text-center">
          需要访问相册权限
        </Text>
        <Text className="text-sm text-muted-foreground text-center">
          请在设备设置中允许此应用访问您的相册
        </Text>
      </View>
      <Button variant="default" className="w-full" onPress={requestPermissions}>
        <RefreshCw className="h-4 w-4 mr-2" />
        重试获取权限
      </Button>
    </Animated.View>
  );

  // 渲染错误状态
  const renderError = () => (
    <Animated.View
      entering={SlideInUp.duration(300)}
      className="p-4 bg-destructive/10 rounded-xl space-y-2 mb-4"
    >
      <View className="flex-row items-center space-x-2">
        <AlertCircle className="h-5 w-5 text-destructive" />
        <Text className="font-medium text-destructive">操作失败</Text>
      </View>
      <Text className="text-sm text-destructive/80">{hasError}</Text>
    </Animated.View>
  );

  return (
    <View className="flex-1">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <Animated.View className="p-4 space-y-4" style={cardAnimStyle}>
          {isPermissionDenied ? (
            renderPermissionDenied()
          ) : (
            <>
              <AnimatedButton
                variant={selectedImages.length ? "outline" : "default"}
                onPress={handleImageSelect}
                disabled={uploading}
                className="w-full h-14 rounded-2xl"
                style={buttonAnimStyle}
                accessible={true}
                accessibilityLabel="从相册选择图片"
                accessibilityHint="打开图片选择器以选择需要上传的图片"
              >
                <Camera className="h-5 w-5 mr-2" />
                <Text className="text-base font-medium">
                  {selectedImages.length ? "添加更多图片" : "从相册选择"}
                </Text>
              </AnimatedButton>

              {hasError && renderError()}

              {selectedImages.length > 0 && (
                <Animated.View
                  entering={FadeIn.duration(300)}
                  className="space-y-4"
                >
                  <View className="flex-row items-center justify-between">
                    <Text className="text-base font-medium">
                      已选择 {selectedImages.length} 个文件
                    </Text>
                    <Badge>
                      {(
                        selectedImages.reduce((acc, img) => acc + img.size, 0) /
                        1024 /
                        1024
                      ).toFixed(2)}{" "}
                      MB
                    </Badge>
                  </View>

                  <View className="flex-row flex-wrap -m-2">
                    {selectedImages.map((img, index) => (
                      <ImagePreview
                        key={img.id}
                        item={img}
                        index={index}
                        onRemove={(id) =>
                          setSelectedImages((prev) =>
                            prev.filter((img) => img.id !== id)
                          )
                        }
                        onInfoPress={handleImageInfo}
                      />
                    ))}
                  </View>

                  {currentUpload ? (
                    <UploadProgress
                      progress={currentUpload.progress}
                      fileName={currentUpload.fileName}
                      totalFiles={selectedImages.length}
                      currentFileIndex={currentUpload.currentFileIndex}
                    />
                  ) : (
                    <View className="flex-row space-x-3">
                      <AnimatedButton
                        className="flex-1 h-14 rounded-2xl"
                        onPress={handleUpload}
                        disabled={uploading}
                        style={buttonAnimStyle}
                        accessibilityLabel={`上传 ${selectedImages.length} 个文件`}
                      >
                        {uploading ? (
                          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        ) : (
                          <Upload className="h-5 w-5 mr-2" />
                        )}
                        <Text className="text-base font-medium">
                          {uploading
                            ? "正在上传..."
                            : `上传 ${selectedImages.length} 个文件`}
                        </Text>
                      </AnimatedButton>
                      <AnimatedButton
                        variant="destructive"
                        className="w-14 h-14 rounded-2xl"
                        onPress={handleClearSelection}
                        disabled={uploading}
                        style={buttonAnimStyle}
                        accessibilityLabel="清空选择"
                      >
                        <Trash2 className="h-5 w-5" />
                      </AnimatedButton>
                    </View>
                  )}
                </Animated.View>
              )}
            </>
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
};

export default React.memo(ImageUploader);
