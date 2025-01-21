import React, { useState, useEffect, useCallback } from "react";
import { z } from "zod";
import { View, ScrollView, useWindowDimensions, ActivityIndicator, Text } from "react-native";
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

// Zod schema for directory validation
const directorySchema = z.object({
  path: z.string().min(1),
  files: z.array(z.object({
    name: z.string().min(1),
    uri: z.string().url(),
    isDirectory: z.boolean(),
    size: z.number().optional(),
    modificationTime: z.number().optional(),
  }))
});

const FileManager: React.FC = () => {
  const [files, setFiles] = useState<FileItemType[]>([]);
  const [currentPath, setCurrentPath] = useState(
    FileSystem.documentDirectory || ""
  );
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [dialogType, setDialogType] = useState<DialogType>(null);
  const [dialogMessage, setDialogMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isFocused = useIsFocused();

  const loadDirectory = useCallback(async (path: string) => {
    setIsLoading(true);
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

      // Validate directory data
      const validationResult = directorySchema.safeParse({
        path,
        files: fileDetails
      });

      if (!validationResult.success) {
        console.error("Directory validation failed:", validationResult.error);
        throw new Error("Invalid directory data");
      }

      setFiles(fileDetails);
    } catch (error: any) {
      showError(error.message || "无法读取目录");
    } finally {
      setIsLoading(false);
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
            if (await Sharing.isAvailableAsync()) {
              await Sharing.shareAsync(file.uri);
              Toast.show({
                type: "success",
                text1: "分享成功",
              });
            } else {
              showError("分享功能不可用");
            }
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
          } else {
            showError("分享功能不可用");
          }
          break;

        case "rename":
          // TODO: 实现重命名功能
          Toast.show({
            type: "info",
            text1: "重命名功能尚未实现",
          });
          break;

        case "download":
          // TODO: 实现下载功能
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
            } KB\n修改时间: ${
              file.modificationTime
                ? new Date(file.modificationTime).toLocaleString()
                : "N/A"
            }`,
          });
          break;

        case "lock":
          // TODO: 实现锁定功能
          Toast.show({
            type: "warn",
            text1: `锁定 ${file.name} 功能尚未实现`,
          });
          break;

        case "star":
          // TODO: 实现收藏功能
          Toast.show({
            type: "success",
            text1: `${file.name} 已标记为收藏`,
          });
          break;

        default:
          showError("未知操作");
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
        await loadDirectory(currentPath);
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
    <SafeAreaView className="flex-1 bg-background">
      <FileHeader
        onNavigateUp={navigateUp}
        isDisabled={currentPath === FileSystem.documentDirectory}
        isLandscape={isLandscape}
        currentPath={currentPath}
      />

      {isLoading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text className="mt-4 text-muted-foreground">加载中...</Text>
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            flexGrow: 1,
            padding: 16
          }}
        >
          {files.length > 0 ? (
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
          ) : (
            <View className="flex-1 justify-center items-center">
              <Text className="text-muted-foreground">当前目录为空</Text>
            </View>
          )}
        </ScrollView>
      )}

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
