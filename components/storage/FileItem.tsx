import React from "react";
import {
  Folder,
  File,
  Image as ImageIcon,
  Music,
  Video,
  Share2,
  Edit2,
  Trash,
  Info,
  Lock,
  Star,
} from "lucide-react-native";
import Animated, { FadeIn, FadeOut, Layout } from "react-native-reanimated";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Text } from "@/components/ui/text";
import { FileItem as FileItemType } from "./types";
import { TouchableOpacity, View } from "react-native";

interface FileItemProps {
  file: FileItemType;
  index: number;
  isLandscape: boolean;
  onFileAction: (file: FileItemType, action: string) => void;
}

const FileItem: React.FC<FileItemProps> = ({
  file,
  index,
  isLandscape,
  onFileAction,
}) => {
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

  return (
    <TouchableOpacity
      onPress={() => onFileAction(file, "open")}
      activeOpacity={0.7}
    >
      <Card className="bg-gray-50 overflow-hidden">
        <CardHeader className="py-3 flex-row items-center space-x-2">
          <Animated.View
            entering={FadeIn.delay(index * 100).springify()}
          >
            {getFileIcon(file)}
          </Animated.View>
          <CardTitle numberOfLines={1} className="flex-1 text-base">
            {file.name}
          </CardTitle>
        </CardHeader>
        <Separator />
        <CardFooter className="py-2 px-2">
          <View className="flex-row flex-wrap gap-1">
            {["share", "rename", "delete", "info", "lock", "star"].map((action) => (
              <Button
                key={action}
                variant="ghost"
                size="sm"
                onPress={() => onFileAction(file, action)}
                className="flex-grow-0"
              >
                <ActionIcon action={action} />
              </Button>
            ))}
          </View>
        </CardFooter>
      </Card>
    </TouchableOpacity>
  );
};

const ActionIcon = ({ action }: { action: string }) => {
  switch (action) {
    case "share":
      return <Share2 className="h-4 w-4" />;
    case "rename":
      return <Edit2 className="h-4 w-4" />;
    case "delete":
      return <Trash className="h-4 w-4" />;
    case "info":
      return <Info className="h-4 w-4" />;
    case "lock":
      return <Lock className="h-4 w-4" />;
    case "star":
      return <Star className="h-4 w-4 text-yellow-500" />;
    default:
      return null;
  }
};

export default FileItem;
