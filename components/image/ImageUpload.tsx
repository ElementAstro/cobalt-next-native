import React, { useState, useCallback } from "react";
import { View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";
import { toast } from "sonner-native";
import {
  X,
  Camera,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Upload,
} from "lucide-react-native";
import Animated, {
  FadeIn,
  SlideInRight,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Text } from "@/components/ui/text";

// 类型定义
interface ImageFile {
  uri: string;
  name: string;
  type: string;
  id: string;
}

interface ImagePreviewProps {
  item: ImageFile;
  onRemove: (id: string) => void;
}

interface UploadProgressProps {
  progress: number;
}

interface ImageUploaderProps {
  uploadUrl: string;
}

// Validation Schemas
const ImageFileSchema = z.object({
  uri: z.string().url(),
  name: z.string(),
  type: z.string(),
  id: z.string(),
});

// Components
const ImagePreview = React.memo(({ item, onRemove }: ImagePreviewProps) => {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(1) }],
  }));

  return (
    <Animated.View
      entering={SlideInRight}
      style={animatedStyle}
      className="relative m-1"
    >
      <Animated.Image
        source={{ uri: item.uri }}
        className="w-24 h-24 rounded-lg"
      />
      <Button
        variant="destructive"
        size="icon"
        className="absolute -top-2 -right-2"
        onPress={() => onRemove(item.id)}
      >
        <X size={16} />
      </Button>
    </Animated.View>
  );
});

const UploadProgress = React.memo(({ progress }: UploadProgressProps) => (
  <View className="space-y-2">
    <Progress value={progress} />
    <Text className="text-sm text-muted-foreground text-center">
      {progress}% 已完成
    </Text>
  </View>
));

const ImageUploader = ({ uploadUrl }: ImageUploaderProps) => {
  const [selectedImages, setSelectedImages] = useState<ImageFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleImageSelect = useCallback(async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        toast.error("需要权限", {
          description: "请允许访问相册权限",
          icon: <AlertCircle size={20} />,
        });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        quality: 0.7,
        allowsEditing: true,
      });

      if (!result.canceled) {
        const newImages = await Promise.all(
          result.assets.map(async (asset) => {
            const compressed = await ImageManipulator.manipulateAsync(
              asset.uri,
              [{ resize: { width: 1024 } }],
              { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
            );

            return ImageFileSchema.parse({
              uri: compressed.uri,
              name: `image-${Date.now()}.jpg`,
              type: "image/jpeg",
              id: `img-${Date.now()}-${Math.random()}`,
            });
          })
        );

        setSelectedImages((prev) => [...prev, ...newImages]);
        toast.success("已添加图片", {
          icon: <CheckCircle2 size={20} />,
        });
      }
    } catch (error: unknown) {
      toast.error("选择失败", {
        description: error instanceof Error ? error.message : "未知错误",
        icon: <AlertCircle size={20} />,
      });
    }
  }, []);

  const removeImage = useCallback((id: string) => {
    setSelectedImages((prev) => prev.filter((img) => img.id !== id));
  }, []);

  const handleUpload = useCallback(async () => {
    if (selectedImages.length === 0) return;

    setUploading(true);
    try {
      await Promise.all(
        selectedImages.map(async (image) => {
          const formData = new FormData();
          formData.append("file", {
            uri: image.uri,
            type: image.type,
            name: image.name,
          } as any);

          const uploadTask = FileSystem.createUploadTask(
            uploadUrl,
            image.uri,
            {
              uploadType: FileSystem.FileSystemUploadType.MULTIPART,
              fieldName: "file",
            },
            (progress) => {
              setProgress(
                Math.round(
                  (progress.totalBytesSent /
                    progress.totalBytesExpectedToSend) *
                    100
                )
              );
            }
          );

          await uploadTask.uploadAsync();
        })
      );

      toast.success("上传成功");
      setSelectedImages([]);
    } catch (error: unknown) {
      toast.error("上传失败", {
        description: error instanceof Error ? error.message : "未知错误",
      });
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }, [selectedImages, uploadUrl]);

  return (
    <Animated.View entering={FadeIn} className="flex-1 p-4">
      <View className="space-y-4">
        <Button
          variant={selectedImages.length ? "outline" : "default"}
          onPress={handleImageSelect}
          disabled={uploading}
          className="w-full"
        >
          <Camera size={20} className="mr-2" />
          <Text>{selectedImages.length ? "添加更多" : "选择图片"}</Text>
        </Button>

        {selectedImages.length > 0 && (
          <>
            <View className="flex-row flex-wrap">
              {selectedImages.map((img) => (
                <ImagePreview key={img.id} item={img} onRemove={removeImage} />
              ))}
            </View>

            {uploading ? (
              <UploadProgress progress={progress} />
            ) : (
              <View className="flex-row space-x-2">
                <Button
                  className="flex-1"
                  onPress={handleUpload}
                  disabled={uploading}
                >
                  <Upload size={20} className="mr-2" />
                  <Text>上传图片</Text>
                </Button>
                <Button
                  variant="destructive"
                  onPress={() => setSelectedImages([])}
                >
                  <Trash2 size={20} />
                </Button>
              </View>
            )}
          </>
        )}
      </View>
    </Animated.View>
  );
};

export default ImageUploader;
