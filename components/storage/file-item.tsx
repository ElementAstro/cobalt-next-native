import React, { memo, useState } from "react";
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
  Archive,
  Download,
  Eye,
} from "lucide-react-native";
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  runOnJS,
} from "react-native-reanimated";
import { View, ScrollView, Image, Pressable } from "react-native";
import { Card, CardFooter, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import { Text } from "~/components/ui/text";
import { Checkbox } from "~/components/ui/checkbox";
import { fileStoreHooks } from "../../stores/useFileStore";
import { useColorScheme } from "nativewind";
import { FileItemType } from "./types";

interface FileItemProps {
  file: FileItemType;
  index: number;
  isLandscape: boolean;
  onFileAction: (file: FileItemType, action: string) => void;
  onLongPress?: () => void;
}

const FileItem: React.FC<FileItemProps> = memo(
  ({ file, index, isLandscape, onFileAction, onLongPress }) => {
    const [thumbnailError, setThumbnailError] = useState(false);
    const {
      useSelectedMode,
      useSelectedFiles,
      useSetSelectedFiles,
      useSetSelectedMode
    } = fileStoreHooks;
    
    const selectedMode = useSelectedMode();
    const selectedFiles = useSelectedFiles();
    const setSelectedFiles = useSetSelectedFiles();
    const setSelectedMode = useSetSelectedMode();
    const isSelected = selectedFiles.includes(file.uri);
    const { colorScheme } = useColorScheme();

    // 动画值
    const scale = useSharedValue(1);
    const opacity = useSharedValue(1);

    // 动画样式
    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    }));

    const toggleSelection = () => {
      if (isSelected) {
        setSelectedFiles(
          selectedFiles.filter((uri: string) => uri !== file.uri)
        );
      } else {
        setSelectedFiles([...selectedFiles, file.uri]);
      }
    };

    const handlePress = () => {
      scale.value = withSequence(
        withSpring(0.95, { damping: 10, stiffness: 100 }),
        withSpring(1, { damping: 10, stiffness: 100 })
      );

      if (selectedMode) {
        runOnJS(toggleSelection)();
      } else {
        runOnJS(onFileAction)(file, "open");
      }
    };

    const handleLongPress = () => {
      scale.value = withSequence(
        withSpring(1.05, { damping: 5 }),
        withSpring(1, { damping: 10 })
      );
      onLongPress?.();
    };

    const getFileIcon = (file: FileItemType) => {
      if (file.isDirectory) return <Folder className="h-6 w-6 text-primary" />;
      const ext = file.name.split(".").pop()?.toLowerCase();
      switch (ext) {
        case "jpg":
        case "png":
        case "gif":
          return <ImageIcon className="h-6 w-6 text-blue-500" />;
        case "mp3":
        case "wav":
          return <Music className="h-6 w-6 text-green-500" />;
        case "mp4":
        case "mov":
          return <Video className="h-6 w-6 text-purple-500" />;
        default:
          return <File className="h-6 w-6 text-muted-foreground" />;
      }
    };

    const renderThumbnail = () => {
      const ext = file.name.split(".").pop()?.toLowerCase();
      const isImage = ["jpg", "jpeg", "png", "gif"].includes(ext || "");

      if (isImage && !thumbnailError) {
        return (
          <Image
            source={{ uri: file.uri }}
            className="w-12 h-12 rounded"
            onError={() => setThumbnailError(true)}
          />
        );
      }

      return getFileIcon(file);
    };

    const fileActions = [
      { icon: <Eye />, action: "open", label: "预览" },
      { icon: <Share2 />, action: "share", label: "分享" },
      { icon: <Edit2 />, action: "rename", label: "重命名" },
      { icon: <Copy />, action: "copy", label: "复制" },
      { icon: <Move />, action: "move", label: "移动" },
      { icon: <Archive />, action: "compress", label: "压缩" },
      { icon: <Download />, action: "download", label: "下载" },
      { icon: <Trash />, action: "delete", label: "删除" },
    ].filter((action) => {
      // 只对可预览文件显示预览按钮
      if (action.action === "open") {
        const ext = file.name.split(".").pop()?.toLowerCase();
        const viewableExtensions = ["pdf", "txt", "jpg", "png", "gif"];
        return viewableExtensions.includes(ext || "");
      }
      return true;
    });

    return (
      <Pressable
        onPress={handlePress}
        onLongPress={handleLongPress}
        delayLongPress={300}
      >
        <Animated.View
          entering={FadeIn.delay(index * 50).springify()}
          style={animatedStyle}
        >
          <Card
            className={`
            bg-gray-50 overflow-hidden 
            ${isLandscape ? "min-h-[120px]" : ""} 
            ${isSelected ? "border-primary" : ""}
          `}
          >
            <CardHeader className="py-2 flex-row items-center space-x-2">
              {selectedMode && (
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={toggleSelection}
                />
              )}
              <Animated.View entering={FadeIn.delay(index * 100).springify()}>
                {renderThumbnail()}
              </Animated.View>
              <CardTitle numberOfLines={1} className="flex-1 text-sm">
                {file.name}
              </CardTitle>
            </CardHeader>
            <Separator />
            <CardFooter
              className={`py-1 px-2 ${isLandscape ? "h-[60px]" : ""}`}
            >
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="flex-1"
              >
                <View className="flex-row flex-wrap gap-1">
                  {fileActions.map(({ icon, action, label }) => (
                    <Button
                      key={action}
                      variant="ghost"
                      size="sm"
                      onPress={() => onFileAction(file, action)}
                      className={`flex-row items-center ${
                        isLandscape ? "px-2 py-1" : "px-3 py-2"
                      }`}
                    >
                      {React.cloneElement(icon, {
                        className: `h-4 w-4 ${isLandscape ? "mr-1" : "mr-2"}`,
                      })}
                      <Text
                        className={`text-xs ${isLandscape ? "hidden" : ""}`}
                      >
                        {label}
                      </Text>
                    </Button>
                  ))}
                </View>
              </ScrollView>
            </CardFooter>
          </Card>
        </Animated.View>
      </Pressable>
    );
  }
);

export default FileItem;
