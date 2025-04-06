import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Platform,
  PanResponder,
  GestureResponderEvent,
  Dimensions,
  ActivityIndicator,
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
  withSpring,
  withRepeat,
  withSequence,
  Easing,
  FadeIn,
  FadeOut,
  SlideInDown,
  ZoomIn,
} from "react-native-reanimated";
import {
  Upload,
  FileUp,
  Image as ImageIcon,
  File,
  X,
  AlertCircle,
  CheckCircle,
  CloudOff,
  UploadCloud,
} from "lucide-react-native";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
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
}

interface FileInfo {
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

const DragDropZone: React.FC<DragDropZoneProps> = ({
  onFilesDrop,
  maxFiles = 10,
  maxFileSize = 50 * 1024 * 1024, // 50MB default
  acceptedFileTypes = ["image/*", "application/pdf"],
  isUploading = false,
  uploadProgress = 0,
  className = "",
  children,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isOver, setIsOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragSupported, setIsDragSupported] = useState(Platform.OS === "web");
  const [selectedFilesCount, setSelectedFilesCount] = useState(0);
  const { colorScheme } = useColorScheme();

  // 动画值
  const borderWidth = useSharedValue(1);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const glowOpacity = useSharedValue(0);
  const errorShake = useSharedValue(0);

  // 处理文件选择和验证
  const validateAndProcessFiles = useCallback(
    async (files: any[]) => {
      try {
        setError(null);

        if (files.length > maxFiles) {
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
              console.warn(`File does not exist: ${file.uri}`);
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

            // 添加有效文件
            validFiles.push(
              FileSchema.parse({
                uri: file.uri,
                name: file.name || `File_${Date.now()}`,
                type: file.type || "application/octet-stream",
                size: fileInfo.size,
                id: `file-${Date.now()}-${Math.random()
                  .toString(36)
                  .substring(2, 9)}`,
              })
            );
          } catch (error) {
            console.error("Error processing file:", error);
          }
        }

        if (validFiles.length > 0) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setSelectedFilesCount((prev) => prev + validFiles.length);
          scale.value = withSequence(
            withTiming(1.05, { duration: 200 }),
            withTiming(1, { duration: 200 })
          );
        }

        return validFiles;
      } catch (error) {
        console.error("File validation error:", error);
        setError("文件处理失败");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        triggerErrorAnimation();
        return [];
      }
    },
    [maxFiles, maxFileSize, acceptedFileTypes]
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
  }, []);

  // 处理文档选择
  const handleSelectFiles = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

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
      console.error("Error selecting files:", error);
      setError("选择文件失败");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  // 处理图像选择
  const handleSelectImages = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        setError("需要相册访问权限");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
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
      console.error("Error selecting images:", error);
      setError("选择图片失败");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  // 拖拽动画样式
  const containerStyle = useAnimatedStyle(() => {
    return {
      borderWidth: withTiming(isOver ? 3 : 1, { duration: 200 }),
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    };
  });

  const glowStyle = useAnimatedStyle(() => {
    return {
      opacity: glowOpacity.value,
    };
  });

  const errorStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: errorShake.value }],
    };
  });

  // 进度条动画
  const progressStyle = useAnimatedStyle(() => {
    return {
      width: `${uploadProgress}%`,
      opacity: isUploading ? withTiming(1) : withTiming(0),
    };
  });

  // 拖放状态变化效果
  useEffect(() => {
    if (isOver) {
      borderWidth.value = withTiming(3, { duration: 200 });
      glowOpacity.value = withTiming(0.5, { duration: 300 });
      scale.value = withTiming(1.02, { duration: 300 });
    } else {
      borderWidth.value = withTiming(1, { duration: 200 });
      glowOpacity.value = withTiming(0, { duration: 300 });
      scale.value = withTiming(1, { duration: 300 });
    }
  }, [isOver]);

  // 仅在Web环境中设置拖放事件处理
  useEffect(() => {
    if (Platform.OS === "web") {
      // Web平台的拖放事件处理代码
      setIsDragSupported(true);
    }
  }, []);

  // 创建PanResponder来模拟原生平台上的"拖放"体验
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        setIsDragging(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }
        } else {
          if (isOver) {
            setIsOver(false);
          }
        }
      },
      onPanResponderRelease: () => {
        setIsDragging(false);
        setIsOver(false);
      },
      onPanResponderTerminate: () => {
        setIsDragging(false);
        setIsOver(false);
      },
    })
  ).current;

  // 渲染上传中状态
  const renderUploading = () => (
    <Animated.View
      entering={FadeIn.duration(300)}
      className="absolute inset-0 bg-background/80 backdrop-blur-sm items-center justify-center z-10"
    >
      <View className="items-center space-y-4">
        <Animated.View
          entering={ZoomIn.duration(300)}
          className="rounded-full bg-primary/10 p-4"
        >
          <UploadCloud size={40} className="text-primary" />
        </Animated.View>
        <Text className="text-lg font-medium">正在上传文件...</Text>
        <View className="w-64 h-2 bg-muted overflow-hidden rounded-full">
          <Animated.View
            style={progressStyle}
            className="h-full bg-primary rounded-full"
          />
        </View>
        <Text className="text-sm text-muted-foreground">
          {uploadProgress.toFixed(0)}% 完成
        </Text>
      </View>
    </Animated.View>
  );

  // 渲染错误状态
  const renderError = () => (
    <Animated.View
      style={errorStyle}
      className="mt-2 p-2 bg-destructive/10 rounded-md"
    >
      <View className="flex-row items-center space-x-2">
        <AlertCircle size={16} className="text-destructive" />
        <Text className="text-sm text-destructive">{error}</Text>
      </View>
    </Animated.View>
  );

  // 渲染Web专属拖放区域
  const renderWebDragZone = () => {
    if (Platform.OS !== "web") return null;

    return <View>{/* 实现Web上的拖放区域 */}</View>;
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
        <ImageIcon size={20} className="mr-2" />
        <Text>从相册选择图片</Text>
      </Button>

      <Button
        onPress={handleSelectFiles}
        disabled={isUploading}
        className="w-full h-12"
        variant="outline"
      >
        <File size={20} className="mr-2" />
        <Text>选择文档文件</Text>
      </Button>
    </View>
  );

  return (
    <Animated.View
      style={[containerStyle]}
      className={`relative overflow-hidden rounded-lg border-dashed border-border bg-muted/30 ${className}`}
      {...(Platform.OS === "web" ? {} : panResponder.panHandlers)}
    >
      {isUploading && renderUploading()}

      <Animated.View
        style={glowStyle}
        className="absolute inset-0 bg-primary/10 rounded-lg"
        pointerEvents="none"
      />

      <View className="p-6 items-center justify-center space-y-4">
        <Animated.View
          entering={SlideInDown.springify()}
          className="rounded-full bg-muted p-4"
        >
          <Upload size={28} className="text-primary" />
        </Animated.View>

        <View className="space-y-1 text-center">
          <Text className="text-lg font-medium">拖放文件上传</Text>
          <Text className="text-sm text-muted-foreground text-center">
            拖放文件到此处，或点击按钮选择文件
          </Text>

          <View className="flex-row flex-wrap justify-center gap-2 mt-2">
            {acceptedFileTypes.map((type, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {type.replace("*", "所有")}
              </Badge>
            ))}
          </View>
        </View>

        <View className="w-full space-y-2">
          {renderMobileActions()}

          {Platform.OS === "web" && renderWebDragZone()}

          {selectedFilesCount > 0 && (
            <Animated.View
              entering={FadeIn.duration(300)}
              className="flex-row items-center justify-center mt-2"
            >
              <CheckCircle size={16} className="text-primary mr-2" />
              <Text className="text-sm">
                已选择 {selectedFilesCount} 个文件
              </Text>
            </Animated.View>
          )}
        </View>
      </View>

      {error && renderError()}

      {children}
    </Animated.View>
  );
};

export default DragDropZone;
