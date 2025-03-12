import React, { useState, useCallback, useRef } from "react";
import { View, Dimensions, ScrollView } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
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
} from "lucide-react-native";
import Animated, {
  FadeIn,
  SlideInRight,
  Layout,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from "react-native-reanimated";
import { z } from "zod";
import { Button } from "~/components/ui/button";
import { Progress } from "~/components/ui/progress";
import { Text } from "~/components/ui/text";
import { Card } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";

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
}

interface UploadProgressProps {
  progress: number;
  fileName: string;
}

interface ImageUploaderProps {
  uploadUrl: string;
  maxFiles?: number;
  acceptedTypes?: string[];
  maxFileSize?: number; // 以字节为单位
  onUploadComplete?: (files: ImageFile[]) => void;
}

// Validation Schema
const ImageFileSchema = z.object({
  uri: z.string(),
  name: z.string(),
  type: z.string(),
  size: z.number(),
  metadata: z.object({
    width: z.number().optional(),
    height: z.number().optional(),
    exposure: z.string().optional(),
    iso: z.number().optional(),
    focalLength: z.number().optional(),
    timestamp: z.string().optional(),
  }).optional(),
  id: z.string(),
});

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const ITEM_WIDTH = (SCREEN_WIDTH - 48) / 2;

// 预览组件
const ImagePreview = React.memo(({ item, onRemove, onInfoPress }: ImagePreviewProps) => {
  const scale = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(1, { damping: 15 }) }],
  }));

  return (
    <Animated.View
      entering={SlideInRight.springify()}
      layout={Layout.springify()}
      style={scale}
      className="relative m-2"
    >
      <Card className="overflow-hidden bg-background/95 backdrop-blur border-border/50">
        <Animated.Image
          source={{ uri: item.uri }}
          style={{ width: ITEM_WIDTH, height: ITEM_WIDTH }}
          className="rounded-t-lg"
        />
        <View className="absolute top-2 right-2 flex-row space-x-2">
          <Button
            variant="secondary"
            size="icon"
            className="h-8 w-8 rounded-full bg-background/80"
            onPress={() => onInfoPress(item)}
          >
            <Info className="h-4 w-4" />
          </Button>
          <Button
            variant="destructive"
            size="icon"
            className="h-8 w-8 rounded-full bg-background/80"
            onPress={() => onRemove(item.id)}
          >
            <X className="h-4 w-4" />
          </Button>
        </View>
        <View className="p-2 space-y-1">
          <Text numberOfLines={1} className="text-sm font-medium">
            {item.name}
          </Text>
          <Badge variant="secondary" className="w-fit">
            {(item.size / 1024 / 1024).toFixed(2)} MB
          </Badge>
        </View>
      </Card>
    </Animated.View>
  );
});

// 上传进度组件
const UploadProgress = React.memo(({ progress, fileName }: UploadProgressProps) => {
  const progressAnim = useAnimatedStyle(() => ({
    opacity: withSpring(progress > 0 ? 1 : 0),
    transform: [
      {
        translateY: withSpring(progress > 0 ? 0 : 20),
      },
    ],
  }));

  return (
    <Animated.View style={progressAnim} className="space-y-2 py-4 px-4">
      <View className="flex-row items-center justify-between">
        <Text className="text-sm text-muted-foreground" numberOfLines={1}>
          正在上传: {fileName}
        </Text>
        <Text className="text-sm font-medium">{progress}%</Text>
      </View>
      <Progress value={progress} className="h-2" />
    </Animated.View>
  );
});

