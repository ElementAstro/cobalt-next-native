// components/DownloadSettings.tsx
import React, { useState } from "react";
import { View } from "react-native";
import { downloadManager } from "./download";
import Slider from "@react-native-community/slider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface DownloadSettingsProps {
  visible: boolean;
  onClose: () => void;
}

export const DownloadSettings: React.FC<DownloadSettingsProps> = ({
  visible,
  onClose,
}) => {
  const [maxDownloads, setMaxDownloads] = useState(3);
  const [autoResume, setAutoResume] = useState(true);

  const handleMaxDownloadsChange = (value: number) => {
    setMaxDownloads(value);
    downloadManager.setMaxConcurrentDownloads(value);
  };

  const handleAutoResumeChange = (value: boolean) => {
    setAutoResume(value);
    downloadManager.setAutoResumeOnConnection(value);
  };

  return (
    <Dialog open={visible} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[90%] max-w-md">
        <DialogHeader>
          <DialogTitle>下载设置</DialogTitle>
        </DialogHeader>

        <View className="space-y-6">
          <View className="space-y-4">
            <Label>最大同时下载数</Label>
            <View className="flex-row items-center space-x-2">
              <Slider
                value={maxDownloads}
                onValueChange={handleMaxDownloadsChange}
                minimumValue={1}
                maximumValue={5}
                step={1}
                className="flex-1"
              />
              <Badge variant="secondary">{maxDownloads}</Badge>
            </View>
          </View>

          <View className="flex-row justify-between items-center">
            <Label>网络恢复时自动继续下载</Label>
            <Switch
              checked={autoResume}
              onCheckedChange={handleAutoResumeChange}
            />
          </View>
        </View>

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
