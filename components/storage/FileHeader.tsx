import React from "react";
import { View } from "react-native";
import { ArrowLeft, MoreHorizontal } from "lucide-react-native";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";

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
  return (
    <View
      className={`
        flex-col justify-between
        border-b border-gray-200
        ${isLandscape ? 'h-full py-2' : 'h-auto py-3'}
      `}
    >
      <View className="px-4 flex-row items-center space-x-2">
        <Button
          variant="ghost"
          size="icon"
          onPress={onNavigateUp}
          disabled={isDisabled}
          className={isLandscape ? 'h-8 w-8' : 'h-10 w-10'}
        >
          <ArrowLeft className={isLandscape ? 'h-5 w-5' : 'h-6 w-6'} />
        </Button>
        <Text className={`font-bold ${isLandscape ? 'text-lg' : 'text-xl'}`}>
          文件管理器
        </Text>
      </View>
      
      {currentPath && (
        <Text 
          numberOfLines={1} 
          className="px-4 mt-1 text-xs text-muted-foreground"
        >
          {currentPath}
        </Text>
      )}
    </View>
  );
};

export default FileHeader;
