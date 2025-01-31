import React, { memo } from "react";
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
} from "lucide-react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import {
  Card,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Text } from "@/components/ui/text";
import { FileItem as FileItemType } from "./types";
import { TouchableOpacity, View, ScrollView } from "react-native";

interface FileItemProps {
  file: FileItemType;
  index: number;
  isLandscape: boolean;
  onFileAction: (file: FileItemType, action: string) => void;
}

const FileItem: React.FC<FileItemProps> = memo(
  ({ file, index, isLandscape, onFileAction }) => {
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

    const fileActions = [
      { icon: <Share2 />, action: "share", label: "分享" },
      { icon: <Edit2 />, action: "rename", label: "重命名" },
      { icon: <Copy />, action: "copy", label: "复制" },
      { icon: <Move />, action: "move", label: "移动" },
      { icon: <Archive />, action: "compress", label: "压缩" },
      { icon: <Download />, action: "download", label: "下载" },
      { icon: <Trash />, action: "delete", label: "删除" },
    ];

    return (
      <TouchableOpacity
        onPress={() => onFileAction(file, "open")}
        activeOpacity={0.7}
      >
        <Card className="bg-gray-50 overflow-hidden">
          <CardHeader className="py-3 flex-row items-center space-x-2">
            <Animated.View entering={FadeIn.delay(index * 100).springify()}>
              {getFileIcon(file)}
            </Animated.View>
            <CardTitle numberOfLines={1} className="flex-1 text-base">
              {file.name}
            </CardTitle>
          </CardHeader>
          <Separator />
          <CardFooter className="py-2 px-2">
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-1">
                {fileActions.map(({ icon, action, label }) => (
                  <Button
                    key={action}
                    variant="ghost"
                    size="sm"
                    onPress={() => onFileAction(file, action)}
                    className="flex-row items-center gap-1"
                  >
                    {icon}
                    <Text className="text-xs">{label}</Text>
                  </Button>
                ))}
              </View>
            </ScrollView>
          </CardFooter>
        </Card>
      </TouchableOpacity>
    );
  }
);

export default FileItem;
