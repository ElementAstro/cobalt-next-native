import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Platform,
  PanResponder,
  GestureResponderEvent,
  Dimensions,
  TouchableOpacity,
} from "react-native";
import * as FileSystem from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import * as Haptics from "expo-haptics";
import { z } from "zod";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withRepeat,
  Easing,
  FadeIn,
  FadeOut,
  SlideInDown,
  ZoomIn,
  LinearTransition,
  BounceIn,
} from "react-native-reanimated";
import {
  Upload,
  Image as ImageIcon,
  File,
  X,
  AlertCircle,
  UploadCloud,
  ArrowUpFromLine,
  FileImage,
} from "lucide-react-native";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Text } from "~/components/ui/text";
import { Alert, AlertTitle, AlertDescription } from "~/components/ui/alert";
import { Progress } from "~/components/ui/progress";
import { useColorScheme } from "nativewind";

interface DragDropZoneProps {
  onFilesDrop: (files: FileInfo[]) => void;
  maxFiles?: number;
  maxFileSize?: number; // in bytes
  acceptedFileTypes?: string[];
  isUploading?: boolean;
  uploadProgress?: number;
  className?: string;
  children?: React.ReactNode;
  showFilePreviews?: boolean;
}

export interface FileInfo {
  uri: string;
  name: string;
  type: string;
  size: number;
  id: string;
}

const FileSchema = z.object({
  uri: z.string(),
  name: z.string(),
  type: z.string(),
  size: z.number(),
  id: z.string(),
});

const AnimatedCard = Animated.createAnimatedComponent(Card);

