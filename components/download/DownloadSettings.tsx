// components/DownloadSettings.tsx
import React, { useState } from "react";
import { View, Modal, Text, Switch, TouchableOpacity } from "react-native";
import { downloadManager } from "./download";
import Slider from "@react-native-community/slider";
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
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-white p-4">
        <Text className="text-xl font-bold mb-4">下载设置</Text>

        <View className="mb-4">
          <Text className="text-base mb-2">最大同时下载数</Text>
          <Slider
            value={maxDownloads}
            onValueChange={handleMaxDownloadsChange}
            minimumValue={1}
            maximumValue={5}
            step={1}
            className="w-full"
          />
          <Text className="text-sm text-gray-500">{maxDownloads}</Text>
        </View>

        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-base">网络恢复时自动继续下载</Text>
          <Switch value={autoResume} onValueChange={handleAutoResumeChange} />
        </View>

        <TouchableOpacity
          className="bg-gray-200 p-4 rounded-lg"
          onPress={onClose}
        >
          <Text className="text-center">关闭</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};
