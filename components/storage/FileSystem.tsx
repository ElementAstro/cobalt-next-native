import React, { useEffect, useCallback, memo, useState } from "react";
import {
  View,
  useWindowDimensions,
  TouchableOpacity,
  TextInput,
  Platform,
  ActionSheetIOS,
  Modal,
  RefreshControl,
} from "react-native";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { useIsFocused } from "@react-navigation/native";
import {
  X,
  Filter,
  SortAsc,
  SortDesc,
  Share2,
  Trash,
} from "lucide-react-native";
import WebView from "react-native-webview";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
  SlideInRight,
  SlideOutLeft,
  withSpring,
  withTiming,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { toast } from "sonner-native";
import { useFileStore } from "@/stores/useFileStore";
import Drawer from "react-native-drawer";
import FileItem from "./FileItem";
import FileHeader from "./FileHeader";
import ConfirmDialog from "./ConfirmDialog";
import { FlashList } from "@shopify/flash-list";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "nativewind";

// 文件类型定义
interface FileItemType {
  name: string;
  uri: string;
  isDirectory: boolean;
  size?: number;
  modificationTime?: number;
  isFavorite?: boolean;
  isLocked?: boolean;
  mimeType?: string;
}

// 对话框类型定义
type DialogType = {
  type: "delete" | "error";
  message: string;
} | null;

// 过滤类型定义
type FilterType = "all" | "folders" | "files";

// 添加 Separator 组件
const Separator = () => <View className="h-[1px] bg-gray-200" />;

