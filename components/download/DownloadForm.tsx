import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  ActivityIndicator,
} from "react-native";
import { downloadManager } from "./download";
import { z } from "zod";
import { toast } from "sonner-native";
import { Link, FileDown, AlertCircle, Check } from "lucide-react-native";
import { useDebouncedCallback } from "use-debounce";

const urlSchema = z.string().url("请输入有效的下载链接");
const filenameSchema = z
  .string()
  .min(1)
  .max(255)
  .regex(/^[^<>:"/\\|?*]+$/, "文件名包含无效字符");

export const DownloadForm: React.FC = React.memo(() => {
  const [url, setUrl] = useState("");
  const [filename, setFilename] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [urlError, setUrlError] = useState("");
  const [filenameError, setFilenameError] = useState("");

  const validateUrl = useDebouncedCallback((value: string) => {
    try {
      urlSchema.parse(value);
      setUrlError("");
    } catch (error) {
      if (error instanceof z.ZodError) {
        setUrlError(error.errors[0].message);
      }
    }
  }, 500);

  const validateFilename = useCallback((value: string) => {
    if (!value) {
      setFilenameError("");
      return;
    }
    try {
      filenameSchema.parse(value);
      setFilenameError("");
    } catch (error) {
      if (error instanceof z.ZodError) {
        setFilenameError(error.errors[0].message);
      }
    }
  }, []);

  const handleSubmit = async () => {
    if (!url || urlError || filenameError) return;

    try {
      setIsLoading(true);
      const finalFilename = filename || url.split("/").pop() || "unknown";
      await downloadManager.addDownload(url, finalFilename);

      toast("下载任务已添加", {
        description: `文件: ${finalFilename}`,
        icon: <Check size={20} color="#10b981" />,
      });

      setUrl("");
      setFilename("");
    } catch (error) {
      toast("添加下载失败", {
        description: error instanceof Error ? error.message : "未知错误",
        icon: <AlertCircle size={20} color="#ef4444" />,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isValid = useMemo(
    () => url && !urlError && !filenameError,
    [url, urlError, filenameError]
  );

  return (
    <View className="p-4 bg-white dark:bg-gray-800 shadow-sm rounded-lg mb-4">
      <Text className="text-lg font-semibold mb-2 dark:text-white">
        添加下载任务
      </Text>

      <View className="space-y-4">
        <View>
          <View className="flex-row items-center border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 focus-within:border-blue-500">
            <Link size={20} className="text-gray-400 mr-2" />
            <TextInput
              className="flex-1 text-base dark:text-white"
              placeholder="输入下载链接"
              placeholderTextColor="#9CA3AF"
              value={url}
              onChangeText={(text) => {
                setUrl(text);
                validateUrl(text);
              }}
            />
          </View>
          {urlError && (
            <Text className="text-red-500 text-sm mt-1">{urlError}</Text>
          )}
        </View>

        <View>
          <View className="flex-row items-center border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 focus-within:border-blue-500">
            <FileDown size={20} className="text-gray-400 mr-2" />
            <TextInput
              className="flex-1 text-base dark:text-white"
              placeholder="文件名（可选）"
              placeholderTextColor="#9CA3AF"
              value={filename}
              onChangeText={(text) => {
                setFilename(text);
                validateFilename(text);
              }}
            />
          </View>
          {filenameError && (
            <Text className="text-red-500 text-sm mt-1">{filenameError}</Text>
          )}
        </View>

        <TouchableOpacity
          className={`p-3 rounded-lg flex-row justify-center items-center space-x-2 ${
            isValid ? "bg-blue-500" : "bg-gray-300 dark:bg-gray-700"
          }`}
          onPress={handleSubmit}
          disabled={!isValid || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <FileDown size={20} color="#fff" />
              <Text className="text-white font-medium">添加下载任务</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
});

DownloadForm.displayName = "DownloadForm";
