import React, { memo, useState, useCallback } from "react";
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
} from "lucide-react-native";
import { View, Image, TouchableOpacity, Dimensions } from "react-native";
import Animated, {
  FadeIn,
  FadeInRight,
  Layout,
  useAnimatedStyle,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { FileItem as FileItemType } from "~/stores/useImageStore";
import { useColorScheme } from "nativewind";
import { Card } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Text } from "~/components/ui/text";
import { Badge } from "~/components/ui/badge";

interface FileItemProps {
  file: FileItemType;
  index: number;
  isLandscape: boolean;
  isSelected?: boolean;
  onFileAction: (file: FileItemType, action: string) => void;
  onLongPress?: () => void;
  onPress?: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ITEM_SIZE = SCREEN_WIDTH * 0.28;

export const FileItem = memo(({
  file,
  index,
  isLandscape,
  isSelected,
  onFileAction,
  onLongPress,
  onPress,
}: FileItemProps) => {
  const [thumbnailError, setThumbnailError] = useState(false);
  const { colorScheme } = useColorScheme();
  const [showActions, setShowActions] = useState(false);

  // 动画值
  const scale = useAnimatedStyle(() => ({
    transform: [
      {
        scale: withSequence(
          withSpring(isSelected ? 0.95 : 1, { damping: 15 }),
          withSpring(1, { damping: 10 })
        ),
      },
    ],
  }));

  const getFileIcon = useCallback((file: FileItemType) => {
    if (file.isDirectory) return <Folder className="h-8 w-8 text-primary" />;
    const ext = file.name.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "jpg":
      case "jpeg":
      case "png":
      case "gif":
        return <ImageIcon className="h-8 w-8 text-blue-500" />;
      case "mp3":
      case "wav":
        return <Music className="h-8 w-8 text-green-500" />;
      case "mp4":
      case "mov":
        return <Video className="h-8 w-8 text-purple-500" />;
      default:
        return <File className="h-8 w-8 text-muted-foreground" />;
    }
  }, []);

  const renderThumbnail = useCallback(() => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    const isImage = ["jpg", "jpeg", "png", "gif"].includes(ext || "");

    if (isImage && !thumbnailError && file.uri) {
      return (
        <Image
          source={{ uri: file.uri }}
          className="w-full h-full rounded-xl"
          style={{ width: ITEM_SIZE, height: ITEM_SIZE }}
          onError={() => setThumbnailError(true)}
        />
      );
    }

    return (
      <View 
        className="w-full h-full items-center justify-center bg-muted/10 rounded-xl"
        style={{ width: ITEM_SIZE, height: ITEM_SIZE }}
      >
        {getFileIcon(file)}
      </View>
    );
  }, [file, thumbnailError, getFileIcon]);

  const fileActions = [
    { icon: Eye, action: "preview", label: "预览" },
    { icon: Share2, action: "share", label: "分享" },
    { icon: Edit2, action: "rename", label: "重命名" },
    { icon: Download, action: "download", label: "下载" },
    { icon: Star, action: "star", label: "收藏" },
    { icon: Info, action: "info", label: "详情" },
    { icon: Lock, action: "lock", label: "加密" },
    { icon: Trash, action: "delete", label: "删除" },
  ];

  const handlePress = () => {
    onPress?.();
    if (!showActions) {
      setShowActions(true);
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      onLongPress={onLongPress}
      delayLongPress={300}
      activeOpacity={0.7}
    >
      <Animated.View
        entering={FadeInRight.delay(index * 50).springify()}
        layout={Layout.springify()}
        style={scale}
        className="m-1"
      >
        <Card
          className={`
            overflow-hidden bg-background/95 backdrop-blur
            ${isSelected ? "border-primary border-2" : "border border-border/50"}
            ${isLandscape ? "p-2" : "p-3"}
          `}
        >
          <View className="space-y-3">
            {renderThumbnail()}
            
            <View className="space-y-1">
              <Text
                numberOfLines={1}
                className={`font-medium ${isLandscape ? "text-sm" : "text-base"}`}
              >
                {file.name}
              </Text>
              
              <View className="flex-row items-center space-x-2">
                <Badge
                  variant="secondary"
                  className="rounded-full px-2 py-0"
                >
                  <Clock className="h-3 w-3 mr-1" />
                  <Text className="text-xs">
                    {new Date(file.modificationTime || 0).toLocaleDateString()}
                  </Text>
                </Badge>
              </View>
            </View>

            {showActions && (
              <Animated.View
                entering={FadeIn.duration(200)}
                className="flex-row flex-wrap gap-1 mt-2"
              >
                {fileActions.map(({ icon: Icon, action, label }) => (
                  <Button
                    key={action}
                    variant="ghost"
                    size="sm"
                    className="flex-1 h-8 min-w-[80px] rounded-lg"
                    onPress={() => {
                      onFileAction(file, action);
                      setShowActions(false);
                    }}
                  >
                    <Icon className="h-4 w-4 mr-1" />
                    <Text className="text-xs">{label}</Text>
                  </Button>
                ))}
              </Animated.View>
            )}
          </View>
        </Card>
      </Animated.View>
    </TouchableOpacity>
  );
});

FileItem.displayName = "FileItem";

export default FileItem;