const FileManager: React.FC = () => {
  const { colorScheme } = useColorScheme();
  const {
    viewMode,
    files,
    currentPath,
    selectedFiles,
    setFiles,
    setCurrentPath,
    setSelectedFiles,
    setError,
    searchQuery,
    sortBy,
    sortOrder,
    filterType,
    setSearchQuery,
    setSortBy,
    setSortOrder,
    setFilterType,
    selectedMode,
    showDetails,
    detailsFile,
    setShowDetails,
  } = useFileStore();

  const [showDialog, setShowDialog] = useState(false);
  const [dialogType, setDialogType] = useState<DialogType>(null);
  const [dialogMessage, setDialogMessage] = useState("");
  const [webViewUrl, setWebViewUrl] = useState<string | null>(null);
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isFocused = useIsFocused();

  const loadDirectory = useCallback(
    async (path: string) => {
      try {
        const fileList = await FileSystem.readDirectoryAsync(path);
        const fileDetails = await Promise.all(
          fileList.map(async (name) => {
            const uri = `${path}${name}`;
            const info = await FileSystem.getInfoAsync(uri);
            return {
              name,
              ...info,
            };
          })
        );
        setFiles(fileDetails);
      } catch (error: any) {
        handleError(error);
      }
    },
    [setFiles]
  );

  useEffect(() => {
    if (isFocused) {
      loadDirectory(currentPath);
    }
  }, [currentPath, isFocused, loadDirectory]);

  const closeWebView = () => {
    setWebViewUrl(null);
  };

  const handleFileAction = async (file: FileItemType, action: string) => {
    try {
      switch (action) {
        case "open":
          if (file.isDirectory) {
            setCurrentPath(`${file.uri}/`);
          } else {
            const ext = file.name.split(".").pop()?.toLowerCase();
            const viewableExtensions = ["pdf", "txt", "jpg", "png", "gif"];
            if (viewableExtensions.includes(ext || "")) {
              setWebViewUrl(file.uri);
            } else {
              await Sharing.shareAsync(file.uri);
              toast.success("分享成功");
            }
          }
          break;
        case "delete":
          setDialogType({
            type: "delete",
            message: `确定要删除 ${file.name} 吗？`,
          });
          setDialogMessage(`确定要删除 ${file.name} 吗？`);
          setSelectedFiles([file.uri]);
          setShowDialog(true);
          break;
        case "share":
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(file.uri);
            toast.success("分享成功");
          }
          break;
        case "rename":
          toast.info("重命名功能尚未实现");
          break;
        case "download":
          toast.success("下载成功");
          break;
        case "info":
          toast.info(
            `文件信息: ${file.name}\n大小: ${
              file.size ? (file.size / 1024).toFixed(2) : "N/A"
            } KB`
          );
          break;
        case "lock":
          toast.warning(`锁定 ${file.name} 功能尚未实现`);
          break;
        case "star":
          toast.success(`${file.name} 已标记为收藏`);
          break;
        default:
          toast.error("未知操作");
      }
    } catch (error: any) {
      handleError(error);
    }
  };

  const handleError = useCallback(
    (error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : "未知错误";
      setError(errorMessage);
      setDialogType({ type: "error", message: errorMessage });
      setDialogMessage(errorMessage);
      setShowDialog(true);
      toast.error(errorMessage);
    },
    [setError]
  );

  const handleConfirmDialog = async () => {
    if (dialogType?.type === "delete" && selectedFiles.length > 0) {
      try {
        await Promise.all(
          selectedFiles.map((uri) => FileSystem.deleteAsync(uri))
        );
        loadDirectory(currentPath);
        toast.success("文件已删除");
      } catch (error: any) {
        handleError(error);
      }
    }
    setShowDialog(false);
    setSelectedFiles([]);
  };

  const navigateUp = () => {
    const newPath = currentPath.split("/").slice(0, -2).join("/") + "/";
    if (newPath.startsWith(FileSystem.documentDirectory || "")) {
      setCurrentPath(newPath);
    }
  };

  const handleBatchOperation = async (action: string) => {
    if (selectedFiles.length === 0) return;

    switch (action) {
      case "delete":
        setDialogType({
          type: "delete",
          message: `确定要删除选中的 ${selectedFiles.length} 个文件吗？`,
        });
        setDialogMessage(`确定要删除选中的 ${selectedFiles.length} 个文件吗？`);
        setShowDialog(true);
        break;
      case "share":
        try {
          for (const uri of selectedFiles) {
            await Sharing.shareAsync(uri);
          }
          toast.success("批量分享成功");
        } catch (error) {
          handleError(error);
        }
        break;
      // ... 其他批量操作
    }
  };

  const handleFilterChange = useCallback(
    (type: FilterType) => {
      setFilterType(type);
    },
    [setFilterType]
  );

  // 修复 calculateFolderSize 中的 size 类型问题
  const calculateFolderSize = async (path: string) => {
    try {
      let totalSize = 0;
      const contents = await FileSystem.readDirectoryAsync(path);
      for (const item of contents) {
        const uri = `${path}${item}`;
        const info = await FileSystem.getInfoAsync(uri);
        if (info.isDirectory) {
          totalSize += await calculateFolderSize(uri + "/");
        } else if ("size" in info) {
          totalSize += info.size ?? 0;
        }
      }
      return totalSize;
    } catch (error) {
      console.error("计算文件夹大小出错:", error);
      return 0;
    }
  };

  const processedFiles = React.useMemo(() => {
    let result = [...files];

    // 搜索过滤
    if (searchQuery) {
      result = result.filter((file) =>
        file.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // 类型过滤
    if (filterType !== "all") {
      result = result.filter((file) =>
        filterType === "folders" ? file.isDirectory : !file.isDirectory
      );
    }

    // 排序
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "date":
          comparison = (a.modificationTime || 0) - (b.modificationTime || 0);
          break;
        case "size":
          comparison = (a.size || 0) - (b.size || 0);
          break;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    return result;
  }, [files, searchQuery, sortBy, sortOrder, filterType]);

  // 修复 renderItem 类型
  const renderItem = useCallback(
    ({ item }: { item: FileItemType }) => (
      <Animated.View
        entering={FadeIn.delay(item.name.length * 30)
          .springify()
          .duration(600)}
        exiting={FadeOut.duration(200)}
        layout={LinearTransition}
        className="bg-transparent"
      >
        <FileItem
          file={item}
          index={processedFiles.indexOf(item)}
          isLandscape={isLandscape}
          onFileAction={handleFileAction}
        />
      </Animated.View>
    ),
    [isLandscape, handleFileAction, processedFiles]
  );

  // 处理排序菜单
  const handleSortPress = useCallback(() => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [
            "取消",
            "按名称",
            "按日期",
            "按大小",
            sortOrder === "asc" ? "降序" : "升序",
          ],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) setSortBy("name");
          else if (buttonIndex === 2) setSortBy("date");
          else if (buttonIndex === 3) setSortBy("size");
          else if (buttonIndex === 4)
            setSortOrder(sortOrder === "asc" ? "desc" : "asc");
        }
      );
    } else {
      setIsMenuVisible(true);
    }
  }, [sortOrder, setSortBy, setSortOrder]);

  // Android 自定义菜单
  const CustomMenu = () => (
    <Modal
      visible={isMenuVisible}
      transparent
      animationType="fade"
      onRequestClose={() => setIsMenuVisible(false)}
    >
      <TouchableOpacity
        className="flex-1 bg-black/50"
        activeOpacity={1}
        onPress={() => setIsMenuVisible(false)}
      >
        <View className="bg-card rounded-lg m-4 overflow-hidden">
          <TouchableOpacity
            className="p-4 border-b border-border"
            onPress={() => {
              setSortBy("name");
              setIsMenuVisible(false);
            }}
          >
            <Text>按名称</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="p-4 border-b border-border"
            onPress={() => {
              setSortBy("date");
              setIsMenuVisible(false);
            }}
          >
            <Text>按日期</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="p-4 border-b border-border"
            onPress={() => {
              setSortBy("size");
              setIsMenuVisible(false);
            }}
          >
            <Text>按大小</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="p-4"
            onPress={() => {
              setSortOrder(sortOrder === "asc" ? "desc" : "asc");
              setIsMenuVisible(false);
            }}
          >
            <Text>{sortOrder === "asc" ? "降序" : "升序"}</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  // 处理滚动事件
  const handleScroll = useCallback(() => {
    // 处理滚动逻辑
  }, []);

  // 渲染空状态组件
  const renderEmpty = useCallback(
    () => (
      <View className="flex-1 items-center justify-center py-8">
        <Text>暂无文件</Text>
      </View>
    ),
    []
  );

  // 处理刷新事件
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadDirectory(currentPath);
    setIsRefreshing(false);
  }, [currentPath, loadDirectory]);

  const renderFileList = useCallback(() => {
    const listAnimation = useSharedValue(0);

    useEffect(() => {
      listAnimation.value = withSpring(1);
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
      opacity: listAnimation.value,
      transform: [
        {
          translateY: withSpring((1 - listAnimation.value) * 50),
        },
      ],
    }));

    return (
      <Animated.View style={animatedStyle} className="flex-1">
        <FlashList<FileItemType>
          data={processedFiles}
          numColumns={viewMode === "grid" ? 2 : 1}
          estimatedItemSize={viewMode === "grid" ? 200 : 80}
          renderItem={renderItem}
          onScroll={handleScroll}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colorScheme === "dark" ? "#fff" : "#000"}
            />
          }
          ItemSeparatorComponent={viewMode === "list" ? Separator : undefined}
        />
      </Animated.View>
    );
  }, [processedFiles, viewMode, colorScheme]);

  const renderHeader = useCallback(
    () => (
      <Animated.View
        entering={FadeIn.duration(300)}
        style={[
          {
            opacity: useSharedValue(1),
            transform: [{ translateY: useSharedValue(0) }],
          },
        ]}
      >
        <View className="px-4 py-2">
          <Text>文件列表</Text>
        </View>
      </Animated.View>
    ),
    []
  );

  if (webViewUrl) {
    return (
      <SafeAreaView className="flex-1">
        <View className="flex-1">
          <TouchableOpacity
            onPress={closeWebView}
            className="absolute top-4 right-4 z-10 bg-black/50 rounded-full p-2"
          >
            <X color="white" size={24} />
          </TouchableOpacity>
          <WebView source={{ uri: webViewUrl }} className="flex-1" />
        </View>
      </SafeAreaView>
    );
  }

  const OperationBar = () => {
    const opacity = useSharedValue(0);
    const translateY = useSharedValue(50);

    useEffect(() => {
      if (selectedMode) {
        opacity.value = withSpring(1);
        translateY.value = withSpring(0);
      } else {
        opacity.value = withTiming(0);
        translateY.value = withTiming(50);
      }
    }, [selectedMode]);

    const animatedStyle = useAnimatedStyle(() => ({
      opacity: opacity.value,
      transform: [{ translateY: translateY.value }],
    }));

    return selectedMode ? (
      <Animated.View
        style={animatedStyle}
        className="h-14 bg-primary px-4 flex-row items-center justify-between"
      >
        <Text className="text-white font-medium">
          已选择 {selectedFiles.length} 项
        </Text>
        <View className="flex-row space-x-2">
          <Button variant="ghost" onPress={() => handleBatchOperation("share")}>
            <Share2 color="white" />
          </Button>
          <Button
            variant="ghost"
            onPress={() => handleBatchOperation("delete")}
          >
            <Trash color="white" />
          </Button>
        </View>
      </Animated.View>
    ) : null;
  };

  const DrawerContent = memo(({ file }: { file: FileItemType }) => (
    <Animated.View
      entering={SlideInRight}
      exiting={SlideOutLeft}
      className="flex-1 bg-background p-4"
    >
      <Text className="text-lg font-bold mb-4">{file.name}</Text>
      {/* 文件详细信息... */}
    </Animated.View>
  ));

  return (
    <SafeAreaView className="flex-1 bg-background">
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
      <View className={`flex-1 ${isLandscape ? "flex-row" : "flex-col"}`}>
        <View
          className={isLandscape ? "w-1/4 border-r border-gray-200" : "w-full"}
        >
          <FileHeader
            onNavigateUp={navigateUp}
            isDisabled={currentPath === FileSystem.documentDirectory}
            isLandscape={isLandscape}
            currentPath={currentPath}
          />
        </View>

        <View className="px-4 py-2 flex-row items-center space-x-2">
          <TextInput
            placeholder="搜索文件..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="flex-1 h-10 px-4 rounded-lg bg-gray-100"
          />
          <Button variant="ghost" size="icon" onPress={handleSortPress}>
            {sortOrder === "asc" ? <SortAsc /> : <SortDesc />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onPress={() =>
              handleFilterChange(filterType === "all" ? "folders" : "all")
            }
          >
            <Filter />
          </Button>
        </View>

        <View className={isLandscape ? "w-3/4" : "w-full"}>
          {renderFileList()}
        </View>
      </View>

      {selectedMode && <OperationBar />}

      <Drawer
        open={showDetails}
        type="overlay"
        content={detailsFile && <DrawerContent file={detailsFile} />}
        tapToClose
        openDrawerOffset={0.2}
        panCloseMask={0.2}
        closedDrawerOffset={-3}
        styles={{
          drawer: {
            shadowColor: "#000000",
            shadowOpacity: 0.2,
            shadowRadius: 3,
          },
          main: {
            paddingLeft: 3,
          },
        }}
        tweenHandler={(ratio) => ({
          main: { opacity: (2 - ratio) / 2 },
        })}
        onClose={() => setShowDetails(false)}
      >
        {/* ...existing content... */}
      </Drawer>

      {Platform.OS === "android" && <CustomMenu />}

      <ConfirmDialog
        showDialog={showDialog}
        setShowDialog={setShowDialog}
        dialogType={dialogType?.type || null}
        dialogMessage={dialogMessage}
        handleConfirmDialog={handleConfirmDialog}
      />
    </SafeAreaView>
  );
};

export default memo(FileManager);
