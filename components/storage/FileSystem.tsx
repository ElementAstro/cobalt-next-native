import React, { useState, useEffect, useCallback } from "react";
import { View, ScrollView, useWindowDimensions } from "react-native";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { useIsFocused } from "@react-navigation/native";
import Toast from "react-native-toast-message";
import { FileItem as FileItemType, DialogType } from "./types";
import FileHeader from "./FileHeader";
import FileItem from "./FileItem";
import ConfirmDialog from "./ConfirmDialog";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeIn, Layout } from "react-native-reanimated";

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
      showError(error.message || "无法读取目录");
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
            Toast.show({
              type: "success",
              text1: "分享成功",
            });
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
            Toast.show({
              type: "success",
              text1: "分享成功",
            });
          }
          break;
        case "rename":
          // 这里可以添加重命名功能的代码
          Toast.show({
            type: "info",
            text1: "重命名功能尚未实现",
          });
          break;
        case "download":
          // 假设下载功能
          Toast.show({
            type: "success",
            text1: "下载成功",
          });
          break;
        case "info":
          Toast.show({
            type: "info",
            text1: `文件信息: ${file.name}`,
            text2: `大小: ${
              file.size ? (file.size / 1024).toFixed(2) : "N/A"
            } KB`,
          });
          break;
        case "lock":
          Toast.show({
            type: "warn",
            text1: `锁定 ${file.name} 功能尚未实现`,
          });
          break;
        case "star":
          Toast.show({
            type: "success",
            text1: `${file.name} 已标记为收藏`,
          });
          break;
        default:
          Toast.show({
            type: "error",
            text1: "未知操作",
          });
      }
    } catch (error: any) {
      showError(error.message || "操作失败");
    }
  };

  const showError = (message: string) => {
    setDialogType("error");
    setDialogMessage(message);
    setShowDialog(true);
    Toast.show({
      type: "error",
      text1: message,
    });
  };

  const handleConfirmDialog = async () => {
    if (dialogType === "delete" && selectedFiles.length > 0) {
      try {
        await Promise.all(
          selectedFiles.map((uri) => FileSystem.deleteAsync(uri))
        );
        loadDirectory(currentPath);
        Toast.show({
          type: "success",
          text1: "删除成功",
        });
      } catch (error: any) {
        const errorMessage =
          error instanceof Error ? error.message : "未知错误";
        showError("删除失败: " + errorMessage);
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
    <SafeAreaView className="flex-1 bg-white">
      <FileHeader
        onNavigateUp={navigateUp}
        isDisabled={currentPath === FileSystem.documentDirectory}
        isLandscape={isLandscape}
      />

      <ScrollView 
        className="flex-1"
        contentContainerStyle={{ 
          flexGrow: 1,
          padding: 16
        }}
      >
        <View className={`flex-1 ${isLandscape ? "flex-row flex-wrap" : ""} gap-4`}>
          {files.map((file, index) => (
            <Animated.View
              key={file.uri}
              entering={FadeIn.delay(index * 50).springify()}
              layout={Layout.springify()}
              className={isLandscape ? "w-[30%]" : "w-full"}
            >
              <FileItem
                file={file}
                index={index}
                isLandscape={isLandscape}
                onFileAction={handleFileAction}
              />
            </Animated.View>
          ))}
        </View>
      </ScrollView>

      <ConfirmDialog
        showDialog={showDialog}
        setShowDialog={setShowDialog}
        dialogType={dialogType}
        dialogMessage={dialogMessage}
        handleConfirmDialog={handleConfirmDialog}
      />

      <Toast />
    </SafeAreaView>
  );
};

export default FileManager;