const DragDropZone: React.FC<DragDropZoneProps> = ({
  onFilesDrop,
  maxFiles = 10,
  maxFileSize = 50 * 1024 * 1024, // 50MB default
  acceptedFileTypes = ["image/*", "application/pdf"],
  isUploading = false,
  uploadProgress = 0,
  className = "",
  children,
  showFilePreviews = false,
}) => {
  const [isOver, setIsOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<FileInfo[]>([]);
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const { colorScheme } = useColorScheme();
  const dropZoneRef = useRef<View>(null);

  // 动画值
  const borderWidth = useSharedValue(1);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const errorShake = useSharedValue(0);
  const pulseValue = useSharedValue(1);
  const uploadProgressValue = useSharedValue(0);
  const isDraggedOver = useSharedValue(0);
  const rotateZ = useSharedValue("0deg");

  // 初始化动画效果
  useEffect(() => {
    // 创建呼吸效果
    pulseValue.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1, // 无限重复
      true // 反向
    );

    return () => {
      "worklet";
      cancelAnimation(pulseValue);
    };
  }, []);

  // 监听上传进度
  useEffect(() => {
    uploadProgressValue.value = withTiming(uploadProgress, {
      duration: 300,
      easing: Easing.out(Easing.cubic), // 修复: Easing.outCubic → Easing.out(Easing.cubic)
    });
  }, [uploadProgress]);

  // 处理文件选择和验证
  const validateAndProcessFiles = useCallback(
    async (files: any[]) => {
      try {
        setError(null);

        if (files.length + selectedFiles.length > maxFiles) {
          setError(`最多只能选择 ${maxFiles} 个文件`);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          triggerErrorAnimation();
          return [];
        }

        const validFiles: FileInfo[] = [];

        for (const file of files) {
          try {
            // 检查文件大小
            const fileInfo = await FileSystem.getInfoAsync(file.uri, {
              size: true,
            });
            if (!fileInfo.exists) {
              console.warn(`文件不存在: ${file.uri}`);
              continue;
            }

            if (fileInfo.size > maxFileSize) {
              setError(
                `文件 ${file.name} 超过最大限制 ${(
                  maxFileSize /
                  1024 /
                  1024
                ).toFixed(1)}MB`
              );
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              triggerErrorAnimation();
              continue;
            }

            // 检查文件类型
            if (acceptedFileTypes.length > 0) {
              const fileExt = file.name.split(".").pop()?.toLowerCase();
              const mimeType = file.type || `image/${fileExt}`;

              const isAccepted = acceptedFileTypes.some((type) => {
                if (type.includes("*")) {
                  // 处理通配符，例如 image/*
                  const prefix = type.split("/")[0];
                  return mimeType.startsWith(prefix);
                }
                return type === mimeType;
              });

              if (!isAccepted) {
                setError(`不支持的文件类型: ${file.name}`);
                Haptics.notificationAsync(
                  Haptics.NotificationFeedbackType.Error
                );
                triggerErrorAnimation();
                continue;
              }
            }

            const fileId = `file-${Date.now()}-${Math.random()
              .toString(36)
              .substring(2, 9)}`;

            // 添加有效文件
            const validFile = FileSchema.parse({
              uri: file.uri,
              name: file.name || `File_${Date.now()}`,
              type: file.type || "application/octet-stream",
              size: fileInfo.size,
              id: fileId,
            });

            validFiles.push(validFile);

            // 如果是图像文件，生成预览
            if (
              file.type?.startsWith("image/") ||
              /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name)
            ) {
              setPreviewUrls((prev) => ({ ...prev, [fileId]: file.uri }));
            }
          } catch (error) {
            console.error("处理文件时出错:", error);
          }
        }

        if (validFiles.length > 0) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setSelectedFiles((prev) => [...prev, ...validFiles]);
          scale.value = withSequence(
            withTiming(1.05, { duration: 200 }),
            withTiming(1, { duration: 200 })
          );
        }

        return validFiles;
      } catch (error) {
        console.error("文件验证错误:", error);
        setError("文件处理失败");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        triggerErrorAnimation();
        return [];
      }
    },
    [maxFiles, maxFileSize, acceptedFileTypes, selectedFiles]
  );

  // 动画样式
  const triggerErrorAnimation = useCallback(() => {
    errorShake.value = withSequence(
      withTiming(10, { duration: 100 }),
      withTiming(-10, { duration: 100 }),
      withTiming(8, { duration: 100 }),
      withTiming(-8, { duration: 100 }),
      withTiming(0, { duration: 100 })
    );
    rotateZ.value = withSequence(
      withTiming("2deg", { duration: 100 }),
      withTiming("-2deg", { duration: 100 }),
      withTiming("1deg", { duration: 100 }),
      withTiming("0deg", { duration: 100 })
    );
  }, []);

  // 处理文档选择
  const handleSelectFiles = async () => {
    try {
      // 触觉反馈提升用户体验
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      const result = await DocumentPicker.getDocumentAsync({
        type: acceptedFileTypes,
        copyToCacheDirectory: true,
        multiple: true,
      });

      if (result.canceled) return;

      const validFiles = await validateAndProcessFiles(result.assets);

      if (validFiles.length > 0) {
        onFilesDrop(validFiles);
      }
    } catch (error) {
      console.error("选择文件失败:", error);
      setError("选择文件失败");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  // 处理图像选择
  const handleSelectImages = async () => {
    try {
      // 触觉反馈提升用户体验
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        setError("需要相册访问权限");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        // 修复: 使用数组替代已弃用的 MediaTypeOptions
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        quality: 1,
        exif: false,
      });

      if (result.canceled) return;

      const assets = result.assets.map((asset) => ({
        uri: asset.uri,
        name: asset.fileName || `Image_${Date.now()}.jpg`,
        type: asset.mimeType || "image/jpeg",
        size: 0, // 先设为0，后面会通过FileSystem.getInfoAsync获取真实大小
      }));

      const validFiles = await validateAndProcessFiles(assets);

      if (validFiles.length > 0) {
        onFilesDrop(validFiles);
      }
    } catch (error) {
      console.error("选择图片失败:", error);
      setError("选择图片失败");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  // 处理移除文件
  const handleRemoveFile = (id: string) => {
    setSelectedFiles((prev) => prev.filter((file) => file.id !== id));

    // 移除预览
    setPreviewUrls((prev) => {
      const updated = { ...prev };
      delete updated[id];
      return updated;
    });

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  // 处理清空所有文件
  const handleClearAllFiles = () => {
    setSelectedFiles([]);
    setPreviewUrls({});

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  // 处理文件上传
  const handleUploadFiles = () => {
    if (selectedFiles.length > 0) {
      onFilesDrop(selectedFiles);

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  // 获取文件图标
  const getFileIcon = (fileName: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase();

    switch (ext) {
      case "jpg":
      case "jpeg":
      case "png":
      case "gif":
      case "webp":
        return <FileImage className="h-5 w-5 text-blue-500" />;
      case "pdf":
        return <File className="h-5 w-5 text-red-500" />;
      case "doc":
      case "docx":
        return <File className="h-5 w-5 text-blue-600" />;
      case "xls":
      case "xlsx":
        return <File className="h-5 w-5 text-green-600" />;
      case "ppt":
      case "pptx":
        return <File className="h-5 w-5 text-orange-500" />;
      default:
        return <File className="h-5 w-5 text-muted-foreground" />;
    }
  };

  // 拖拽动画样式
  const containerStyle = useAnimatedStyle(() => {
    return {
      borderWidth: withTiming(isOver ? 3 : borderWidth.value, {
        duration: 200,
      }),
      transform: [{ scale: scale.value }, { rotateZ: rotateZ.value }],
      opacity: opacity.value,
    };
  });

  const glowStyle = useAnimatedStyle(() => {
    return {
      opacity: withTiming(isDraggedOver.value, { duration: 300 }),
      transform: [{ scale: pulseValue.value }],
    };
  });

  const errorStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: errorShake.value }],
    };
  });

  // 卡片动画样式 - 修复：移除Web特有的鼠标事件
  const cardStyle = useAnimatedStyle(() => {
    return {
      backgroundColor:
        colorScheme === "dark"
          ? "rgba(64, 64, 64, 0.3)"
          : "rgba(245, 245, 245, 0.5)",
      borderColor:
        colorScheme === "dark"
          ? "rgba(100, 100, 100, 0.5)"
          : "rgba(200, 200, 200, 0.8)",
    };
  });

  // 拖拽按钮动画
  const dragIconStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateY: withRepeat(
            withSequence(
              withTiming(-5, {
                duration: 1000,
                easing: Easing.inOut(Easing.ease),
              }),
              withTiming(0, {
                duration: 1000,
                easing: Easing.inOut(Easing.ease),
              })
            ),
            -1,
            true
          ),
        },
      ],
    };
  });

  // 拖放状态变化效果
  useEffect(() => {
    if (isOver) {
      borderWidth.value = 3;
      isDraggedOver.value = withTiming(0.5, { duration: 300 });
      scale.value = withTiming(1.02, { duration: 300 });
    } else {
      borderWidth.value = 1;
      isDraggedOver.value = withTiming(0, { duration: 300 });
      scale.value = withTiming(1, { duration: 300 });
    }
  }, [isOver]);

  // 仅在Web环境中设置拖放事件处理
  useEffect(() => {
    if (Platform.OS === "web" && dropZoneRef.current) {
      const dropZoneElement = dropZoneRef.current as unknown as HTMLDivElement;

      // 拖放事件处理器
      const handleDragEnter = (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsOver(true);
      };

      const handleDragOver = (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isOver) setIsOver(true);
      };

      const handleDragLeave = (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsOver(false);
      };

      const handleDrop = async (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsOver(false);

        if (!e.dataTransfer?.files) return;

        const files = Array.from(e.dataTransfer.files).map((file) => ({
          uri: URL.createObjectURL(file),
          name: file.name,
          type: file.type,
          size: file.size,
        }));

        const validFiles = await validateAndProcessFiles(files);

        if (validFiles.length > 0) {
          onFilesDrop(validFiles);
        }
      };

      // 添加事件监听器
      dropZoneElement.addEventListener("dragenter", handleDragEnter);
      dropZoneElement.addEventListener("dragover", handleDragOver);
      dropZoneElement.addEventListener("dragleave", handleDragLeave);
      dropZoneElement.addEventListener("drop", handleDrop);

      // 清理事件监听器
      return () => {
        dropZoneElement.removeEventListener("dragenter", handleDragEnter);
        dropZoneElement.removeEventListener("dragover", handleDragOver);
        dropZoneElement.removeEventListener("dragleave", handleDragLeave);
        dropZoneElement.removeEventListener("drop", handleDrop);
      };
    }
  }, [validateAndProcessFiles, isOver, onFilesDrop]);

  // 创建PanResponder来模拟原生平台上的"拖放"体验
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        if (Platform.OS !== "web") {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      },
      onPanResponderMove: (evt: GestureResponderEvent) => {
        const { locationX, locationY } = evt.nativeEvent;
        const { width, height } = Dimensions.get("window");

        // 检查是否在拖放区域内
        if (
          locationX > 0 &&
          locationX < width &&
          locationY > 0 &&
          locationY < height
        ) {
          if (!isOver) {
            setIsOver(true);
            if (Platform.OS !== "web") {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }
          }
        } else {
          if (isOver) {
            setIsOver(false);
          }
        }
      },
      onPanResponderRelease: () => {
        setIsOver(false);
      },
      onPanResponderTerminate: () => {
        setIsOver(false);
      },
    })
  ).current;

  // 渲染上传中状态
  const renderUploading = () => (
    <Animated.View
      entering={FadeIn.duration(300).springify()}
      className="absolute inset-0 bg-background/80 backdrop-blur-sm items-center justify-center z-10"
    >
      <View className="items-center space-y-6">
        <Animated.View
          entering={ZoomIn.duration(300).springify()}
          className="rounded-full bg-primary/10 p-6"
        >
          <Animated.View
            className="rounded-full"
            style={{
              transform: [
                {
                  rotate: withRepeat(
                    withTiming("360deg", { duration: 2000 }),
                    -1,
                    false
                  ),
                },
              ],
            }}
          >
            <UploadCloud size={48} className="text-primary" />
          </Animated.View>
        </Animated.View>
        <Text className="text-xl font-medium">正在上传文件</Text>
        <View className="w-72 space-y-2">
          <Progress value={uploadProgress} className="h-2 w-full" />
          <View className="flex-row items-center justify-between">
            <Badge variant="outline">{uploadProgress.toFixed(0)}%</Badge>
            <Text className="text-sm text-muted-foreground">
              {uploadProgress < 100 ? "上传中..." : "处理中..."}
            </Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );

  // 渲染错误状态
  const renderError = () => (
    <Animated.View
      style={errorStyle}
      entering={SlideInDown.springify()}
      className="mt-4 overflow-hidden"
    >
      <Alert variant="destructive" icon={AlertCircle}>
        <AlertTitle>上传错误</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    </Animated.View>
  );

  // 渲染已选择的文件列表
  const renderSelectedFiles = () => {
    if (selectedFiles.length === 0) return null;

    return (
      <Animated.View
        entering={SlideInDown.springify()}
        // 修复: 使用 LinearTransition 代替已弃用的 Layout
        layout={LinearTransition.springify()}
        className="mt-4 space-y-2"
      >
        <View className="flex-row items-center justify-between">
          <Text className="text-base font-medium">
            已选择的文件 ({selectedFiles.length})
          </Text>
          <Button
            variant="ghost"
            size="sm"
            onPress={handleClearAllFiles}
            disabled={isUploading}
            className="h-8"
          >
            <X className="h-4 w-4 mr-1" />
            <Text className="text-xs">清空</Text>
          </Button>
        </View>

        <AnimatedCard
          className="p-3 bg-card/50 border border-transparent"
          style={cardStyle}
        >
          {selectedFiles.map((file, index) => (
            <Animated.View
              key={file.id}
              entering={FadeIn.delay(index * 50).duration(200)}
              exiting={FadeOut.duration(100)}
              // 修复: 使用 LinearTransition 代替已弃用的 Layout
              layout={LinearTransition.springify()}
              className={`flex-row items-center justify-between ${
                index > 0 ? "mt-2 pt-2 border-t border-border/30" : ""
              }`}
            >
              <View className="flex-row items-center flex-1 mr-2">
                <View className="mr-3 p-1.5 bg-muted rounded-md">
                  {getFileIcon(file.name)}
                </View>
                <View className="flex-1">
                  <Text numberOfLines={1} className="text-sm font-medium">
                    {file.name}
                  </Text>
                  <Text className="text-xs text-muted-foreground">
                    {formatFileSize(file.size)}
                  </Text>
                </View>
              </View>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full opacity-70 hover:opacity-100"
                onPress={() => handleRemoveFile(file.id)}
                disabled={isUploading}
                accessibilityLabel={`移除文件 ${file.name}`}
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </Button>
            </Animated.View>
          ))}

          {/* 文件预览缩略图 */}
          {showFilePreviews && Object.keys(previewUrls).length > 0 && (
            <View className="flex-row flex-wrap mt-3 pt-2 border-t border-border/30">
              {Object.entries(previewUrls).map(([id, url], index) => (
                <Animated.View
                  key={id}
                  entering={ZoomIn.delay(index * 50).duration(300)}
                  className="m-1"
                >
                  <Animated.Image
                    source={{ uri: url }}
                    className="w-14 h-14 rounded-md"
                    style={{
                      borderWidth: 1,
                      borderColor:
                        colorScheme === "dark"
                          ? "rgba(80, 80, 80, 0.3)"
                          : "rgba(200, 200, 200, 0.5)",
                    }}
                  />
                </Animated.View>
              ))}
            </View>
          )}

          {/* 上传按钮 */}
          {selectedFiles.length > 0 && !isUploading && (
            <Animated.View
              entering={BounceIn.delay(200)}
              className="mt-3 pt-2 border-t border-border/30"
            >
              <Button
                onPress={handleUploadFiles}
                className="w-full"
                disabled={isUploading}
              >
                <ArrowUpFromLine className="mr-2 h-4 w-4" />
                <Text>上传 {selectedFiles.length} 个文件</Text>
              </Button>
            </Animated.View>
          )}
        </AnimatedCard>
      </Animated.View>
    );
  };

  // 渲染移动端的文件选择按钮
  const renderMobileActions = () => (
    <View className="space-y-3">
      <Button
        onPress={handleSelectImages}
        disabled={isUploading}
        className="w-full h-12"
        variant="outline"
      >
        <ImageIcon size={20} className="mr-2 text-blue-500" />
        <Text>从相册选择图片</Text>
      </Button>

      <Button
        onPress={handleSelectFiles}
        disabled={isUploading}
        className="w-full h-12"
        variant="outline"
      >
        <File size={20} className="mr-2 text-primary" />
        <Text>选择文档文件</Text>
      </Button>
    </View>
  );

  // 渲染文件类型徽章
  const renderFileTypeBadges = () => {
    // 处理文件类型显示
    const displayTypes = acceptedFileTypes.map((type) => {
      if (type === "image/*") return "图片";
      if (type === "application/pdf") return "PDF";
      if (type === "text/*") return "文本";
      if (type === "video/*") return "视频";
      if (type === "audio/*") return "音频";
      return type.replace("*", "所有").replace("application/", "");
    });

    return (
      <View className="flex-row flex-wrap justify-center gap-2 mt-2">
        {displayTypes.map((type, index) => (
          <Badge key={index} variant="outline" className="text-xs">
            {type}
          </Badge>
        ))}
      </View>
    );
  };

  return (
    <View>
      <Animated.View
        ref={dropZoneRef}
        style={[containerStyle]}
        className={`relative overflow-hidden rounded-xl border-dashed border-border bg-muted/30 ${className}`}
        {...(Platform.OS === "web" ? {} : panResponder.panHandlers)}
      >
        {isUploading && renderUploading()}

        <Animated.View
          style={glowStyle}
          className="absolute inset-0 bg-primary/20 rounded-lg"
          pointerEvents="none"
        />

        <View className="p-6 items-center justify-center space-y-4">
          <Animated.View
            entering={SlideInDown.springify()}
            style={dragIconStyle}
            className="rounded-full bg-muted p-4"
          >
            <Upload size={28} className="text-primary" />
          </Animated.View>

          <View className="space-y-1 text-center">
            <Text className="text-lg font-medium">上传文件</Text>
            <Text className="text-sm text-muted-foreground text-center">
              {Platform.OS === "web"
                ? "拖放文件到此处，或点击按钮选择文件"
                : "点击按钮选择要上传的文件"}
            </Text>

            {renderFileTypeBadges()}
          </View>

          <View className="w-full space-y-2">{renderMobileActions()}</View>
        </View>
      </Animated.View>

      {error && renderError()}

      {renderSelectedFiles()}

      {children}
    </View>
  );
};

// 辅助函数 - 修复: 更新类型定义，使用非弃用的 SharedValue
const cancelAnimation = (value: any) => {
  "worklet";
  value.value = withTiming(value.value);
};

export default DragDropZone;
