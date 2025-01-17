import React, { useState, useEffect, useCallback } from "react";
import { View, ScrollView, useWindowDimensions } from "react-native";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { useIsFocused } from "@react-navigation/native";
import Animated, { FadeIn, FadeOut, Layout } from "react-native-reanimated";
import {
  Folder,
  File,
  Image as ImageIcon,
  Music,
  Video,
  Trash,
  Share2,
  ArrowLeft,
  Edit2,
  MoreHorizontal,
  Info,
  Lock,
  Star,
} from "lucide-react-native";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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

import Toast from "react-native-toast-message";

interface FileItem {
  name: string;
  uri: string;
  isDirectory: boolean;
  size?: number;
  modificationTime?: number;
}

const FileManager: React.FC = () => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [currentPath, setCurrentPath] = useState(
    FileSystem.documentDirectory || ""
  );
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [dialogType, setDialogType] = useState<
    "delete" | "rename" | "error" | null
  >(null);
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

  const getFileIcon = (file: FileItem) => {
    if (file.isDirectory) return <Folder className="h-6 w-6 text-primary" />;
    const ext = file.name.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "jpg":
      case "png":
      case "gif":
        return <ImageIcon className="h-6 w-6 text-blue-500" />;
      case "mp3":
      case "wav":
        return <Music className="h-6 w-6 text-green-500" />;
      case "mp4":
      case "mov":
        return <Video className="h-6 w-6 text-purple-500" />;
      case "pdf":
        return <File className="h-6 w-6 text-red-500" />;
      case "txt":
        return <File className="h-6 w-6 text-gray-500" />;
      case "doc":
      case "docx":
        return <File className="h-6 w-6 text-blue-700" />;
      case "zip":
      case "rar":
        return <File className="h-6 w-6 text-yellow-500" />;
      default:
        return <File className="h-6 w-6 text-muted-foreground" />;
    }
  };

  const handleFileAction = async (file: FileItem, action: string) => {
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
    <View className="flex-1 bg-white">
      <View
        className={`flex-row justify-between items-center px-4 py-4 ${
          isLandscape ? "h-16" : "h-20"
        }`}
      >
        <View className="flex-row items-center space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onPress={navigateUp}
            disabled={currentPath === FileSystem.documentDirectory}
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <Text className="text-xl font-bold">文件管理器</Text>
        </View>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="h-6 w-6" />
        </Button>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View
          className={`flex-wrap ${isLandscape ? "flex-row" : "flex-col"} gap-4`}
        >
          {files.map((file, index) => (
            <Animated.View
              key={file.uri}
              entering={FadeIn.delay(index * 50)}
              exiting={FadeOut}
              layout={Layout}
              className={`${isLandscape ? "w-1/3 m-2" : "w-full"}`}
            >
              <Card className="bg-gray-50">
                <CardHeader className="flex-row items-center space-x-2">
                  {getFileIcon(file)}
                  <CardTitle className="flex-1 text-lg">{file.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Text className="text-sm text-gray-500">
                    {file.size
                      ? `${(file.size / 1024).toFixed(1)} KB`
                      : "文件夹"}
                  </Text>
                </CardContent>
                <Separator />
                <CardFooter className="flex-row justify-between p-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onPress={() => handleFileAction(file, "open")}
                    className="flex-1 mx-1"
                  >
                    {file.isDirectory ? "打开" : "预览"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onPress={() => handleFileAction(file, "share")}
                    className="flex-1 mx-1"
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onPress={() => handleFileAction(file, "rename")}
                    className="flex-1 mx-1"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onPress={() => handleFileAction(file, "delete")}
                    className="flex-1 mx-1"
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onPress={() => handleFileAction(file, "info")}
                    className="flex-1 mx-1"
                  >
                    <Info className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onPress={() => handleFileAction(file, "lock")}
                    className="flex-1 mx-1"
                  >
                    <Lock className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onPress={() => handleFileAction(file, "star")}
                    className="flex-1 mx-1"
                  >
                    <Star className="h-4 w-4 text-yellow-500" />
                  </Button>
                </CardFooter>
              </Card>
            </Animated.View>
          ))}
        </View>
      </ScrollView>

      <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
        <AlertDialogContent className="bg-white rounded-lg p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-semibold">
              {dialogType === "error" ? "错误" : "确认操作"}
            </AlertDialogTitle>
            <AlertDialogDescription className="mt-2 text-gray-600">
              {dialogMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 flex-row justify-end space-x-4">
            <AlertDialogCancel className="text-red-500">取消</AlertDialogCancel>
            {dialogType !== "error" && (
              <AlertDialogAction
                onPress={handleConfirmDialog}
                className="text-blue-500"
              >
                确认
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Toast />
    </View>
  );
};

export default FileManager;
