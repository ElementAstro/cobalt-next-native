import React from "react";
import { View } from "react-native";
import { ArrowLeft, MoreHorizontal, Folder, Settings } from "lucide-react-native";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import Animated, { FadeIn, FadeOut, Layout } from "react-native-reanimated";

interface FileHeaderProps {
  onNavigateUp: () => void;
  isDisabled: boolean;
  isLandscape: boolean;
  currentPath?: string;
}

const FileHeader: React.FC<FileHeaderProps> = ({
  onNavigateUp,
  isDisabled,
  isLandscape,
  currentPath,
}) => {
  const getFolderName = () => {
    if (!currentPath) return "文件管理器";
    const parts = currentPath.split("/").filter(Boolean);
    return parts[parts.length - 1] || "文件管理器";
  };

  return (
    <Animated.View
      layout={Layout.springify()}
      className={`
        flex-row justify-between items-center
        px-4 py-2 border-b border-border
        ${isLandscape ? "h-14" : "h-16"}
        bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60
      `}
    >
      <View className="flex-row items-center space-x-2">
        <Button
          variant="ghost"
          size="icon"
          onPress={onNavigateUp}
          disabled={isDisabled}
          className="active:scale-95 transition-transform"
        >
          <Animated.View
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(200)}
          >
            <ArrowLeft className="h-6 w-6" />
          </Animated.View>
        </Button>
        <Folder className="h-5 w-5 text-primary" />
        <Text className="text-xl font-bold">{getFolderName()}</Text>
      </View>

      <View className="flex-row items-center space-x-2">
        <Button variant="ghost" size="icon" className="relative">
          <MoreHorizontal className="h-6 w-6" />
          <View className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" />
        </Button>
        <Button variant="ghost" size="icon">
          <Settings className="h-6 w-6" />
        </Button>
      </View>
    </Animated.View>
  );
};

export default FileHeader;
