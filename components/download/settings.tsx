import React from "react";
import { View, ScrollView } from "react-native";
import useDownloadStore from "~/stores/useDownloadStore";
import Slider from "@react-native-community/slider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "~/components/ui/dialog";
import { Switch } from "~/components/ui/switch";
import { Label } from "~/components/ui/label";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Input } from "~/components/ui/input";
import { FileDown, Clock, Shield, FolderTree } from "lucide-react-native";

interface DownloadSettingsProps {
  visible: boolean;
  onClose: () => void;
}

export const DownloadSettings: React.FC<DownloadSettingsProps> = ({
  visible,
  onClose,
}) => {
  const settings = useDownloadStore((state) => state.settings);
  const updateSettings = useDownloadStore((state) => state.updateSettings);

  const handleMaxDownloadsChange = (value: number) => {
    updateSettings({ maxConcurrentDownloads: value });
  };

  const handleAutoResumeChange = (value: boolean) => {
    updateSettings({ autoResumeOnConnection: value });
  };

  const handleMaxFileSizeChange = (value: number) => {
    updateSettings({ maxFileSize: value * 1024 * 1024 }); // Convert MB to bytes
  };

  const handleAllowedFileTypesChange = (value: string) => {
    const types = value.split(",").map((t) => t.trim());
    updateSettings({ allowedFileTypes: types });
  };

  return (
    <Dialog open={visible} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[90%] max-w-md">
        <DialogHeader>
          <DialogTitle>下载设置</DialogTitle>
        </DialogHeader>

        <ScrollView className="max-h-[70vh]">
          <View className="space-y-6 p-2">
            {/* Core Settings */}
            <View className="space-y-4">
              <View className="flex-row items-center space-x-2">
                <FileDown size={20} className="text-primary" />
                <Label className="text-lg font-medium">基本设置</Label>
              </View>

              <View className="space-y-4">
                <Label>最大同时下载数</Label>
                <View className="flex-row items-center space-x-2">
                  <Slider
                    value={settings.maxConcurrentDownloads}
                    onValueChange={handleMaxDownloadsChange}
                    minimumValue={1}
                    maximumValue={5}
                    step={1}
                    className="flex-1"
                  />
                  <Badge variant="secondary">
                    {settings.maxConcurrentDownloads}
                  </Badge>
                </View>
              </View>

              <View className="flex-row justify-between items-center">
                <Label>网络恢复时自动继续下载</Label>
                <Switch
                  checked={settings.autoResumeOnConnection}
                  onCheckedChange={handleAutoResumeChange}
                />
              </View>
            </View>

            {/* File Validation */}
            <View className="space-y-4">
              <View className="flex-row items-center space-x-2">
                <Shield size={20} className="text-primary" />
                <Label className="text-lg font-medium">文件验证</Label>
              </View>

              <View className="space-y-4">
                <Label>最大文件大小 (MB)</Label>
                <View className="flex-row items-center space-x-2">
                  <Slider
                    value={settings.maxFileSize / (1024 * 1024)} // Convert bytes to MB
                    onValueChange={handleMaxFileSizeChange}
                    minimumValue={1}
                    maximumValue={10000}
                    step={100}
                    className="flex-1"
                  />
                  <Badge variant="secondary">
                    {Math.round(settings.maxFileSize / (1024 * 1024))}MB
                  </Badge>
                </View>
              </View>

              <View className="space-y-2">
                <Label>允许的文件类型</Label>
                <Input
                  value={settings.allowedFileTypes.join(", ")}
                  onChangeText={handleAllowedFileTypesChange}
                  placeholder="例如: jpg, png, pdf"
                />
              </View>
            </View>

            {/* Scheduling */}
            <View className="space-y-4">
              <View className="flex-row items-center space-x-2">
                <Clock size={20} className="text-primary" />
                <Label className="text-lg font-medium">下载调度</Label>
              </View>

              <View className="flex-row justify-between items-center">
                <Label>队列优先级排序</Label>
                <Switch
                  checked={settings.notificationsEnabled}
                  onCheckedChange={(value) =>
                    updateSettings({ notificationsEnabled: value })
                  }
                />
              </View>
            </View>

            {/* Organization */}
            <View className="space-y-4">
              <View className="flex-row items-center space-x-2">
                <FolderTree size={20} className="text-primary" />
                <Label className="text-lg font-medium">文件组织</Label>
              </View>

              <View className="space-y-2">
                <Label>下载目录</Label>
                <Input
                  value={settings.downloadLocation}
                  onChangeText={(value) =>
                    updateSettings({ downloadLocation: value })
                  }
                  placeholder="下载文件保存位置"
                />
              </View>
            </View>
          </View>
        </ScrollView>

        <DialogFooter>
          <Button
            variant="secondary"
            onPress={onClose}
            className="w-full sm:w-auto"
          >
            关闭
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
