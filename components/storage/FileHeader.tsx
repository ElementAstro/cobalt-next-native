import React from "react";
import { View } from "react-native";
import { ArrowLeft, MoreHorizontal } from "lucide-react-native";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";

interface FileHeaderProps {
  onNavigateUp: () => void;
  isDisabled: boolean;
  isLandscape: boolean;
}

const FileHeader: React.FC<FileHeaderProps> = ({
  onNavigateUp,
  isDisabled,
  isLandscape,
}) => {
  return (
    <View
      className={`
        flex-row justify-between items-center 
        px-4 py-2 border-b border-gray-200
        ${isLandscape ? "h-14" : "h-16"}
      `}
    >
      <View className="flex-row items-center space-x-2">
        <Button
          variant="ghost"
          size="icon"
          onPress={onNavigateUp}
          disabled={isDisabled}
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <Text className="text-xl font-bold">文件管理器</Text>
      </View>
      <Button variant="ghost" size="icon">
        <MoreHorizontal className="h-6 w-6" />
      </Button>
    </View>
  );
};

export default FileHeader;
