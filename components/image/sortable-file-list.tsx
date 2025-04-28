import React, { useCallback, useState, useRef } from "react";
import { View, Dimensions } from "react-native";
import DraggableFlatList, {
  ScaleDecorator,
  ShadowDecorator,
  OpacityDecorator,
  RenderItemParams,
} from "react-native-draggable-flatlist";
import Animated, {
  FadeIn,
  SlideInRight,
  Layout,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from "react-native-reanimated";
import { FileItem as FileItemType } from "~/stores/useImageStore";
import FileItem from "./file-item";
import { Text } from "~/components/ui/text";
import { Card } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { GripVertical } from "lucide-react-native";

interface SortableFileListProps {
  files: FileItemType[];
  viewMode?: "grid" | "list";
  isLandscape?: boolean;
  onFileAction: (file: FileItemType, action: string) => void;
  onOrderChange: (files: FileItemType[]) => void;
  selectedFiles?: string[];
  ListEmptyComponent?: React.ReactElement;
  ListHeaderComponent?: React.ReactElement;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const COLUMN_COUNT = 2;
const SPACING = 8;
const ITEM_WIDTH = (SCREEN_WIDTH - (COLUMN_COUNT + 1) * SPACING) / COLUMN_COUNT;

export const SortableFileList: React.FC<SortableFileListProps> = ({
  files,
  viewMode = "grid",
  isLandscape = false,
  onFileAction,
  onOrderChange,
  selectedFiles = [],
  ListEmptyComponent,
  ListHeaderComponent,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const listRef = useRef(null);

  const renderItem = useCallback(
    ({ item, drag, isActive, getIndex }: RenderItemParams<FileItemType>) => {
      const index = getIndex();

      const animatedStyle = useAnimatedStyle(() => ({
        transform: [
          {
            scale: withSpring(isActive ? 1.05 : 1, {
              mass: 0.6,
              damping: 15,
              stiffness: 200,
            }),
          },
        ],
        zIndex: isActive ? 1 : 0,
      }));

      return (
        <ScaleDecorator>
          <ShadowDecorator>
            <OpacityDecorator activeOpacity={0.8}>
              <Animated.View
                style={[
                  animatedStyle,
                  {
                    width: viewMode === "grid" ? ITEM_WIDTH : "100%",
                    margin: SPACING / 2,
                  },
                ]}
              >
                <Card className="overflow-hidden bg-background/95 backdrop-blur">
                  <View className="flex-row items-center">
                    <View
                      className={`
                        p-2 items-center justify-center
                        ${viewMode === "grid" ? "hidden" : ""}
                      `}
                      onTouchStart={drag}
                    >
                      <GripVertical className="h-5 w-5 text-muted-foreground" />
                    </View>
                    <View className="flex-1">
                      <FileItem
                        file={item}
                        index={index || 0}
                        isLandscape={isLandscape}
                        isSelected={selectedFiles.includes(item.uri)}
                        onFileAction={onFileAction}
                        onLongPress={drag}
                      />
                    </View>
                  </View>
                  {isActive && (
                    <Animated.View
                      entering={FadeIn}
                      className="absolute inset-0 bg-primary/10 border-2 border-primary rounded-lg"
                    />
                  )}
                </Card>
              </Animated.View>
            </OpacityDecorator>
          </ShadowDecorator>
        </ScaleDecorator>
      );
    },
    [viewMode, isLandscape, selectedFiles, onFileAction]
  );

  const defaultEmptyComponent = (
    <View className="flex-1 items-center justify-center py-12">
      <Card className="p-6 items-center space-y-4 bg-background/95 backdrop-blur">
        <Text className="text-lg font-medium">暂无文件</Text>
        <Text className="text-sm text-muted-foreground text-center">
          拖动文件到此处或点击上传按钮添加文件
        </Text>
      </Card>
    </View>
  );

  return (
    <View className="flex-1">
      <DraggableFlatList
        ref={listRef}
        data={files}
        onDragBegin={() => setDragActive(true)}
        onDragEnd={({ data }) => {
          setDragActive(false);
          onOrderChange(data);
        }}
        renderItem={renderItem}
        keyExtractor={(item) => item.uri}
        numColumns={viewMode === "grid" ? COLUMN_COUNT : 1}
        contentContainerStyle={{
          paddingHorizontal: SPACING / 2,
          paddingVertical: SPACING,
        }}
        ListHeaderComponent={ListHeaderComponent}
        ListEmptyComponent={ListEmptyComponent || defaultEmptyComponent}
        showsVerticalScrollIndicator={false}
        activationDistance={20}
        scrollEnabled={!dragActive}
        autoscrollThreshold={60}
        animationConfig={{
          mass: 0.6,
          damping: 15,
          stiffness: 200,
        }}
      />
      {dragActive && (
        <Badge
          variant="secondary"
          className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2"
        >
          <Text className="text-sm">拖动以重新排序</Text>
        </Badge>
      )}
    </View>
  );
};

export default React.memo(SortableFileList);