// 主组件
const ImageUploader: React.FC<ImageUploaderProps> = ({
  uploadUrl,
  maxFiles = 10,
  acceptedTypes = ["image/jpeg", "image/png"],
  maxFileSize = 50 * 1024 * 1024, // 默认50MB
  onUploadComplete,
}) => {
  const [selectedImages, setSelectedImages] = useState<ImageFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [currentUpload, setCurrentUpload] = useState<{
    fileName: string;
    progress: number;
  } | null>(null);

  const handleImageSelect = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        toast.error("需要访问相册权限", {
          description: "请在设置中允许访问相册",
          icon: <AlertCircle className="h-5 w-5" />,
        });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 1, // 保持原始质量
        exif: true,
      });

      if (!result.canceled && result.assets) {
        const newImages = await Promise.all(
          result.assets.map(async (asset) => {
            const fileInfo = await FileSystem.getInfoAsync(asset.uri, { size: true });
            
            if (!fileInfo.exists) {
              throw new Error(`无法访问文件: ${asset.fileName}`);
            }

            if (fileInfo.size > maxFileSize) {
              throw new Error(`文件 ${asset.fileName} 超过最大限制 ${maxFileSize / 1024 / 1024}MB`);
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
              id: `img-${Date.now()}-${Math.random()}`,
            });
          })
        );

        if (selectedImages.length + newImages.length > maxFiles) {
          toast.error("超出最大文件数限制", {
            description: `最多只能选择 ${maxFiles} 个文件`,
            icon: <AlertCircle className="h-5 w-5" />,
          });
          return;
        }

        setSelectedImages((prev) => [...prev, ...newImages]);
        toast.success(`已添加 ${newImages.length} 个文件`, {
          icon: <CheckCircle2 className="h-5 w-5" />,
        });
      }
    } catch (error: unknown) {
      toast.error("选择文件失败", {
        description: error instanceof Error ? error.message : "未知错误",
        icon: <AlertCircle className="h-5 w-5" />,
      });
    }
  }, [selectedImages.length, maxFiles, maxFileSize]);

  const handleUpload = useCallback(async () => {
    if (selectedImages.length === 0) return;

    setUploading(true);
    try {
      for (const image of selectedImages) {
        setCurrentUpload({ fileName: image.name, progress: 0 });

        const uploadTask = FileSystem.createUploadTask(
          uploadUrl,
          image.uri,
          {
            uploadType: FileSystem.FileSystemUploadType.MULTIPART,
            fieldName: "file",
            parameters: {
              metadata: JSON.stringify(image.metadata),
            },
          },
          (progress) => {
            const percentage = Math.round(
              (progress.totalBytesSent / progress.totalBytesExpectedToSend) * 100
            );
            setCurrentUpload((prev) =>
              prev ? { ...prev, progress: percentage } : null
            );
          }
        );

        await uploadTask.uploadAsync();
      }

      toast.success("上传完成", {
        description: `已成功上传 ${selectedImages.length} 个文件`,
        icon: <CheckCircle2 className="h-5 w-5" />,
      });

      onUploadComplete?.(selectedImages);
      setSelectedImages([]);
    } catch (error: unknown) {
      toast.error("上传失败", {
        description: error instanceof Error ? error.message : "未知错误",
        icon: <AlertCircle className="h-5 w-5" />,
      });
    } finally {
      setUploading(false);
      setCurrentUpload(null);
    }
  }, [selectedImages, uploadUrl, onUploadComplete]);

  const handleImageInfo = useCallback((image: ImageFile) => {
    // TODO: 显示图片详细信息的模态框
    console.log('Image Info:', image);
  }, []);

  return (
    <View className="flex-1">
      <ScrollView className="flex-1">
        <View className="p-4 space-y-4">
          <Button
            variant={selectedImages.length ? "outline" : "default"}
            onPress={handleImageSelect}
            disabled={uploading}
            className="w-full h-14 rounded-2xl"
          >
            <Camera className="h-5 w-5 mr-2" />
            <Text className="text-base font-medium">
              {selectedImages.length ? "添加更多图片" : "从相册选择"}
            </Text>
          </Button>

          {selectedImages.length > 0 && (
            <Animated.View
              entering={FadeIn.duration(300)}
              className="space-y-4"
            >
              <View className="flex-row flex-wrap -m-2">
                {selectedImages.map((img) => (
                  <ImagePreview
                    key={img.id}
                    item={img}
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
                />
              ) : (
                <View className="flex-row space-x-3">
                  <Button
                    className="flex-1 h-14 rounded-2xl"
                    onPress={handleUpload}
                    disabled={uploading}
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
                  </Button>
                  <Button
                    variant="destructive"
                    className="w-14 h-14 rounded-2xl"
                    onPress={() => setSelectedImages([])}
                    disabled={uploading}
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </View>
              )}
            </Animated.View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

export default React.memo(ImageUploader);
