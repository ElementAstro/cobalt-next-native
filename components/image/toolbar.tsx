import React, { useCallback } from "react";
import { View } from "react-native";
import {
  Grid,
  List,
  Settings,
  FolderPlus,
  Upload,
  Star,
  Filter,
  BarChart2,
  Play,
  SlidersHorizontal,
  Camera,
  Share2,
  Search,
} from "lucide-react-native";
import Animated, {
  FadeIn,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { Button } from "~/components/ui/button";
import { Text } from "~/components/ui/text";
import { Separator } from "~/components/ui/separator";
import { Badge } from "~/components/ui/badge";
import { useFileStore } from "~/stores/useImageStore";

interface ToolbarProps {
  onCreateFolder?: () => void;
  onUpload?: () => void;
  onOpenSettings?: () => void;
  onStackImages?: () => void;
  onShowStats?: () => void;
  onSearch?: () => void;
  onShare?: () => void;
  isLandscape?: boolean;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  onCreateFolder,
  onUpload,
  onOpenSettings,
  onStackImages,
  onShowStats,
  onSearch,
  onShare,
  isLandscape = false,
}) => {
  const { viewMode, setViewMode, selectedFiles, filterType } = useFileStore();

  const buttonStyle = useCallback(
    (highlighted?: boolean) =>
      `${isLandscape ? "h-10 w-10" : "h-12 w-12"} rounded-2xl
     ${highlighted ? "bg-primary" : ""}`,
    [isLandscape]
  );

  const renderPrimaryTools = () => (
    <View className="flex-row items-center space-x-2">
      <Button
        variant="ghost"
        size="icon"
        className={buttonStyle(viewMode === "grid")}
        onPress={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
      >
        {viewMode === "grid" ? (
          <List
            className={`h-5 w-5 ${
              viewMode === "grid" ? "text-primary-foreground" : ""
            }`}
          />
        ) : (
          <Grid className="h-5 w-5" />
        )}
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className={buttonStyle()}
        onPress={onSearch}
      >
        <Search className="h-5 w-5" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className={buttonStyle(filterType !== "all")}
        onPress={onShowStats}
      >
        <Filter className="h-5 w-5" />
      </Button>
    </View>
  );

  const renderSecondaryTools = () => (
    <View className="flex-row items-center space-x-2">
      <Button
        variant="ghost"
        size="icon"
        className={buttonStyle()}
        onPress={onStackImages}
      >
        <Camera className="h-5 w-5" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className={buttonStyle()}
        onPress={onShowStats}
      >
        <BarChart2 className="h-5 w-5" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className={buttonStyle()}
        onPress={onOpenSettings}
      >
        <SlidersHorizontal className="h-5 w-5" />
      </Button>
    </View>
  );

  const renderMainActions = () => (
    <View className="flex-row items-center space-x-2">
      <Button
        variant="outline"
        className={`${isLandscape ? "h-10" : "h-12"} rounded-2xl px-4`}
        onPress={onCreateFolder}
      >
        <FolderPlus className="h-5 w-5 mr-2" />
        <Text>新建文件夹</Text>
      </Button>

      <Button
        className={`${isLandscape ? "h-10" : "h-12"} rounded-2xl px-4`}
        onPress={onUpload}
      >
        <Upload className="h-5 w-5 mr-2" />
        <Text>上传</Text>
      </Button>
    </View>
  );

  const renderSelectionActions = () => (
    <Animated.View
      entering={FadeIn.duration(200)}
      className="flex-row items-center space-x-2"
    >
      <Badge variant="secondary" className="h-8 px-3">
        已选择 {selectedFiles.length} 项
      </Badge>

      <Button
        variant="outline"
        size="icon"
        className={buttonStyle()}
        onPress={onShare}
      >
        <Share2 className="h-5 w-5" />
      </Button>

      <Button variant="ghost" size="icon" className={buttonStyle()}>
        <Star className="h-5 w-5" />
      </Button>
    </Animated.View>
  );

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      className="bg-background/95 backdrop-blur border-t border-border"
    >
      <View
        className={`
          flex-row items-center justify-between
          ${isLandscape ? "h-14" : "h-16"} px-4
        `}
      >
        {renderPrimaryTools()}

        <Separator orientation="vertical" className="h-8" />

        {renderSecondaryTools()}

        <Separator orientation="vertical" className="h-8" />

        {selectedFiles.length > 0
          ? renderSelectionActions()
          : renderMainActions()}
      </View>
    </Animated.View>
  );
};

export default React.memo(Toolbar);
