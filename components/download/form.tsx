import React, { useState, useCallback, useMemo } from "react";
import { View, ActivityIndicator } from "react-native";
import useDownloadStore from "~/stores/useDownloadStore";
import { z } from "zod";
import { toast } from "sonner-native";
import { Link, FileDown, AlertCircle, Check, X } from "lucide-react-native";
import { useDebouncedCallback } from "use-debounce";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Text } from "~/components/ui/text";

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

  const addDownload = useDownloadStore((state) => state.addDownload);
  const cancelDownload = useDownloadStore((state) => state.cancelDownload);

  const handleSubmit = async () => {
    if (!url || urlError || filenameError) return;

    try {
      setIsLoading(true);
      const finalFilename = filename || url.split("/").pop() || "unknown";

      const downloadId = await addDownload(url, finalFilename);

      toast.success("下载任务已添加", {
        description: `将下载: ${finalFilename}`,
        icon: <Check size={20} />,
        action: {
          label: "撤销",
          onClick: () => cancelDownload(downloadId),
        },
      });

      setUrl("");
      setFilename("");
    } catch (error) {
      toast.error("添加下载失败", {
        description: error instanceof Error ? error.message : "未知错误",
        icon: <AlertCircle size={20} />,
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
    <View className="p-4 bg-card shadow-sm rounded-lg mb-4 space-y-6">
      <View>
        <Label className="mb-2">下载链接</Label>
        <View className="relative">
          <View className="absolute left-3 top-3 z-10">
            <Link size={20} className="text-muted-foreground" />
          </View>
          <Input
            placeholder="输入下载链接"
            value={url}
            onChangeText={(text) => {
              setUrl(text);
              validateUrl(text);
            }}
            className="pl-10"
          />
          {urlError && (
            <Text className="text-destructive text-sm mt-1">{urlError}</Text>
          )}
        </View>
      </View>

      <View>
        <Label className="mb-2">文件名 (可选)</Label>
        <View className="relative">
          <View className="absolute left-3 top-3 z-10">
            <FileDown size={20} className="text-muted-foreground" />
          </View>
          <Input
            placeholder="留空将使用默认文件名"
            value={filename}
            onChangeText={(text) => {
              setFilename(text);
              validateFilename(text);
            }}
            className="pl-10"
          />
          {filenameError && (
            <Text className="text-destructive text-sm mt-1">
              {filenameError}
            </Text>
          )}
        </View>
      </View>

      <Button
        variant={isValid ? "default" : "secondary"}
        disabled={!isValid || isLoading}
        onPress={handleSubmit}
        className="w-full"
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" className="mr-2" />
        ) : (
          <FileDown size={20} className="mr-2" />
        )}
        添加下载任务
      </Button>
    </View>
  );
});

DownloadForm.displayName = "DownloadForm";
