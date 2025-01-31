import React, { useState, useEffect, useCallback, memo } from "react";
import { View, useWindowDimensions } from "react-native";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { useIsFocused } from "@react-navigation/native";
import { FileItem as FileItemType, DialogType } from "./types";
import FileHeader from "./FileHeader";
import FileItem from "./FileItem";
import ConfirmDialog from "./ConfirmDialog";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeIn, LinearTransition } from "react-native-reanimated";
import { toast } from "sonner-native";
import { FlashList } from "@shopify/flash-list";

const FileManager: React.FC = () => {
  const [files, setFiles] = useState<FileItemType[]>([]);
  const [currentPath, setCurrentPath] = useState(
    FileSystem.documentDirectory || ""
  );
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [dialogType, setDialogType] = useState<DialogType>(null);
  const [dialogMessage, setDialogMessage] = useState("");

  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isFocused = useIsFocused();

  const loadDirectory = useCallback(async (path: string) => {
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
  }, []);

  useEffect(() => {
    if (isFocused) {
      loadDirectory(currentPath);
    }
  }, [currentPath, isFocused, loadDirectory]);

  const handleFileAction = async (file: FileItemType, action: string) => {
    try {
      switch (action) {
        case "open":
          if (file.isDirectory) {
            setCurrentPath(`${file.uri}/`);
          } else {
            await Sharing.shareAsync(file.uri);
            toast.success("分享成功");
          }
          break;
        case "delete":
          setDialogType("delete");
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

  const handleError = useCallback((error: unknown) => {
    const errorMessage = error instanceof Error ? error.message : "未知错误";
    setDialogType("error");
    setDialogMessage(errorMessage);
    setShowDialog(true);
    toast.error(errorMessage);
  }, []);

  const handleConfirmDialog = async () => {
    if (dialogType === "delete" && selectedFiles.length > 0) {
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

  return (
    <SafeAreaView className="flex-1 bg-background">
      <FileHeader
        onNavigateUp={navigateUp}
        isDisabled={currentPath === FileSystem.documentDirectory}
        isLandscape={isLandscape}
      />

      <FlashList
        data={files}
        renderItem={({ item, index }) => (
          <Animated.View
            entering={FadeIn.delay(index * 50).springify()}
            layout={LinearTransition.springify()}
            className={isLandscape ? "w-[30%] m-2" : "w-full mb-3"}
          >
            <FileItem
              file={item}
              index={index}
              isLandscape={isLandscape}
              onFileAction={handleFileAction}
            />
          </Animated.View>
        )}
        estimatedItemSize={200}
        numColumns={isLandscape ? 3 : 1}
        contentContainerStyle={{ padding: 16 }}
      />

      <ConfirmDialog
        showDialog={showDialog}
        setShowDialog={setShowDialog}
        dialogType={dialogType}
        dialogMessage={dialogMessage}
        handleConfirmDialog={handleConfirmDialog}
      />
    </SafeAreaView>
  );
};

export default memo(FileManager);
