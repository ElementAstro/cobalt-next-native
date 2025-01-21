import React from "react";
import { z } from "zod";
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
  FileText,
  Archive,
  Code,
  FileSpreadsheet,
  FileCode,
  FileAudio,
  FileVideo,
  FileImage,
} from "lucide-react-native";
import Animated, { FadeIn, FadeOut, Layout, ZoomIn } from "react-native-reanimated";
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

// Zod schema for file validation
const fileSchema = z.object({
  name: z.string().min(1),
  uri: z.string().url(),
  isDirectory: z.boolean(),
  size: z.number().optional(),
  modificationTime: z.number().optional(),
});

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
  // Validate file using Zod
  const validationResult = fileSchema.safeParse(file);
  if (!validationResult.success) {
    console.error("Invalid file data:", validationResult.error);
    return null;
  }

  const getFileIcon = (file: FileItemType) => {
    if (file.isDirectory) return <Folder className="h-6 w-6 text-primary" />;
    
    const ext = file.name.split(".").pop()?.toLowerCase();
    switch (ext) {
      // Images
      case "jpg":
      case "jpeg":
      case "png":
      case "gif":
      case "webp":
        return <FileImage className="h-6 w-6 text-blue-500" />;
      
      // Audio
      case "mp3":
      case "wav":
      case "flac":
      case "aac":
        return <FileAudio className="h-6 w-6 text-green-500" />;
      
      // Video
      case "mp4":
      case "mov":
      case "avi":
      case "mkv":
        return <FileVideo className="h-6 w-6 text-purple-500" />;
      
      // Documents
      case "pdf":
        return <FileText className="h-6 w-6 text-red-500" />;
      case "doc":
      case "docx":
        return <FileText className="h-6 w-6 text-blue-500" />;
      case "xls":
      case "xlsx":
        return <FileSpreadsheet className="h-6 w-6 text-green-500" />;
      
      // Code
      case "js":
      case "ts":
      case "jsx":
      case "tsx":
      case "html":
      case "css":
        return <FileCode className="h-6 w-6 text-yellow-500" />;
      
      // Archives
      case "zip":
      case "rar":
      case "7z":
        return <Archive className="h-6 w-6 text-orange-500" />;
      
      default:
        return <File className="h-6 w-6 text-muted-foreground" />;
    }
  };

  return (
    <Animated.View
      entering={FadeIn.delay(index * 50).springify()}
      exiting={FadeOut}
      layout={Layout.springify()}
    >
      <TouchableOpacity
        onPress={() => onFileAction(file, "open")}
        activeOpacity={0.7}
      >
        <Card className="bg-background/50 overflow-hidden hover:bg-accent/50 transition-colors">
          <CardHeader className="py-3 flex-row items-center space-x-2">
            <Animated.View entering={ZoomIn.delay(100)}>
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
                  className="flex-grow-0 hover:bg-accent/50"
                >
                  <ActionIcon action={action} />
                </Button>
              ))}
            </View>
          </CardFooter>
        </Card>
      </TouchableOpacity>
    </Animated.View>
  );
};

const ActionIcon = ({ action }: { action: string }) => {
  switch (action) {
    case "share":
      return <Share2 className="h-4 w-4 text-blue-500" />;
    case "rename":
      return <Edit2 className="h-4 w-4 text-green-500" />;
    case "delete":
      return <Trash className="h-4 w-4 text-red-500" />;
    case "info":
      return <Info className="h-4 w-4 text-blue-500" />;
    case "lock":
      return <Lock className="h-4 w-4 text-yellow-500" />;
    case "star":
      return <Star className="h-4 w-4 text-yellow-500" />;
    default:
      return null;
  }
};

export default FileItem;
